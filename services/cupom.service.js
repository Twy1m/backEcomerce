const { Cupom } = require("../models/rel")
const AppError = require("../utils/AppError")
const { paraCentavos, paraReais } = require("../utils/dinheiro")
const carrinhoService = require("./carrinho.service")

// Regras do cupom neste projeto:
// • desconto é PERCENTUAL: 10 = 10% de desconto (de 0,01 a 100)
// • usos = quantos usos ainda restam. Cada pedido com o cupom desconta 1;
//   se o pedido for cancelado, o uso volta. Com 0, o cupom deixa de valer.
// • o cupom não tem relacionamento: o pedido guarda só o código e o valor descontado.

function formatar(cupom) {
	const dados = cupom.toJSON ? cupom.toJSON() : cupom
	return { ...dados, desconto: Number(dados.desconto) }
}

// Códigos ficam sempre em maiúsculas: "natal10" e "NATAL10" são o mesmo cupom
function normalizarCodigo(codigo) {
	const texto = String(codigo ?? "").trim().toUpperCase()
	if (!/^[A-Z0-9_-]{3,50}$/.test(texto)) {
		throw new AppError("O código precisa ter de 3 a 50 caracteres, só letras, números, - ou _")
	}
	return texto
}

// "2026-12-31" vale até o fim desse dia (23:59:59), e não até a meia-noite do começo dele
function paraData(valor) {
	const texto = String(valor ?? "").trim()
	const data = /^\d{4}-\d{2}-\d{2}$/.test(texto) ? new Date(`${texto}T23:59:59`) : new Date(texto)
	if (!texto || Number.isNaN(data.getTime())) {
		throw new AppError("validade precisa ser uma data, ex.: 2026-12-31")
	}
	return data
}

function paraPercentual(valor) {
	const numero = Number(valor)
	if (valor === "" || valor === null || Number.isNaN(numero) || numero <= 0 || numero > 100) {
		throw new AppError("O desconto precisa ser um percentual entre 0,01 e 100")
	}
	return Math.round(numero * 100) / 100
}

function paraUsos(valor) {
	const numero = Number(valor)
	if (!Number.isInteger(numero) || numero < 0) {
		throw new AppError("usos precisa ser um número inteiro, zero ou maior")
	}
	return numero
}

function paraBooleano(valor) {
	if (valor === true || valor === "true") return true
	if (valor === false || valor === "false") return false
	throw new AppError("ativo precisa ser true ou false")
}

async function garantirCodigoLivre(codigo, idIgnorado = null) {
	const existente = await Cupom.findOne({ where: { codigo } })
	if (existente && existente.codCupom !== Number(idIgnorado)) {
		throw new AppError("Já existe um cupom com esse código", 409)
	}
}

// ---------- uso do cupom (carrinho e checkout) ----------

// Confere se o cupom pode ser usado agora. Com "lock", trava a linha até o fim da transação
// (o checkout usa isso para dois pedidos não gastarem o último uso ao mesmo tempo).
async function buscarValido(codigo, { transaction, lock = false } = {}) {
	const cupom = await Cupom.findOne({
		where: { codigo: String(codigo ?? "").trim().toUpperCase() },
		transaction,
		lock: lock && transaction ? transaction.LOCK.UPDATE : undefined
	})

	if (!cupom) throw new AppError("Cupom não encontrado", 404)
	if (!cupom.ativo) throw new AppError("Esse cupom não está ativo")
	if (new Date(cupom.validade) < new Date()) throw new AppError("Esse cupom expirou")
	if (cupom.usos <= 0) throw new AppError("Esse cupom já foi totalmente usado")

	return cupom
}

// Desconto em centavos, arredondado (nunca maior que o subtotal)
function calcularDescontoCentavos(subtotalCentavos, percentual) {
	return Math.min(subtotalCentavos, Math.round((subtotalCentavos * Number(percentual)) / 100))
}

// POST /cupons/validar: mostra no carrinho quanto o cupom vai descontar (não gasta o cupom)
async function validar(idUsuario, { codigo }) {
	if (!codigo) throw new AppError("Informe o código do cupom")

	const cupom = await buscarValido(codigo)
	const carrinho = await carrinhoService.ver(idUsuario)

	const subtotal = paraCentavos(carrinho.subtotal)
	const desconto = calcularDescontoCentavos(subtotal, cupom.desconto)

	return {
		codigo: cupom.codigo,
		percentual: Number(cupom.desconto),
		subtotal: paraReais(subtotal),
		desconto: paraReais(desconto),
		total: paraReais(subtotal - desconto)
	}
}

// ---------- CRUD (admin) ----------

async function listar() {
	const cupons = await Cupom.findAll({ order: [["codCupom", "DESC"]] })
	return cupons.map(formatar)
}

async function buscarPorId(id) {
	const cupom = await Cupom.findByPk(id)
	if (!cupom) throw new AppError("Cupom não encontrado", 404)
	return cupom
}

async function cadastrar({ codigo, desconto, validade, usos, ativo }) {
	if (codigo === undefined || desconto === undefined || validade === undefined || usos === undefined) {
		throw new AppError("Preencha codigo, desconto, validade e usos")
	}

	const dados = {
		codigo: normalizarCodigo(codigo),
		desconto: paraPercentual(desconto),
		validade: paraData(validade),
		usos: paraUsos(usos)
	}
	if (ativo !== undefined) dados.ativo = paraBooleano(ativo)

	await garantirCodigoLivre(dados.codigo)
	return formatar(await Cupom.create(dados))
}

async function atualizar(id, { codigo, desconto, validade, usos, ativo }) {
	const cupom = await buscarPorId(id)
	const dados = {}

	if (codigo !== undefined) {
		dados.codigo = normalizarCodigo(codigo)
		await garantirCodigoLivre(dados.codigo, id)
	}
	if (desconto !== undefined) dados.desconto = paraPercentual(desconto)
	if (validade !== undefined) dados.validade = paraData(validade)
	if (usos !== undefined) dados.usos = paraUsos(usos)
	if (ativo !== undefined) dados.ativo = paraBooleano(ativo)

	if (Object.keys(dados).length === 0) {
		throw new AppError("Envie pelo menos um campo para atualizar")
	}

	await cupom.update(dados)
	return formatar(cupom)
}

// Pode apagar sem medo: os pedidos guardam o código e o valor descontado como texto/número
async function excluir(id) {
	const cupom = await buscarPorId(id)
	await cupom.destroy()
}

module.exports = {
	buscarValido,
	calcularDescontoCentavos,
	validar,
	listar,
	buscarPorId: async (id) => formatar(await buscarPorId(id)),
	cadastrar,
	atualizar,
	excluir
}
