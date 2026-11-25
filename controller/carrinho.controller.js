const carrinhoService = require("../services/carrinho.service")
const tratarErro = require("../utils/tratarErro")

// Todas as respostas (menos esvaziar) devolvem o carrinho atualizado,
// assim o front só precisa redesenhar a sidebar com o que voltou.

async function ver(req, res) {
	try {
		const carrinho = await carrinhoService.ver(req.usuario.codUsuario)
		res.status(200).json(carrinho)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function adicionarItem(req, res) {
	try {
		const carrinho = await carrinhoService.adicionarItem(req.usuario.codUsuario, req.body)
		res.status(201).json(carrinho)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function alterarQuantidade(req, res) {
	try {
		const carrinho = await carrinhoService.alterarQuantidade(req.usuario.codUsuario, req.params.id, req.body)
		res.status(200).json(carrinho)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function removerItem(req, res) {
	try {
		const carrinho = await carrinhoService.removerItem(req.usuario.codUsuario, req.params.id)
		res.status(200).json(carrinho)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function esvaziar(req, res) {
	try {
		await carrinhoService.esvaziar(req.usuario.codUsuario)
		res.status(204).send()
	} catch (err) {
		tratarErro(res, err)
	}
}

module.exports = {
	ver,
	adicionarItem,
	alterarQuantidade,
	removerItem,
	esvaziar
}
