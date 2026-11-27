const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { literal } = require("sequelize")
const { Usuario } = require("../models/rel")
const AppError = require("../utils/AppError")
const verificacao = require("./verificacao.service")
const { enviarEmail } = require("../utils/email")

const EXPIRA_EM = process.env.JWT_EXPIRES_IN || "1d"
// sessão de admin dura menos: se o token vazar, vale por pouco tempo
const EXPIRA_EM_ADMIN = process.env.JWT_ADMIN_EXPIRES_IN || "2h"

// bloqueio por CONTA (o rate limit das rotas é por IP; com vários IPs dava para continuar tentando)
const MAX_FALHAS_ADMIN = 5
const BLOQUEIO_MS = 15 * 60 * 1000

// O payload do token só leva o necessário. Nunca coloque a senha aqui:
// o conteúdo do JWT pode ser lido por qualquer pessoa (só a assinatura é protegida).
function gerarToken(usuario) {
	return jwt.sign(
		{ codUsuario: usuario.codUsuario, tipo: usuario.tipo },
		process.env.TOKEN_SECRET,
		{ expiresIn: usuario.tipo === "admin" ? EXPIRA_EM_ADMIN : EXPIRA_EM }
	)
}

function verificarToken(token) {
	return jwt.verify(token, process.env.TOKEN_SECRET, { algorithms: ["HS256"] })
}

function respostaDeLogin(usuario) {
	return {
		token: gerarToken(usuario),
		usuario: {
			codUsuario: usuario.codUsuario,
			nome: usuario.nome,
			email: usuario.email,
			tipo: usuario.tipo
		}
	}
}

const minutosRestantes = (ate) => Math.max(Math.ceil((new Date(ate).getTime() - Date.now()) / 60000), 1)

// senha errada numa conta de admin: soma 1; na 5ª, bloqueia por 15 minutos
async function registrarFalhaAdmin(usuario) {
	await Usuario.update({ falhasLogin: literal("falhasLogin + 1") }, { where: { codUsuario: usuario.codUsuario } })
	await usuario.reload({ attributes: ["codUsuario", "falhasLogin", "email", "nome"] })

	if (usuario.falhasLogin >= MAX_FALHAS_ADMIN) {
		const ate = new Date(Date.now() + BLOQUEIO_MS)
		await Usuario.update({ falhasLogin: 0, bloqueadoAte: ate }, { where: { codUsuario: usuario.codUsuario } })

		// avisa o dono da conta (se o e-mail falhar, o bloqueio continua valendo)
		enviarEmail({
			para: usuario.email,
			assunto: "Sua conta de administrador foi bloqueada por 15 minutos",
			texto:
				`Olá, ${usuario.nome}.\n\n` +
				`Houve ${MAX_FALHAS_ADMIN} tentativas seguidas de entrar na sua conta de administrador com a senha errada, ` +
				`então ela ficou bloqueada por 15 minutos.\n\n` +
				`Se não foi você, troque sua senha assim que o bloqueio acabar.`
		}).catch((err) => console.error("Erro ao enviar aviso de bloqueio:", err.message))

		throw new AppError(`Conta bloqueada por ${minutosRestantes(ate)} minuto(s) depois de várias senhas erradas.`, 429)
	}
}

// Usuário comum: devolve { token, usuario } direto.
// Admin: senha certa não basta. Devolve { precisaCodigo: true, desafio, email, reenviarEm }
// e manda um código por e-mail; o token só sai em verificarCodigo.
async function login({ email, senha }) {
	if (!email || !senha) {
		throw new AppError("Informe e-mail e senha")
	}

	const usuario = await Usuario.findOne({
		where: { email: String(email).trim().toLowerCase() }
	})

	// conta de admin bloqueada: recusa sem nem conferir a senha
	// (conferir e responder diferente diria a um atacante quando ele acertou)
	if (usuario?.tipo === "admin" && usuario.bloqueadoAte && new Date(usuario.bloqueadoAte) > new Date()) {
		throw new AppError(`Conta bloqueada por ${minutosRestantes(usuario.bloqueadoAte)} minuto(s) depois de várias senhas erradas.`, 429)
	}

	// Mesma mensagem nos dois casos, para não revelar quais e-mails existem
	const senhaOk = usuario && (await bcrypt.compare(String(senha), usuario.senha))
	if (!senhaOk) {
		if (usuario?.tipo === "admin") await registrarFalhaAdmin(usuario)
		throw new AppError("E-mail ou senha inválidos", 401)
	}

	if (usuario.tipo === "admin") {
		if (usuario.falhasLogin || usuario.bloqueadoAte) {
			await Usuario.update({ falhasLogin: 0, bloqueadoAte: null }, { where: { codUsuario: usuario.codUsuario } })
		}
		return verificacao.iniciarVerificacao(usuario)
	}

	return respostaDeLogin(usuario)
}

// Aviso por e-mail a cada entrada no painel: se não foi o admin, ele fica sabendo na hora.
// Não atrasa nem impede o login se o e-mail falhar.
function avisarNovoAcesso(usuario, { ip, navegador } = {}) {
	const quando = new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })
	enviarEmail({
		para: usuario.email,
		assunto: "Novo acesso ao painel de administrador",
		texto:
			`Olá, ${usuario.nome}.\n\n` +
			`Sua conta de administrador acabou de entrar no painel.\n\n` +
			`Quando: ${quando} (horário de Brasília)\n` +
			`IP: ${ip || "desconhecido"}\n` +
			`Navegador: ${navegador || "desconhecido"}\n\n` +
			`Se não foi você, troque sua senha agora.`
	}).catch((err) => console.error("Erro ao enviar aviso de novo acesso:", err.message))
}

async function verificarCodigo(body, contexto) {
	const usuario = await verificacao.confirmarCodigo(body)
	avisarNovoAcesso(usuario, contexto)
	return respostaDeLogin(usuario)
}

async function reenviarCodigo(body) {
	return verificacao.reenviarCodigo(body)
}

module.exports = {
	login,
	verificarCodigo,
	reenviarCodigo,
	gerarToken,
	verificarToken
}
