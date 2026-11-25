const cupomService = require("../services/cupom.service")
const tratarErro = require("../utils/tratarErro")

//  mostra quanto o cupom desconta no carrinho atual (não gasta o cupom)
async function validar(req, res) {
	try {
		const resultado = await cupomService.validar(req.usuario.codUsuario, req.body)
		res.status(200).json(resultado)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function listar(req, res) {
	try {
		res.status(200).json(await cupomService.listar())
	} catch (err) {
		tratarErro(res, err)
	}
}

async function buscarPorId(req, res) {
	try {
		res.status(200).json(await cupomService.buscarPorId(req.params.id))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function cadastrar(req, res) {
	try {
		res.status(201).json(await cupomService.cadastrar(req.body))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function atualizar(req, res) {
	try {
		res.status(200).json(await cupomService.atualizar(req.params.id, req.body))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function excluir(req, res) {
	try {
		await cupomService.excluir(req.params.id)
		res.status(204).send()
	} catch (err) {
		tratarErro(res, err)
	}
}

module.exports = {
	validar,
	listar,
	buscarPorId,
	cadastrar,
	atualizar,
	excluir
}
