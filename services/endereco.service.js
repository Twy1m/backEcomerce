const conn = require("../db/conn")
const { Endereco } = require("../models/rel")
const AppError = require("../utils/AppError")

const MAX_ENDERECOS = 10

const ESTADOS = [
	"AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
	"PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"
]

// campo de texto: tira espaços e confere tamanho. Vazio vira null nos opcionais.
function texto(valor, campo, max, { obrigatorio = true } = {}) {
	const limpo = valor === undefined || valor === null ? "" : String(valor).trim()
	if (!limpo) {
		if (obrigatorio) throw new AppError(`Informe ${campo}`)
		return null
	}
	if (limpo.length > max) {
		throw new AppError(`${campo[0].toUpperCase() + campo.slice(1)} pode ter no máximo ${max} caracteres`)
	}
	return limpo
}

function validarCep(cep) {
	const numeros = String(cep ?? "").replace(/\D/g, "")
	if (numeros.length !== 8) throw new AppError("CEP inválido")
	return numeros
}

function validarEstado(estado) {
	const sigla = String(estado ?? "").trim().toUpperCase()
	if (!ESTADOS.includes(sigla)) throw new AppError("Estado inválido (use a sigla, ex.: SP)")
	return sigla
}

// Monta os campos a partir do body. No cadastro todos os obrigatórios precisam vir;
// na edição só o que veio é validado e alterado.
function lerCampos(body = {}, { parcial = false } = {}) {
	const campos = {}
	const veio = (nome) => !parcial || body[nome] !== undefined

	if (veio("apelido")) campos.apelido = texto(body.apelido, "o apelido", 50, { obrigatorio: false })
	if (veio("cep")) campos.cep = validarCep(body.cep)
	if (veio("logradouro")) campos.logradouro = texto(body.logradouro, "a rua", 150)
	if (veio("numero")) campos.numero = texto(body.numero, "o número", 20)
	if (veio("complemento")) campos.complemento = texto(body.complemento, "o complemento", 100, { obrigatorio: false })
	if (veio("bairro")) campos.bairro = texto(body.bairro, "o bairro", 100)
	if (veio("cidade")) campos.cidade = texto(body.cidade, "a cidade", 100)
	if (veio("estado")) campos.estado = validarEstado(body.estado)

	return campos
}

function paraId(valor) {
	const id = Number(valor)
	if (!Number.isInteger(id) || id <= 0) throw new AppError("id do endereço inválido")
	return id
}

// Busca garantindo que o endereço é de quem pediu (de outra pessoa responde 404)
async function buscarDoUsuario(idUsuario, idEndereco, transaction) {
	const endereco = await Endereco.findOne({
		where: { codEndereco: paraId(idEndereco), idUsuario },
		transaction,
		lock: transaction ? transaction.LOCK.UPDATE : undefined
	})
	if (!endereco) throw new AppError("Endereço não encontrado", 404)
	return endereco
}

// tira o "principal" dos outros endereços do usuário
function desmarcarOutros(idUsuario, transaction) {
	return Endereco.update({ principal: false }, { where: { idUsuario, principal: true }, transaction })
}

// principal primeiro, depois do mais antigo para o mais novo
async function listar(idUsuario) {
	return Endereco.findAll({
		where: { idUsuario },
		order: [["principal", "DESC"], ["codEndereco", "ASC"]]
	})
}

async function buscarPorId(idUsuario, idEndereco) {
	return buscarDoUsuario(idUsuario, idEndereco)
}

async function cadastrar(idUsuario, body) {
	const campos = lerCampos(body)

	return conn.transaction(async (t) => {
		const total = await Endereco.count({ where: { idUsuario }, transaction: t })
		if (total >= MAX_ENDERECOS) {
			throw new AppError(`Você pode ter no máximo ${MAX_ENDERECOS} endereços`, 409)
		}

		// o primeiro endereço já nasce principal; os outros só se o usuário pedir
		const principal = total === 0 || body?.principal === true
		if (principal) await desmarcarOutros(idUsuario, t)

		return Endereco.create({ ...campos, idUsuario, principal }, { transaction: t })
	})
}

async function atualizar(idUsuario, idEndereco, body) {
	const campos = lerCampos(body, { parcial: true })

	return conn.transaction(async (t) => {
		const endereco = await buscarDoUsuario(idUsuario, idEndereco, t)

		// virar principal pode; deixar de ser principal não (sempre tem que ter um)
		if (body?.principal === true && !endereco.principal) {
			await desmarcarOutros(idUsuario, t)
			campos.principal = true
		}

		await endereco.update(campos, { transaction: t })
		return endereco
	})
}

async function definirPrincipal(idUsuario, idEndereco) {
	return atualizar(idUsuario, idEndereco, { principal: true })
}

async function excluir(idUsuario, idEndereco) {
	await conn.transaction(async (t) => {
		const endereco = await buscarDoUsuario(idUsuario, idEndereco, t)
		const eraPrincipal = endereco.principal
		await endereco.destroy({ transaction: t })

		// apagou o principal: o mais antigo que sobrou assume
		if (eraPrincipal) {
			const proximo = await Endereco.findOne({
				where: { idUsuario },
				order: [["codEndereco", "ASC"]],
				transaction: t
			})
			if (proximo) await proximo.update({ principal: true }, { transaction: t })
		}
	})
}

module.exports = {
	listar,
	buscarPorId,
	cadastrar,
	atualizar,
	definirPrincipal,
	excluir
}
