const { Op } = require("sequelize")
const conn = require("../db/conn")
const { Produto, Categoria, ImagemProduto, ItemPedido, ItemCarrinho, Favorito } = require("../models/rel")
const AppError = require("../utils/AppError")

// ---------- auxiliares ----------

const INCLUDE_CATEGORIA = { model: Categoria, as: "categoria", attributes: ["codCategoria", "nome"] }

const ORDENACOES = {
	recentes: [["codProduto", "DESC"]],
	preco_asc: [["preco", "ASC"]],
	preco_desc: [["preco", "DESC"]],
	nome_asc: [["nome", "ASC"]],
	nome_desc: [["nome", "DESC"]],
	mais_vistos: [["visualizacoes", "DESC"]]
}

// O MySQL devolve DECIMAL como texto ("199.90"). Aqui vira número para o front não precisar converter.
function formatar(produto) {
	const dados = produto.toJSON ? produto.toJSON() : produto
	return { ...dados, preco: Number(dados.preco) }
}

function paraNumero(valor, campo) {
	const numero = Number(valor)
	if (valor === "" || valor === null || Number.isNaN(numero)) {
		throw new AppError(`${campo} precisa ser um número`)
	}
	return numero
}

function paraBooleano(valor, campo) {
	if (valor === true || valor === "true") return true
	if (valor === false || valor === "false") return false
	throw new AppError(`${campo} precisa ser true ou false`)
}

function texto(valor) {
	return String(valor ?? "").trim()
}

async function garantirCategoria(idCategoria) {
	const id = paraNumero(idCategoria, "idCategoria")
	const categoria = await Categoria.findByPk(id)
	if (!categoria) {
		throw new AppError("Categoria não encontrada", 404)
	}
	return id
}

// Valida e monta só os campos enviados. Com "obrigatorio = true" (cadastro), todos precisam vir.
async function montarDados(body, obrigatorio) {
	const dados = {}
	const exigir = (campo) => {
		if (obrigatorio && (body[campo] === undefined || texto(body[campo]) === "")) {
			throw new AppError(`O campo ${campo} é obrigatório`)
		}
		return body[campo] !== undefined
	}

	if (exigir("nome")) {
		dados.nome = texto(body.nome)
		if (!dados.nome) throw new AppError("O nome não pode ficar vazio")
		if (dados.nome.length > 150) throw new AppError("O nome pode ter no máximo 150 caracteres")
	}

	if (exigir("descricao")) {
		dados.descricao = texto(body.descricao)
		if (!dados.descricao) throw new AppError("A descrição não pode ficar vazia")
	}

	if (exigir("preco")) {
		dados.preco = paraNumero(body.preco, "preco")
		if (dados.preco <= 0) throw new AppError("O preço precisa ser maior que zero")
		if (dados.preco > 99999999.99) throw new AppError("Preço acima do limite")
	}

	if (exigir("estoque")) {
		dados.estoque = paraNumero(body.estoque, "estoque")
		if (!Number.isInteger(dados.estoque) || dados.estoque < 0) {
			throw new AppError("O estoque precisa ser um número inteiro, zero ou maior")
		}
	}

	if (exigir("idCategoria")) {
		dados.idCategoria = await garantirCategoria(body.idCategoria)
	}

	if (exigir("imagem_principal")) {
		dados.imagem_principal = texto(body.imagem_principal)
		if (!dados.imagem_principal) throw new AppError("A imagem principal não pode ficar vazia")
		if (dados.imagem_principal.length > 255) throw new AppError("O link da imagem pode ter no máximo 255 caracteres")
	}

	// opcionais (têm valor padrão no model)
	if (body.promocao !== undefined) dados.promocao = paraBooleano(body.promocao, "promocao")
	if (body.ativo !== undefined) dados.ativo = paraBooleano(body.ativo, "ativo")

	return dados
}

// ---------- produtos ----------

// Filtros (todos opcionais, vêm da query string):
// ?categoria=1  ?busca=canon  ?precoMin=100&precoMax=500  ?promocao=true  ?emEstoque=true
// ?ordenar=preco_asc  ?limite=6
// Visitantes só veem produtos ativos. Admin pode pedir ?inativos=true para ver todos.
async function listar(filtros = {}, ehAdmin = false) {
	const where = {}

	if (!(ehAdmin && filtros.inativos === "true")) {
		where.ativo = true
	}

	if (filtros.categoria !== undefined) {
		where.idCategoria = paraNumero(filtros.categoria, "categoria")
	}

	const busca = texto(filtros.busca)
	if (busca) {
		if (busca.length > 100) throw new AppError("A busca pode ter no máximo 100 caracteres")
		// % e _ são curingas do LIKE: escapados, a pessoa busca exatamente o que digitou
		const termo = `%${busca.replace(/[\\%_]/g, "\\$&")}%`
		where[Op.or] = [{ nome: { [Op.like]: termo } }, { descricao: { [Op.like]: termo } }]
	}

	if (filtros.precoMin !== undefined || filtros.precoMax !== undefined) {
		where.preco = {}
		const min = filtros.precoMin !== undefined ? paraNumero(filtros.precoMin, "precoMin") : null
		const max = filtros.precoMax !== undefined ? paraNumero(filtros.precoMax, "precoMax") : null
		if ((min !== null && min < 0) || (max !== null && max < 0)) {
			throw new AppError("O preço não pode ser negativo")
		}
		if (min !== null && max !== null && min > max) {
			throw new AppError("O preço mínimo não pode ser maior que o máximo")
		}
		if (min !== null) where.preco[Op.gte] = min
		if (max !== null) where.preco[Op.lte] = max
	}

	if (filtros.promocao !== undefined) {
		where.promocao = paraBooleano(filtros.promocao, "promocao")
	}

	// ?emEstoque=true esconde os esgotados
	if (filtros.emEstoque !== undefined && paraBooleano(filtros.emEstoque, "emEstoque")) {
		where.estoque = { [Op.gt]: 0 }
	}

	const ordenar = filtros.ordenar || "recentes"
	if (!ORDENACOES[ordenar]) {
		throw new AppError(`Ordenação inválida. Use: ${Object.keys(ORDENACOES).join(", ")}`)
	}

	// ?limite=6 (usado pelas sugestões da busca). Sem limite, traz todos.
	let limit
	if (filtros.limite !== undefined) {
		limit = paraNumero(filtros.limite, "limite")
		if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
			throw new AppError("O limite precisa ser um número inteiro de 1 a 50")
		}
	}

	const produtos = await Produto.findAll({
		where,
		include: [INCLUDE_CATEGORIA],
		order: ORDENACOES[ordenar],
		limit
	})

	return produtos.map(formatar)
}

async function maisVistos(limite = 8) {
	const quantidade = Math.min(Math.max(parseInt(limite, 10) || 8, 1), 50)

	const produtos = await Produto.findAll({
		where: { ativo: true },
		include: [INCLUDE_CATEGORIA],
		order: [["visualizacoes", "DESC"]],
		limit: quantidade
	})

	return produtos.map(formatar)
}

// Página de detalhes: traz categoria + imagens e soma 1 visualização.
// O admin não conta como visualização e consegue abrir produtos desativados.
async function buscarPorId(id, ehAdmin = false) {
	const produto = await Produto.findByPk(id, {
		include: [INCLUDE_CATEGORIA, { model: ImagemProduto, as: "imagens" }],
		order: [[{ model: ImagemProduto, as: "imagens" }, "codImagemProduto", "ASC"]]
	})

	if (!produto || (!produto.ativo && !ehAdmin)) {
		throw new AppError("Produto não encontrado", 404)
	}

	if (!ehAdmin) {
		// increment faz "visualizacoes = visualizacoes + 1" direto no banco,
		// então duas pessoas abrindo ao mesmo tempo não perdem contagem
		await produto.increment("visualizacoes")
		produto.visualizacoes += 1
	}

	return formatar(produto)
}

async function cadastrar(body) {
	const dados = await montarDados(body, true)
	const produto = await Produto.create(dados)
	return formatar(produto)
}

async function atualizar(id, body) {
	const produto = await Produto.findByPk(id)
	if (!produto) {
		throw new AppError("Produto não encontrado", 404)
	}

	const dados = await montarDados(body, false)
	if (Object.keys(dados).length === 0) {
		throw new AppError("Envie pelo menos um campo para atualizar")
	}

	await produto.update(dados)
	return formatar(produto)
}

// Produto que já foi vendido não pode sumir (o histórico de pedidos aponta para ele):
// nesse caso ele só é desativado. Se nunca foi vendido, é apagado de verdade,
// junto com as imagens, os itens de carrinho e os favoritos dele.
async function excluir(id) {
	const produto = await Produto.findByPk(id)
	if (!produto) {
		throw new AppError("Produto não encontrado", 404)
	}

	const vendas = await ItemPedido.count({ where: { idProduto: produto.codProduto } })
	if (vendas > 0) {
		await produto.update({ ativo: false })
		return { desativado: true }
	}

	await conn.transaction(async (t) => {
		const where = { idProduto: produto.codProduto }
		await ImagemProduto.destroy({ where, transaction: t })
		await ItemCarrinho.destroy({ where, transaction: t })
		await Favorito.destroy({ where, transaction: t })
		await produto.destroy({ transaction: t })
	})

	return { desativado: false }
}

// ---------- imagens extras (a principal fica em produtos.imagem_principal) ----------

async function adicionarImagem(idProduto, { url_imagem }) {
	const produto = await Produto.findByPk(idProduto)
	if (!produto) {
		throw new AppError("Produto não encontrado", 404)
	}

	const url = texto(url_imagem)
	if (!url) throw new AppError("Informe o url_imagem")
	if (url.length > 255) throw new AppError("O link da imagem pode ter no máximo 255 caracteres")

	return ImagemProduto.create({ idProduto: produto.codProduto, url_imagem: url })
}

async function removerImagem(idImagem) {
	const imagem = await ImagemProduto.findByPk(idImagem)
	if (!imagem) {
		throw new AppError("Imagem não encontrada", 404)
	}
	await imagem.destroy()
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
