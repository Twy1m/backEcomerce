const authService = require("../services/auth.service")
const tratarErro = require("../utils/tratarErro")

// usuário comum: { token, usuario }
// admin: { precisaCodigo: true, desafio, email, reenviarEm } (o código vai por e-mail)
async function login(req, res) {
	try {
		const resultado = await authService.login(req.body)
		res.status(200).json(resultado)
	} catch (err) {
		tratarErro(res, err)
	}
}

// body: { desafio, codigo } -> { token, usuario }
async function verificarCodigo(req, res) {
	try {
		// IP e navegador vão no e-mail de "novo acesso ao painel"
		const contexto = { ip: req.ip, navegador: String(req.get("user-agent") || "").slice(0, 200) }
		res.status(200).json(await authService.verificarCodigo(req.body, contexto))
	} catch (err) {
		tratarErro(res, err)
	}
}

// body: { desafio } -> { desafio (novo), email, reenviarEm }
async function reenviarCodigo(req, res) {
	try {
		res.status(200).json(await authService.reenviarCodigo(req.body))
	} catch (err) {
		tratarErro(res, err)
	}
}

module.exports = {
	login,
	verificarCodigo,
	reenviarCodigo
}
