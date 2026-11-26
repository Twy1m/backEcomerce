const express = require("express")
const enderecoController = require("../controller/endereco.controller")
const { autenticar } = require("../middleware/auth.middleware")

const router = express.Router()

// 👤 todas as rotas são do usuário logado (só mexe nos próprios endereços)
router.use(autenticar)

router.get("/", enderecoController.listar)
router.get("/:id", enderecoController.buscarPorId)
router.post("/", enderecoController.cadastrar)
router.put("/:id", enderecoController.atualizar)
router.patch("/:id/principal", enderecoController.definirPrincipal)
router.delete("/:id", enderecoController.excluir)

module.exports = router
