// Erro "esperado" da regra de negócio (ex.: e-mail já cadastrado).
// O service lança, e o controller usa o status para responder.
class AppError extends Error {
	constructor(message, status = 400) {
		super(message)
		this.status = status
	}
}

module.exports = AppError
