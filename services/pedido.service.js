const { Op } = require("sequelize")
const conn = require("../db/conn")
const { Pedido, ItemPedido, ItemCarrinho, Produto, Cupom, Usuario } = require("../models/rel")
const AppError = require("../utils/AppError")
const { paraCentavos, paraReais } = require("../utils/dinheiro")
const carrinhoService = require("./carrinho.service")
const cupomService = require("./cupom.service")

const STATUS = ["PENDENTE", "PAGO", "ENVIADO", "ENTREGUE", "CANCELADO"]

// Para onde cada status pode ir. ENTREGUE e CANCELADO são finais.
const TRANSICOES = {
	PENDENTE: ["PAGO", "CANCELADO"],
	PAGO: ["ENVIADO", "CANCELADO"],
	ENVIADO: ["ENTREGUE"],
	ENTREGUE: [],
	CANCELADO: []
}

const INCLUDE_ITENS = {
	model: ItemPedido,
	as: "itens",
	include: [{ model: Produto, as: "produto", attributes: ["codProduto", "nome", "imagem_principal"] }]
}

// DECIMAL vem do MySQL como texto; aqui tudo vira número.
// "subtotal" é o valor antes do desconto (valor_total + desconto).
function formatar(pedido) {
	const dados = pedido.toJSON ? pedido.toJSON() : pedido
	const total = paraCentavos(dados.valor_total)
	const desconto = paraCentavos(dados.desconto)

	return {
		...dados,
		valor_total: paraReais(total),
		desconto: paraReais(desconto),
		subtotal: paraReais(total + desconto),
		itens: (dados.itens || []).map((item) => ({
			...item,
			preco_unitario: Number(item.preco_unitario),
			subtotal: paraReais(paraCentavos(item.preco_unitario) * item.quantidade)
		}))
	}
}

// Quando um pedido é cancelado: o estoque volta e o uso do cupom é devolvido
async function devolverEstoqueECupom(pedido, transaction) {
	const itens = await ItemPedido.findAll({ where: { idPedido: pedido.codPedido }, transaction })

	for (const item of itens) {
		await Produto.increment("estoque", { by: item.quantidade, where: { codProduto: item.idProduto }, transaction })
	}

	if (pedido.codigo_cupom) {
		// se o cupom foi apagado depois, não tem o que devolver
		await Cupom.increment("usos", { by: 1, where: { codigo: pedido.codigo_cupom }, transaction })
	}
}

// ---------- checkout ----------

// Tudo dentro de uma transação: se qualquer passo falhar, nada é salvo
// (nem pedido, nem baixa de estoque, nem uso do cupom).
async function finalizar(idUsuario, { codigo_cupom } = {}) {
	const codPedido = await conn.transaction(async (t) => {
		// 1. itens do carrinho
		const carrinho = await carrinhoService.obterOuCriarCarrinho(idUsuario, t)
		const itens = await ItemCarrinho.findAll({ where: { idCarrinho: carrinho.codCarrinho }, transaction: t })
		if (itens.length === 0) {
			throw new AppError("Seu carrinho está vazio")
		}

		// 2. conferir estoque. O lock trava esses produtos até o fim da transação,
		//    então duas compras ao mesmo tempo não vendem a mesma última unidade.
		const produtos = await Produto.findAll({
			where: { codProduto: itens.map((item) => item.idProduto) },
			order: [["codProduto", "ASC"]],
			transaction: t,
			lock: t.LOCK.UPDATE
		})
		const produtoPorId = new Map(produtos.map((produto) => [produto.codProduto, produto]))

		const problemas = []
		let subtotal = 0
		for (const item of itens) {
			const produto = produtoPorId.get(item.idProduto)
			if (!produto || !produto.ativo) {
				problemas.push(`${produto ? produto.nome : "Um produto"} não está mais disponível`)
			} else if (item.quantidade > produto.estoque) {
				problemas.push(
					produto.estoque === 0
						? `${produto.nome} está sem estoque`
						: `Só temos ${produto.estoque} unidade(s) de ${produto.nome}`
				)
			} else {
				subtotal += paraCentavos(produto.preco) * item.quantidade
			}
		}
		if (problemas.length > 0) {
			throw new AppError(`Ajuste seu carrinho: ${problemas.join("; ")}`, 409)
		}

		// 3. cupom (opcional)
		let desconto = 0
		let codigo = null
		if (codigo_cupom && String(codigo_cupom).trim()) {
			const cupom = await cupomService.buscarValido(codigo_cupom, { transaction: t, lock: true })
			desconto = cupomService.calcularDescontoCentavos(subtotal, cupom.desconto)
			codigo = cupom.codigo
			await cupom.decrement("usos", { by: 1, transaction: t })
		}

		// 4. criar o pedido
		const pedido = await Pedido.create(
			{
				idUsuario,
				valor_total: paraReais(subtotal - desconto),
				desconto: paraReais(desconto),
				codigo_cupom: codigo,
				status: "PENDENTE"
			},
			{ transaction: t }
		)

		// 5. itens do pedido com o preço de AGORA (se o preço mudar depois, o pedido não muda)
		await ItemPedido.bulkCreate(
			itens.map((item) => ({
				idPedido: pedido.codPedido,
				idProduto: item.idProduto,
				quantidade: item.quantidade,
				preco_unitario: produtoPorId.get(item.idProduto).preco
			})),
			{ transaction: t }
		)

		// 6. baixar o estoque
		for (const item of itens) {
			await Produto.decrement("estoque", { by: item.quantidade, where: { codProduto: item.idProduto }, transaction: t })
		}

		// 7. esvaziar o carrinho
		await ItemCarrinho.destroy({ where: { idCarrinho: carrinho.codCarrinho }, transaction: t })

		return pedido.codPedido
	})

	return buscarPorId(codPedido)
}

// ---------- consultas ----------

async function buscarPorId(id, usuario = null) {
	const pedido = await Pedido.findByPk(id, {
		include: [INCLUDE_ITENS, { model: Usuario, as: "usuario", attributes: ["codUsuario", "nome", "email"] }]
	})

	// Pedido de outra pessoa responde "não encontrado" (não revela que o id existe)
	const podeVer = !usuario || usuario.tipo === "admin" || (pedido && pedido.idUsuario === usuario.codUsuario)
	if (!pedido || !podeVer) {
		throw new AppError("Pedido não encontrado", 404)
	}

	return formatar(pedido)
}

// Histórico do perfil: só os pedidos de quem está logado, mais recentes primeiro
async function listarDoUsuario(idUsuario) {
	const pedidos = await Pedido.findAll({
		where: { idUsuario },
		include: [INCLUDE_ITENS],
		order: [["createdAt", "DESC"], ["codPedido", "DESC"]]
	})
	return pedidos.map(formatar)
}

// Admin: todos os pedidos, com filtro opcional ?status=PAGO
async function listarTodos({ status } = {}) {
	const where = {}
	if (status !== undefined) {
		const s = String(status).toUpperCase()
		if (!STATUS.includes(s)) throw new AppError(`Status inválido. Use: ${STATUS.join(", ")}`)
		where.status = s
	}

	const pedidos = await Pedido.findAll({
		where,
		include: [INCLUDE_ITENS, { model: Usuario, as: "usuario", attributes: ["codUsuario", "nome", "email"] }],
		order: [["createdAt", "DESC"], ["codPedido", "DESC"]]
	})
	return pedidos.map(formatar)
}

// ---------- mudanças de status ----------

// A linha do pedido fica travada durante a mudança, então duas mudanças ao mesmo tempo
// (ex.: admin marcando PAGO enquanto o usuário cancela) não se atropelam.
async function mudarStatus(id, novoStatus, { idUsuarioDono = null } = {}) {
	await conn.transaction(async (t) => {
		const pedido = await Pedido.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE })

		if (!pedido || (idUsuarioDono !== null && pedido.idUsuario !== idUsuarioDono)) {
			throw new AppError("Pedido não encontrado", 404)
		}

		// o usuário só cancela enquanto está PENDENTE (o admin pode cancelar também um PAGO)
		if (idUsuarioDono !== null && pedido.status !== "PENDENTE") {
			throw new AppError("Só dá para cancelar pedidos que ainda estão pendentes", 409)
		}

		if (!TRANSICOES[pedido.status].includes(novoStatus)) {
			throw new AppError(`Não é possível mudar um pedido ${pedido.status} para ${novoStatus}`, 409)
		}

		if (novoStatus === "CANCELADO") {
			await devolverEstoqueECupom(pedido, t)
		}

		await pedido.update({ status: novoStatus }, { transaction: t })
	})

	return buscarPorId(id)
}

// 🔒 admin: PENDENTE → PAGO → ENVIADO → ENTREGUE (ou CANCELADO antes de enviar)
async function atualizarStatus(id, { status }) {
	const s = String(status ?? "").toUpperCase()
	if (!STATUS.includes(s)) {
		throw new AppError(`Status inválido. Use: ${STATUS.join(", ")}`)
	}
	return mudarStatus(id, s)
}

// 👤 o próprio usuário só cancela enquanto o pedido está PENDENTE
async function cancelarPeloUsuario(idUsuario, id) {
	return mudarStatus(id, "CANCELADO", { idUsuarioDono: idUsuario })
}

module.exports = {
	finalizar,
	buscarPorId,
	listarDoUsuario,
	listarTodos,
	atualizarStatus,
	cancelarPeloUsuario
}
