const usuarioService = require("../services/usuario.service")
const tratarErro = require("../utils/tratarErro")

// O controller só recebe a requisição, chama o service e devolve a resposta.
// As regras (validação, bcrypt, e-mail único...) ficam no service.

async function cadastrar(req, res) {
	try {
		const usuario = await usuarioService.cadastrar(req.body)
		res.status(201).json(usuario)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function listar(req, res) {
	try {
		const usuarios = await usuarioService.listar()
		res.status(200).json(usuarios)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function buscarPorId(req, res) {
	try {
		const usuario = await usuarioService.buscarPorId(req.params.id)
		res.status(200).json(usuario)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function meuPerfil(req, res) {
	try {
		const usuario = await usuarioService.buscarPorId(req.usuario.codUsuario)
		res.status(200).json(usuario)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function atualizarMeuPerfil(req, res) {
	try {
		const usuario = await usuarioService.atualizar(req.usuario.codUsuario, req.body)
		res.status(200).json(usuario)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function excluir(req, res) {
	try {
		await usuarioService.excluir(req.params.id)
		res.status(204).send()
	} catch (err) {
		tratarErro(res, err)
	}
}

module.exports = {
	cadastrar,
	listar,
	buscarPorId,
	meuPerfil,
	atualizarMeuPerfil,
	excluir
}
