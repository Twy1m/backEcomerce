const express = require("express")
const favoritoController = require("../controller/favorito.controller")
const { autenticar } = require("../middleware/auth.middleware")

const router = express.Router()

// 👤 todas as rotas são do usuário logado
router.use(autenticar)

router.get("/", favoritoController.listar)
router.get("/:idProduto", favoritoController.verificar)
router.post("/", favoritoController.adicionar)
router.delete("/:idProduto", favoritoController.remover)

module.exports = router
