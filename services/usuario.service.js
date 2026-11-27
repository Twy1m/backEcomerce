const bcrypt = require("bcrypt")
const { Op } = require("sequelize")
const { Usuario } = require("../models/rel")
const AppError = require("../utils/AppError")
const validarCpf = require("../utils/validarCpf")

const SALT_ROUNDS = 10
// campos internos que nunca saem nas respostas
const CAMPOS_PRIVADOS = ["senha", "falhasLogin", "bloqueadoAte"]
const SEM_SENHA = { exclude: CAMPOS_PRIVADOS }

// Converte o model em objeto e tira a senha (e os campos de bloqueio) antes de devolver
function semSenha(usuario) {
	const dados = usuario.toJSON()
	CAMPOS_PRIVADOS.forEach((campo) => delete dados[campo])
	return dados
}

function normalizarEmail(email) {
	return String(email || "").trim().toLowerCase()
}

function validarSenha(senha) {
	if (!senha || String(senha).length < 6) {
		throw new AppError("A senha precisa ter pelo menos 6 caracteres")
	}
}

async function cadastrar({ nome, email, senha, cpf }) {
	if (!nome || !email || !senha || !cpf) {
		throw new AppError("Preencha nome, e-mail, senha e CPF")
	}

	validarSenha(senha)

	const emailNormalizado = normalizarEmail(email)
	const cpfLimpo = validarCpf(cpf)
	if (!cpfLimpo) {
		throw new AppError("CPF inválido")
	}

	const existente = await Usuario.findOne({
		where: { [Op.or]: [{ email: emailNormalizado }, { cpf: cpfLimpo }] }
	})
	if (existente) {
		const campo = existente.email === emailNormalizado ? "E-mail" : "CPF"
		throw new AppError(`${campo} já cadastrado`, 409)
	}

	const senhaHash = await bcrypt.hash(String(senha), SALT_ROUNDS)

	const usuario = await Usuario.create({
		nome: String(nome).trim(),
		email: emailNormalizado,
		senha: senhaHash,
		cpf: cpfLimpo,
		tipo: "user" // cadastro público nunca cria admin
	})

	return semSenha(usuario)
}

async function listar() {
	return Usuario.findAll({ attributes: SEM_SENHA })
}

async function buscarPorId(id) {
	const usuario = await Usuario.findByPk(id, { attributes: SEM_SENHA })
	if (!usuario) {
		throw new AppError("Usuário não encontrado", 404)
	}
	return usuario
}

// Só nome, e-mail e senha podem ser alterados. O tipo (admin/user) fica de fora de propósito.
// Trocar e-mail ou senha exige a senha atual: assim, quem pegar um token (ex.: computador
// compartilhado) não consegue tomar a conta. Para mudar só o nome, não precisa.
async function atualizar(id, { nome, email, senha, senhaAtual }) {
	const usuario = await Usuario.findByPk(id)
	if (!usuario) {
		throw new AppError("Usuário não encontrado", 404)
	}

	const trocaEmail = email !== undefined && normalizarEmail(email) !== usuario.email
	const trocaSenha = senha !== undefined
	if (trocaEmail || trocaSenha) {
		if (!senhaAtual) {
			throw new AppError("Informe sua senha atual para trocar o e-mail ou a senha")
		}
		const confere = await bcrypt.compare(String(senhaAtual), usuario.senha)
		if (!confere) {
			throw new AppError("Senha atual incorreta", 403)
		}
	}

	if (nome !== undefined) {
		if (!String(nome).trim()) throw new AppError("O nome não pode ficar vazio")
		usuario.nome = String(nome).trim()
	}

	if (email !== undefined) {
		const emailNormalizado = normalizarEmail(email)
		if (!emailNormalizado) throw new AppError("O e-mail não pode ficar vazio")

		if (emailNormalizado !== usuario.email) {
			const emUso = await Usuario.findOne({ where: { email: emailNormalizado } })
			if (emUso) throw new AppError("E-mail já cadastrado", 409)
			usuario.email = emailNormalizado
		}
	}

	if (senha !== undefined) {
		validarSenha(senha)
		usuario.senha = await bcrypt.hash(String(senha), SALT_ROUNDS)
	}

	await usuario.save()
	return semSenha(usuario)
}

async function excluir(id) {
	const usuario = await Usuario.findByPk(id)
	if (!usuario) {
		throw new AppError("Usuário não encontrado", 404)
	}

	// Carrinho e favoritos são apagados junto (CASCADE no banco).
	// Pedidos não: o banco recusa (RESTRICT), para não perder o histórico de vendas.
	try {
		await usuario.destroy()
	} catch (err) {
		if (err.name === "SequelizeForeignKeyConstraintError") {
			throw new AppError("Não é possível excluir: o usuário tem pedidos registrados", 409)
		}
		throw err
	}
}

module.exports = {
	cadastrar,
	listar,
	buscarPorId,
	atualizar,
	excluir
}
