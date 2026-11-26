const enderecoService = require("../services/endereco.service")
const tratarErro = require("../utils/tratarErro")

// O endereço é sempre do usuário do token (req.usuario), nunca de um id vindo do body.

async function listar(req, res) {
	try {
		res.status(200).json(await enderecoService.listar(req.usuario.codUsuario))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function buscarPorId(req, res) {
	try {
		res.status(200).json(await enderecoService.buscarPorId(req.usuario.codUsuario, req.params.id))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function cadastrar(req, res) {
	try {
		res.status(201).json(await enderecoService.cadastrar(req.usuario.codUsuario, req.body))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function atualizar(req, res) {
	try {
		res.status(200).json(await enderecoService.atualizar(req.usuario.codUsuario, req.params.id, req.body))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function definirPrincipal(req, res) {
	try {
		res.status(200).json(await enderecoService.definirPrincipal(req.usuario.codUsuario, req.params.id))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function excluir(req, res) {
	try {
		await enderecoService.excluir(req.usuario.codUsuario, req.params.id)
		res.status(204).send()
	} catch (err) {
		tratarErro(res, err)
	}
}

module.exports = {
	listar,
	buscarPorId,
	cadastrar,
	atualizar,
	definirPrincipal,
	excluir
}
