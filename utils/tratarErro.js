const AppError = require("./AppError")

// Usado no catch dos controllers: erro de regra de negócio vira a resposta certa,
// qualquer outro erro vira 500 e é mostrado no console.
function tratarErro(res, err) {
	if (err instanceof AppError) {
		return res.status(err.status).json({ message: err.message })
	}

	console.error(err)
	return res.status(500).json({ message: "Erro interno no servidor" })
}

module.exports = tratarErro
