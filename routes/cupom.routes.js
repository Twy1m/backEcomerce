const express = require("express")
const cupomController = require("../controller/cupom.controller")
const { autenticar, somenteAdmin } = require("../middleware/auth.middleware")

const router = express.Router()

// 👤 usuário logado (antes de "/:id")
router.post("/validar", autenticar, cupomController.validar)

// 🔒 admin
router.get("/", autenticar, somenteAdmin, cupomController.listar)
router.get("/:id", autenticar, somenteAdmin, cupomController.buscarPorId)
router.post("/", autenticar, somenteAdmin, cupomController.cadastrar)
router.put("/:id", autenticar, somenteAdmin, cupomController.atualizar)
router.delete("/:id", autenticar, somenteAdmin, cupomController.excluir)

module.exports = router
