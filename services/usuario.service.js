const bcrypt = require("bcrypt")
const { Op } = require("sequelize")
const { Usuario } = require("../models/rel")
const AppError = require("../utils/AppError")
const validarCpf = require("../utils/validarCpf")

const SALT_ROUNDS = 10
const SEM_SENHA = { exclude: ["senha"] }

// Converte o model em objeto e tira a senha antes de devolver
function semSenha(usuario) {
	const dados = usuario.toJSON()
	delete dados.senha
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
async function atualizar(id, { nome, email, senha }) {
	const usuario = await Usuario.findByPk(id)
	if (!usuario) {
		throw new AppError("Usuário não encontrado", 404)
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

	try {
		await usuario.destroy()
	} catch (err) {
		// O banco impede apagar um usuário que tem pedidos, carrinho ou favoritos
		if (err.name === "SequelizeForeignKeyConstraintError") {
			throw new AppError("Não é possível excluir: o usuário tem pedidos, carrinho ou favoritos", 409)
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
