const { Categoria, Produto } = require("../models/rel")
const AppError = require("../utils/AppError")

function limparTexto(valor) {
	return String(valor ?? "").trim()
}

// Lista em ordem alfabética (é o que a sidebar do front vai mostrar)
async function listar() {
	return Categoria.findAll({ order: [["nome", "ASC"]] })
}

// Busca uma categoria e, se pedido, já traz os produtos dela
async function buscarPorId(id, { comProdutos = false } = {}) {
	const categoria = await Categoria.findByPk(id, {
		include: comProdutos ? [{ model: Produto, as: "produtos" }] : []
	})
	if (!categoria) {
		throw new AppError("Categoria não encontrada", 404)
	}
	return categoria
}

// O MySQL compara texto sem diferenciar maiúsculas, então "Câmeras" e "câmeras" contam como iguais
async function garantirNomeLivre(nome, idIgnorado = null) {
	const existente = await Categoria.findOne({ where: { nome } })
	if (existente && existente.codCategoria !== Number(idIgnorado)) {
		throw new AppError("Já existe uma categoria com esse nome", 409)
	}
}

async function cadastrar({ nome, descricao }) {
	const nomeLimpo = limparTexto(nome)
	const descricaoLimpa = limparTexto(descricao)

	if (!nomeLimpo || !descricaoLimpa) {
		throw new AppError("Preencha nome e descrição")
	}
	if (nomeLimpo.length > 100) {
		throw new AppError("O nome pode ter no máximo 100 caracteres")
	}

	await garantirNomeLivre(nomeLimpo)

	return Categoria.create({ nome: nomeLimpo, descricao: descricaoLimpa })
}

async function atualizar(id, { nome, descricao }) {
	const categoria = await buscarPorId(id)

	if (nome !== undefined) {
		const nomeLimpo = limparTexto(nome)
		if (!nomeLimpo) throw new AppError("O nome não pode ficar vazio")
		if (nomeLimpo.length > 100) throw new AppError("O nome pode ter no máximo 100 caracteres")
		await garantirNomeLivre(nomeLimpo, id)
		categoria.nome = nomeLimpo
	}

	if (descricao !== undefined) {
		const descricaoLimpa = limparTexto(descricao)
		if (!descricaoLimpa) throw new AppError("A descrição não pode ficar vazia")
		categoria.descricao = descricaoLimpa
	}

	await categoria.save()
	return categoria
}

async function excluir(id) {
	const categoria = await buscarPorId(id)

	const totalProdutos = await Produto.count({ where: { idCategoria: categoria.codCategoria } })
	if (totalProdutos > 0) {
		throw new AppError(
			`Não é possível excluir: a categoria tem ${totalProdutos} produto(s). Mova ou exclua os produtos antes.`,
			409
		)
	}

	await categoria.destroy()
}

module.exports = {
	listar,
	buscarPorId,
	cadastrar,
	atualizar,
	excluir
}
