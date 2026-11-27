const crypto = require("crypto")
const jwt = require("jsonwebtoken")
const { Op, literal } = require("sequelize")
const { Usuario, CodigoVerificacao } = require("../models/rel")
const AppError = require("../utils/AppError")
const { enviarEmail } = require("../utils/email")

// Verificação em duas etapas do login de admin:
// 1. login com senha certa -> gera um código de 6 dígitos, manda por e-mail e devolve um "desafio"
// 2. o front manda { desafio, codigo } -> se bater, devolve o token normal de login

const FINALIDADE = "LOGIN_ADMIN"
const VALIDADE_MS = 10 * 60 * 1000 // código e desafio valem 10 minutos
const MAX_TENTATIVAS = 5
const INTERVALO_REENVIO_MS = 60 * 1000
const MAX_CODIGOS_POR_HORA = 5

// O desafio é assinado com um segredo DIFERENTE do token de login (e tem "audience" própria):
// assim ele nunca serve como token para acessar as rotas protegidas.
const AUDIENCIA_DESAFIO = "desafio-login-admin"
const segredoDesafio = () => `${process.env.TOKEN_SECRET}:desafio-2fa`

function gerarDesafio(usuario) {
	return jwt.sign({ codUsuario: usuario.codUsuario, finalidade: FINALIDADE }, segredoDesafio(), {
		expiresIn: VALIDADE_MS / 1000,
		audience: AUDIENCIA_DESAFIO
	})
}

function lerDesafio(desafio) {
	try {
		const dados = jwt.verify(String(desafio || ""), segredoDesafio(), {
			audience: AUDIENCIA_DESAFIO,
			algorithms: ["HS256"]
		})
		if (dados.finalidade !== FINALIDADE) throw new Error("finalidade errada")
		return dados
	} catch {
		throw new AppError("Sua verificação expirou. Entre com e-mail e senha de novo.", 401)
	}
}

// HMAC com o segredo do servidor: quem vir o banco não consegue testar os 1 milhão de códigos
// sem saber o segredo (um hash simples de 6 dígitos seria quebrado na hora)
function hashCodigo(idUsuario, codigo) {
	return crypto.createHmac("sha256", process.env.TOKEN_SECRET).update(`${FINALIDADE}:${idUsuario}:${codigo}`).digest("hex")
}

function codigosIguais(hashA, hashB) {
	const a = Buffer.from(hashA, "hex")
	const b = Buffer.from(hashB, "hex")
	return a.length === b.length && crypto.timingSafeEqual(a, b)
}

// "matheus@gmail.com" -> "ma*****@gmail.com"
function mascararEmail(email) {
	const [nome, dominio] = String(email).split("@")
	const visivel = nome.slice(0, 2)
	return `${visivel}${"*".repeat(Math.max(nome.length - visivel.length, 3))}@${dominio}`
}

function ultimoCodigo(idUsuario) {
	return CodigoVerificacao.findOne({
		where: { idUsuario, finalidade: FINALIDADE },
		order: [["criadoEm", "DESC"], ["codCodigo", "DESC"]]
	})
}

const segundos = (ms) => Math.max(Math.ceil(ms / 1000), 1)

// Gera e envia um código novo. No login, se já existe um código válido enviado há menos de 60 s,
// não manda outro (a pessoa pode ter clicado "Entrar" duas vezes): só devolve quanto falta.
// No reenvio, pedir antes dos 60 s dá erro.
async function enviarCodigo(usuario, { reenvio = false } = {}) {
	const agora = Date.now()
	const ultimo = await ultimoCodigo(usuario.codUsuario)

	if (ultimo) {
		const espera = INTERVALO_REENVIO_MS - (agora - new Date(ultimo.criadoEm).getTime())
		const aindaValido = !ultimo.usadoEm && new Date(ultimo.expiraEm).getTime() > agora && ultimo.tentativas < MAX_TENTATIVAS
		if (espera > 0) {
			if (!reenvio && aindaValido) return { reenviarEm: segundos(espera) }
			throw new AppError(`Aguarde ${segundos(espera)} segundo(s) para pedir outro código`, 429)
		}
	}

	const naUltimaHora = await CodigoVerificacao.count({
		where: { idUsuario: usuario.codUsuario, finalidade: FINALIDADE, criadoEm: { [Op.gt]: new Date(agora - 60 * 60 * 1000) } }
	})
	if (naUltimaHora >= MAX_CODIGOS_POR_HORA) {
		throw new AppError("Limite de códigos por hora atingido. Tente de novo mais tarde.", 429)
	}

	// randomInt usa o gerador criptográfico (Math.random seria previsível)
	const codigo = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0")

	// só o código mais novo vale
	await CodigoVerificacao.update(
		{ usadoEm: new Date(agora) },
		{ where: { idUsuario: usuario.codUsuario, finalidade: FINALIDADE, usadoEm: null } }
	)
	const registro = await CodigoVerificacao.create({
		idUsuario: usuario.codUsuario,
		finalidade: FINALIDADE,
		codigoHash: hashCodigo(usuario.codUsuario, codigo),
		expiraEm: new Date(agora + VALIDADE_MS),
		criadoEm: new Date(agora)
	})

	try {
		await enviarEmail({
			para: usuario.email,
			assunto: `Seu código de acesso: ${codigo}`,
			texto:
				`Olá, ${usuario.nome}.\n\n` +
				`Seu código para entrar no painel de administrador é: ${codigo}\n\n` +
				`Ele vale por 10 minutos. Se não foi você que tentou entrar, troque sua senha.`,
			html:
				`<p>Olá, ${escaparHtml(usuario.nome)}.</p>` +
				`<p>Seu código para entrar no painel de administrador é:</p>` +
				`<p style="font-size:28px;font-weight:bold;letter-spacing:6px">${codigo}</p>` +
				`<p>Ele vale por 10 minutos. Se não foi você que tentou entrar, troque sua senha.</p>`
		})
	} catch (err) {
		console.error("Erro ao enviar o código por e-mail:", err.message)
		await registro.destroy() // não deixa valendo um código que ninguém recebeu
		throw new AppError("Não foi possível enviar o código por e-mail. Tente de novo em instantes.", 503)
	}

	return { reenviarEm: INTERVALO_REENVIO_MS / 1000 }
}

function escaparHtml(texto) {
	return String(texto).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c])
}

// chamado pelo login quando a senha está certa e o usuário é admin
async function iniciarVerificacao(usuario) {
	const { reenviarEm } = await enviarCodigo(usuario)
	return {
		precisaCodigo: true,
		desafio: gerarDesafio(usuario),
		email: mascararEmail(usuario.email),
		reenviarEm
	}
}

async function reenviarCodigo({ desafio } = {}) {
	const { codUsuario } = lerDesafio(desafio)
	const usuario = await Usuario.findByPk(codUsuario)
	if (!usuario || usuario.tipo !== "admin") throw new AppError("Sua verificação expirou. Entre de novo.", 401)

	const { reenviarEm } = await enviarCodigo(usuario, { reenvio: true })
	// desafio novo: os 10 minutos recomeçam junto com o código novo
	return { desafio: gerarDesafio(usuario), email: mascararEmail(usuario.email), reenviarEm }
}

// devolve o usuário se o código estiver certo (o auth.service gera o token)
async function confirmarCodigo({ desafio, codigo } = {}) {
	const { codUsuario } = lerDesafio(desafio)

	const digitado = String(codigo ?? "").trim()
	if (!/^\d{6}$/.test(digitado)) throw new AppError("Digite os 6 números do código")

	const atual = await CodigoVerificacao.findOne({
		where: { idUsuario: codUsuario, finalidade: FINALIDADE, usadoEm: null },
		order: [["criadoEm", "DESC"], ["codCodigo", "DESC"]]
	})
	if (!atual || new Date(atual.expiraEm).getTime() <= Date.now()) {
		throw new AppError("Esse código expirou. Peça um novo.", 400)
	}

	// Conta a tentativa ANTES de comparar, numa operação só no banco. Se a contagem fosse depois,
	// várias requisições ao mesmo tempo leriam "0 tentativas" e passariam do limite.
	const [contou] = await CodigoVerificacao.update(
		{ tentativas: literal("tentativas + 1") },
		{
			where: {
				codCodigo: atual.codCodigo,
				usadoEm: null,
				tentativas: { [Op.lt]: MAX_TENTATIVAS },
				expiraEm: { [Op.gt]: new Date() }
			}
		}
	)
	if (!contou) throw new AppError("Muitas tentativas erradas. Peça um novo código.", 429)

	if (!codigosIguais(hashCodigo(codUsuario, digitado), atual.codigoHash)) {
		const restantes = MAX_TENTATIVAS - (atual.tentativas + 1)
		if (restantes <= 0) throw new AppError("Muitas tentativas erradas. Peça um novo código.", 429)
		throw new AppError(`Código incorreto. Você tem mais ${restantes} tentativa(s).`, 400)
	}

	// marca como usado só se ninguém usou antes (dois envios ao mesmo tempo: só um entra)
	const [marcou] = await CodigoVerificacao.update(
		{ usadoEm: new Date() },
		{ where: { codCodigo: atual.codCodigo, usadoEm: null } }
	)
	if (!marcou) throw new AppError("Esse código já foi usado. Entre de novo.", 400)

	const usuario = await Usuario.findByPk(codUsuario)
	if (!usuario || usuario.tipo !== "admin") throw new AppError("Sua verificação expirou. Entre de novo.", 401)
	return usuario
}

module.exports = {
	iniciarVerificacao,
	reenviarCodigo,
	confirmarCodigo,
	// usados nos testes/ajustes
	MAX_TENTATIVAS,
	INTERVALO_REENVIO_MS,
	MAX_CODIGOS_POR_HORA
}
