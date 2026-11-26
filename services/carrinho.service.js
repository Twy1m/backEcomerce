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

// Roda a transação de novo quando duas requisições tentam CRIAR a mesma linha ao mesmo tempo:
// o índice único (idCarrinho + idProduto) recusa uma delas (ou o MySQL acusa deadlock),
// e na segunda tentativa ela já encontra a linha criada pela outra.
async function transacaoComRetentativa(fn, maxTentativas = 5) {
	for (let tentativa = 1; ; tentativa++) {
		try {
			return await conn.transaction(fn)
		} catch (err) {
			const colisao = err.name === "SequelizeUniqueConstraintError" || err.parent?.code === "ER_LOCK_DEADLOCK"
			if (!colisao || tentativa >= maxTentativas) throw err
		}
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
	await transacaoComRetentativa(async (t) => {
		const existente = await ItemCarrinho.findOne({ where, transaction: t, lock: t.LOCK.UPDATE })
		const novaQuantidade = (existente ? existente.quantidade : 0) + qtd
		validarEstoque(produto, novaQuantidade)

		if (existente) {
			await existente.update({ quantidade: novaQuantidade }, { transaction: t })
		} else {
			await ItemCarrinho.create({ ...where, quantidade: qtd }, { transaction: t })
		}
	})

	return ver(idUsuario)
}

const MAX_ITENS_MERGE = 100

// Junta o carrinho de visitante (guardado no localStorage do front) ao carrinho do usuário,
// tudo numa transação só. Cada item SOMA ao que já existe. O que passar do estoque entra
// limitado ao estoque, e o que sobrou volta em "naoAdicionados" para o front avisar.
async function mesclar(idUsuario, { itens } = {}) {
	if (!Array.isArray(itens) || itens.length === 0) {
		throw new AppError("Envie os itens do carrinho")
	}
	if (itens.length > MAX_ITENS_MERGE) {
		throw new AppError(`Envie no máximo ${MAX_ITENS_MERGE} itens`)
	}

	// valida tudo antes de abrir a transação; o mesmo produto repetido vira uma linha só
	const pedidos = new Map()
	for (const item of itens) {
		const id = paraInteiroPositivo(item?.idProduto, "idProduto")
		const qtd = paraInteiroPositivo(item?.quantidade, "quantidade")
		pedidos.set(id, (pedidos.get(id) || 0) + qtd)
	}
	const ids = [...pedidos.keys()].sort((a, b) => a - b)

	let naoAdicionados = []

	await transacaoComRetentativa(async (t) => {
		naoAdicionados = [] // zera se a transação for repetida
		const carrinho = await obterOuCriarCarrinho(idUsuario, t)

		const produtos = await Produto.findAll({ where: { codProduto: ids }, transaction: t })
		const produtoPorId = new Map(produtos.map((p) => [p.codProduto, p]))

		// trava as linhas que já existem, como no adicionarItem
		const existentes = await ItemCarrinho.findAll({
			where: { idCarrinho: carrinho.codCarrinho, idProduto: ids },
			transaction: t,
			lock: t.LOCK.UPDATE
		})
		const existentePorId = new Map(existentes.map((i) => [i.idProduto, i]))

		for (const id of ids) {
			const qtd = pedidos.get(id)
			const produto = produtoPorId.get(id)

			if (!produto || !produto.ativo) {
				naoAdicionados.push({ idProduto: id, quantidade: qtd, motivo: "Produto não está mais disponível" })
				continue
			}

			const existente = existentePorId.get(id)
			const atual = existente ? existente.quantidade : 0
			const desejada = atual + qtd
			const final = Math.min(desejada, produto.estoque)

			if (final < desejada) {
				naoAdicionados.push({
					idProduto: id,
					nome: produto.nome,
					quantidade: desejada - final,
					motivo:
						produto.estoque === 0
							? `${produto.nome} está sem estoque`
							: `Só temos ${produto.estoque} unidade(s) de ${produto.nome} em estoque`
				})
			}

			if (final <= atual) continue // nada a acrescentar (nunca diminui o que já estava lá)

			if (existente) {
				await existente.update({ quantidade: final }, { transaction: t })
			} else {
				await ItemCarrinho.create(
					{ idCarrinho: carrinho.codCarrinho, idProduto: id, quantidade: final },
					{ transaction: t }
				)
			}
		}
	})

	return { ...(await ver(idUsuario)), naoAdicionados }
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
	mesclar,
	alterarQuantidade,
	removerItem,
	esvaziar
}
