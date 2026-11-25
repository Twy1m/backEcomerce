const express = require("express")
const pedidoController = require("../controller/pedido.controller")
const { autenticar, somenteAdmin } = require("../middleware/auth.middleware")

const router = express.Router()

// todas as rotas precisam de login
router.use(autenticar)

// 👤 usuário logado ("/me" vem antes de "/:id")
router.post("/", pedidoController.finalizar)
router.get("/me", pedidoController.meusPedidos)
router.patch("/:id/cancelar", pedidoController.cancelar)

// admin
router.get("/", somenteAdmin, pedidoController.listarTodos)
router.patch("/:id/status", somenteAdmin, pedidoController.atualizarStatus)

// dono do pedido ou admin (a checagem fica no service)
router.get("/:id", pedidoController.buscarPorId)

module.exports = router
