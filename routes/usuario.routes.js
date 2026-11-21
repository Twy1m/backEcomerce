const express = require("express")
const usuarioController = require("../controller/usuario.controller")
const { autenticar, somenteAdmin, proprioOuAdmin } = require("../middleware/auth.middleware")

const router = express.Router()

router.post("/", usuarioController.cadastrar)

// usuário logado
router.get("/me", autenticar, usuarioController.meuPerfil)
router.put("/me", autenticar, usuarioController.atualizarMeuPerfil)

//  admin
router.get("/", autenticar, somenteAdmin, usuarioController.listar)
router.get("/:id", autenticar, somenteAdmin, usuarioController.buscarPorId)

// o próprio usuário ou admin
router.delete("/:id", autenticar, proprioOuAdmin, usuarioController.excluir)

module.exports = router
