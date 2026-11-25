const express = require("express")
const produtoController = require("../controller/produto.controller")
const { autenticar, autenticarOpcional, somenteAdmin } = require("../middleware/auth.middleware")

const router = express.Router()

// público (com token de admin, mostra também os desativados)
// "/mais-vistos" vem antes de "/:id", senão "mais-vistos" seria lido como id
router.get("/", autenticarOpcional, produtoController.listar)
router.get("/mais-vistos", produtoController.maisVistos)
router.get("/:id", autenticarOpcional, produtoController.buscarPorId)

//  admin
router.post("/", autenticar, somenteAdmin, produtoController.cadastrar)
router.put("/:id", autenticar, somenteAdmin, produtoController.atualizar)
router.delete("/:id", autenticar, somenteAdmin, produtoController.excluir)

//  admin: imagens extras do produto
router.post("/:id/imagens", autenticar, somenteAdmin, produtoController.adicionarImagem)
router.delete("/imagens/:idImagem", autenticar, somenteAdmin, produtoController.removerImagem)

module.exports = router
