const favoritoService = require("../services/favorito.service")
const tratarErro = require("../utils/tratarErro")

// Todas as rotas usam o usuário do token (req.usuario), nunca um id vindo do body.
// Assim ninguém mexe nos favoritos de outra pessoa.

async function listar(req, res) {
	try {
		const favoritos = await favoritoService.listar(req.usuario.codUsuario)
		res.status(200).json(favoritos)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function verificar(req, res) {
	try {
		const favoritado = await favoritoService.estaFavoritado(req.usuario.codUsuario, req.params.idProduto)
		res.status(200).json({ favoritado })
	} catch (err) {
		tratarErro(res, err)
	}
}

async function adicionar(req, res) {
	try {
		const favorito = await favoritoService.adicionar(req.usuario.codUsuario, req.body.idProduto)
		res.status(201).json(favorito)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function remover(req, res) {
	try {
		await favoritoService.remover(req.usuario.codUsuario, req.params.idProduto)
		res.status(204).send()
	} catch (err) {
		tratarErro(res, err)
	}
}

module.exports = {
	listar,
	verificar,
	adicionar,
	remover
}
