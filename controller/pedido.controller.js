const pedidoService = require("../services/pedido.service")
const tratarErro = require("../utils/tratarErro")

//  finaliza a compra com os itens do carrinho. Body opcional: { "codigo_cupom": "NATAL10" }
async function finalizar(req, res) {
	try {
		const pedido = await pedidoService.finalizar(req.usuario.codUsuario, req.body)
		res.status(201).json(pedido)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function meusPedidos(req, res) {
	try {
		res.status(200).json(await pedidoService.listarDoUsuario(req.usuario.codUsuario))
	} catch (err) {
		tratarErro(res, err)
	}
}

// 👤 dono do pedido ou 🔒 admin
async function buscarPorId(req, res) {
	try {
		res.status(200).json(await pedidoService.buscarPorId(req.params.id, req.usuario))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function listarTodos(req, res) {
	try {
		res.status(200).json(await pedidoService.listarTodos(req.query))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function atualizarStatus(req, res) {
	try {
		res.status(200).json(await pedidoService.atualizarStatus(req.params.id, req.body))
	} catch (err) {
		tratarErro(res, err)
	}
}

async function cancelar(req, res) {
	try {
		res.status(200).json(await pedidoService.cancelarPeloUsuario(req.usuario.codUsuario, req.params.id))
	} catch (err) {
		tratarErro(res, err)
	}
}

module.exports = {
	finalizar,
	meusPedidos,
	buscarPorId,
	listarTodos,
	atualizarStatus,
	cancelar
}
