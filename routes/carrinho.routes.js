const express = require("express")
const carrinhoController = require("../controller/carrinho.controller")
const { autenticar } = require("../middleware/auth.middleware")

const router = express.Router()

// 👤 todas as rotas são do usuário logado (o carrinho é sempre o do token)
router.use(autenticar)

router.get("/", carrinhoController.ver)
router.delete("/", carrinhoController.esvaziar)

router.post("/itens", carrinhoController.adicionarItem)
router.post("/merge", carrinhoController.mesclar) // carrinho de visitante → carrinho do usuário, de uma vez
router.put("/itens/:id", carrinhoController.alterarQuantidade)
router.delete("/itens/:id", carrinhoController.removerItem)

module.exports = router
