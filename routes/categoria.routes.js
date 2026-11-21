const express = require("express")
const categoriaController = require("../controller/categoria.controller")
const { autenticar, somenteAdmin } = require("../middleware/auth.middleware")

const router = express.Router()

// público (o front usa o listar para montar a sidebar)
router.get("/", categoriaController.listar)
router.get("/:id", categoriaController.buscarPorId)

// 🔒 admin
router.post("/", autenticar, somenteAdmin, categoriaController.cadastrar)
router.put("/:id", autenticar, somenteAdmin, categoriaController.atualizar)
router.delete("/:id", autenticar, somenteAdmin, categoriaController.excluir)

module.exports = router
