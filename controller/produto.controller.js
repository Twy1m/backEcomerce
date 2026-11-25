const produtoService = require("../services/produto.service")
const tratarErro = require("../utils/tratarErro")

const ehAdmin = (req) => req.usuario?.tipo === "admin"

async function listar(req, res) {
	try {
		const produtos = await produtoService.listar(req.query, ehAdmin(req))
		res.status(200).json(produtos)
	} catch (err) {
		tratarErro(res, err)
	}
}

// GET /produtos/mais-vistos?limite=8
async function maisVistos(req, res) {
	try {
		const produtos = await produtoService.maisVistos(req.query.limite)
		res.status(200).json(produtos)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function buscarPorId(req, res) {
	try {
		const produto = await produtoService.buscarPorId(req.params.id, ehAdmin(req))
		res.status(200).json(produto)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function cadastrar(req, res) {
	try {
		const produto = await produtoService.cadastrar(req.body)
		res.status(201).json(produto)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function atualizar(req, res) {
	try {
		const produto = await produtoService.atualizar(req.params.id, req.body)
		res.status(200).json(produto)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function excluir(req, res) {
	try {
		const { desativado } = await produtoService.excluir(req.params.id)
		if (desativado) {
			return res.status(200).json({
				message: "O produto já foi vendido, então foi desativado em vez de excluído"
			})
		}
		res.status(204).send()
	} catch (err) {
		tratarErro(res, err)
	}
}

async function adicionarImagem(req, res) {
	try {
		const imagem = await produtoService.adicionarImagem(req.params.id, req.body)
		res.status(201).json(imagem)
	} catch (err) {
		tratarErro(res, err)
	}
}

async function removerImagem(req, res) {
	try {
		await produtoService.removerImagem(req.params.idImagem)
		res.status(204).send()
	} catch (err) {
		tratarErro(res, err)
	}
}

module.exports = {
	listar,
	maisVistos,
	buscarPorId,
	cadastrar,
	atualizar,
	excluir,
	adicionarImagem,
	removerImagem
}
