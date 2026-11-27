const express = require("express")
const { rateLimit } = require("express-rate-limit")
const authController = require("../controller/auth.controller")

const router = express.Router()

// Limite por IP em janelas de 15 minutos (dá para ajustar no .env).
// No login só contam as tentativas que FALHAM: quem acerta a senha não é bloqueado.
const QUINZE_MINUTOS = 15 * 60 * 1000
function limitar(maximo, mensagem, opcoes = {}) {
	return rateLimit({
		windowMs: QUINZE_MINUTOS,
		limit: maximo,
		standardHeaders: "draft-8",
		legacyHeaders: false,
		handler: (req, res) => res.status(429).json({ message: mensagem }),
		...opcoes
	})
}

const limiteLogin = limitar(
	Number(process.env.RATE_LIMIT_LOGIN) || 10,
	"Muitas tentativas de login. Tente de novo em alguns minutos.",
	{ skipSuccessfulRequests: true }
)
const limiteVerificar = limitar(
	Number(process.env.RATE_LIMIT_VERIFICAR) || 20,
	"Muitas tentativas de verificação. Tente de novo em alguns minutos."
)
const limiteReenviar = limitar(
	Number(process.env.RATE_LIMIT_REENVIAR) || 10,
	"Muitos pedidos de código. Tente de novo em alguns minutos."
)

// público
router.post("/login", limiteLogin, authController.login)
// verificação em duas etapas (só admin chega aqui, com o "desafio" devolvido pelo login)
router.post("/login/verificar", limiteVerificar, authController.verificarCodigo)
router.post("/login/reenviar", limiteReenviar, authController.reenviarCodigo)

module.exports = router
