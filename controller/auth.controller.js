const authService = require("../services/auth.service")
const tratarErro = require("../utils/tratarErro")

async function login(req, res) {
	try {
		const resultado = await authService.login(req.body)
		res.status(200).json(resultado) // { token, usuario }
	} catch (err) {
		tratarErro(res, err)
	}
}

module.exports = {
	login
}
