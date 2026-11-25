const { Favorito, Produto, Categoria } = require("../models/rel")
const AppError = require("../utils/AppError")

function paraId(valor) {
	const id = Number(valor)
	if (!Number.isInteger(id) || id <= 0) {
		throw new AppError("idProduto inválido")
	}
	return id
}

// Lista os favoritos do usuário com os dados do produto.
// Produtos desativados pelo admin não aparecem.
async function listar(idUsuario) {
	const favoritos = await Favorito.findAll({
		where: { idUsuario },
		include: [
			{
				model: Produto,
				as: "produto",
				where: { ativo: true },
				include: [{ model: Categoria, as: "categoria", attributes: ["codCategoria", "nome"] }]
			}
		],
		order: [["codFavorito", "DESC"]] // os favoritados por último aparecem primeiro
	})

	// O MySQL devolve DECIMAL como texto; aqui o preço vira número
	return favoritos.map((favorito) => {
		const dados = favorito.toJSON()
		dados.produto.preco = Number(dados.produto.preco)
		return dados
	})
}

// Para o front saber se pinta o coração do produto ou não
async function estaFavoritado(idUsuario, idProduto) {
	const favorito = await Favorito.findOne({
		where: { idUsuario, idProduto: paraId(idProduto) }
	})
	return Boolean(favorito)
}

async function adicionar(idUsuario, idProduto) {
	const id = paraId(idProduto)

	const produto = await Produto.findByPk(id)
	if (!produto || !produto.ativo) {
		throw new AppError("Produto não encontrado", 404)
	}

	const jaExiste = await Favorito.findOne({ where: { idUsuario, idProduto: id } })
	if (jaExiste) {
		throw new AppError("Esse produto já está nos seus favoritos", 409)
	}

	try {
		return await Favorito.create({ idUsuario, idProduto: id })
	} catch (err) {
		// dois cliques muito rápidos: o índice único do banco barra o segundo
		if (err.name === "SequelizeUniqueConstraintError") {
			throw new AppError("Esse produto já está nos seus favoritos", 409)
		}
		throw err
	}
}

async function remover(idUsuario, idProduto) {
	const apagados = await Favorito.destroy({
		where: { idUsuario, idProduto: paraId(idProduto) }
	})
	if (apagados === 0) {
		throw new AppError("Esse produto não está nos seus favoritos", 404)
	}
}

module.exports = {
	listar,
	estaFavoritado,
	adicionar,
	remover
}
