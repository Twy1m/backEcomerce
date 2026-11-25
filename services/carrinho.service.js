const conn = require("../db/conn")
const { Carrinho, ItemCarrinho, Produto } = require("../models/rel")
const AppError = require("../utils/AppError")
const { paraCentavos, paraReais } = require("../utils/dinheiro")

const ATRIBUTOS_PRODUTO = ["codProduto", "nome", "preco", "estoque", "imagem_principal", "promocao", "ativo"]

function paraInteiroPositivo(valor, campo) {
	const numero = Number(valor)
	if (!Number.isInteger(numero) || numero <= 0) {
		throw new AppError(`${campo} precisa ser um número inteiro maior que zero`)
	}
	return numero
}

// Cada usuário tem um carrinho só. Na primeira vez, ele é criado aqui.
async function obterOuCriarCarrinho(idUsuario, transaction) {
	const [carrinho] = await Carrinho.findOrCreate({
		where: { idUsuario },
		defaults: { idUsuario },
		transaction
	})
	return carrinho
}

// Busca um item garantindo que ele é do carrinho de quem pediu
async function buscarItemDoUsuario(idUsuario, idItem) {
	const carrinho = await obterOuCriarCarrinho(idUsuario)
	const item = await ItemCarrinho.findOne({
		where: { codItemCarrinho: paraInteiroPositivo(idItem, "id do item"), idCarrinho: carrinho.codCarrinho },
		include: [{ model: Produto, as: "produto" }]
	})
	if (!item) {
		throw new AppError("Item não encontrado no seu carrinho", 404)
	}
	return item
}

function validarEstoque(produto, quantidade) {
	if (quantidade > produto.estoque) {
		throw new AppError(
			produto.estoque === 0
				? `${produto.nome} está sem estoque`
				: `Só temos ${produto.estoque} unidade(s) de ${produto.nome} em estoque`,
			409
		)
	}
}

// Devolve o carrinho pronto para a sidebar: itens, subtotal de cada um e total.
// Item de produto desativado ou sem estoque suficiente vem com "disponivel: false"
// e não entra no subtotal (o checkout também barra esses itens).
async function ver(idUsuario) {
	const carrinho = await obterOuCriarCarrinho(idUsuario)

	const itens = await ItemCarrinho.findAll({
		where: { idCarrinho: carrinho.codCarrinho },
		include: [{ model: Produto, as: "produto", attributes: ATRIBUTOS_PRODUTO }],
		order: [["codItemCarrinho", "ASC"]]
	})

	let subtotalCentavos = 0
	let quantidadeItens = 0

	const itensFormatados = itens.map((item) => {
		const produto = item.produto.toJSON()
		const precoCentavos = paraCentavos(produto.preco)
		const disponivel = produto.ativo && item.quantidade <= produto.estoque
		const subtotalItem = precoCentavos * item.quantidade

		if (disponivel) {
			subtotalCentavos += subtotalItem
			quantidadeItens += item.quantidade
		}

		return {
			codItemCarrinho: item.codItemCarrinho,
			quantidade: item.quantidade,
			disponivel,
			subtotal: paraReais(subtotalItem),
			produto: { ...produto, preco: paraReais(precoCentavos) }
		}
	})

	return {
		codCarrinho: carrinho.codCarrinho,
		itens: itensFormatados,
		quantidadeItens,
		subtotal: paraReais(subtotalCentavos)
	}
}

// Se o produto já está no carrinho, soma a quantidade em vez de criar outra linha
async function adicionarItem(idUsuario, { idProduto, quantidade = 1 }) {
	const id = paraInteiroPositivo(idProduto, "idProduto")
	const qtd = paraInteiroPositivo(quantidade, "quantidade")

	const produto = await Produto.findByPk(id)
	if (!produto || !produto.ativo) {
		throw new AppError("Produto não encontrado", 404)
	}

	const carrinho = await obterOuCriarCarrinho(idUsuario)
	const where = { idCarrinho: carrinho.codCarrinho, idProduto: id }

	// Cliques rápidos no "adicionar" chegam juntos. A transação trava a linha do item
	// (lock), então cada clique espera o anterior terminar e a soma nunca se perde.
	// Se dois tentarem CRIAR a linha ao mesmo tempo, o banco recusa um deles
	// (índice único ou deadlock) e ele tenta de novo, já encontrando a linha criada.
	for (let tentativa = 1; ; tentativa++) {
		try {
			await conn.transaction(async (t) => {
				const existente = await ItemCarrinho.findOne({ where, transaction: t, lock: t.LOCK.UPDATE })
				const novaQuantidade = (existente ? existente.quantidade : 0) + qtd
				validarEstoque(produto, novaQuantidade)

				if (existente) {
					await existente.update({ quantidade: novaQuantidade }, { transaction: t })
				} else {
					await ItemCarrinho.create({ ...where, quantidade: qtd }, { transaction: t })
				}
			})
			break
		} catch (err) {
			const colisao = err.name === "SequelizeUniqueConstraintError" || err.parent?.code === "ER_LOCK_DEADLOCK"
			if (!colisao || tentativa >= 5) throw err
		}
	}

	return ver(idUsuario)
}

async function alterarQuantidade(idUsuario, idItem, { quantidade }) {
	const qtd = paraInteiroPositivo(quantidade, "quantidade")
	const item = await buscarItemDoUsuario(idUsuario, idItem)

	if (!item.produto.ativo) {
		throw new AppError("Esse produto não está mais disponível. Remova-o do carrinho.", 409)
	}
	validarEstoque(item.produto, qtd)

	await item.update({ quantidade: qtd })
	return ver(idUsuario)
}

async function removerItem(idUsuario, idItem) {
	const item = await buscarItemDoUsuario(idUsuario, idItem)
	await item.destroy()
	return ver(idUsuario)
}

// Apaga os itens, não o carrinho
async function esvaziar(idUsuario, transaction) {
	const carrinho = await obterOuCriarCarrinho(idUsuario, transaction)
	await ItemCarrinho.destroy({ where: { idCarrinho: carrinho.codCarrinho }, transaction })
}

module.exports = {
	obterOuCriarCarrinho,
	ver,
	adicionarItem,
	alterarQuantidade,
	removerItem,
	esvaziar
}
