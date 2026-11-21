const categoriaService = require("../services/categoria.service")
const tratarErro = require("../utils/tratarErro")

async function listar(req, res) {
	try {
		const categorias = await categoriaService.listar()
		res.status(200).json(categorias)
	} catch (err) {
		tratarErro(res, err)
	}
}

// GET /categorias/:id?produtos=true  → traz também os produtos da categoria
async function buscarPorId(req, res) {
	try {
		const comProdutos = req.query.produtos === "true"
		const categoria = await categoriaService.buscarPorId(req.params.id, { comProdutos })
		res.status(200).json(categoria)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function cadastrar(req, res) {
	try {
		const categoria = await categoriaService.cadastrar(req.body)
		res.status(201).json(categoria)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function atualizar(req, res) {
	try {
		const categoria = await categoriaService.atualizar(req.params.id, req.body)
		res.status(200).json(categoria)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function excluir(req, res) {
	try {
		await categoriaService.excluir(req.params.id)
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
	excluir
}
