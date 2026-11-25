const { verificarToken } = require("../services/auth.service")

// Confere se o usuário está logado.
// Espera o header: Authorization: Bearer <token>
function autenticar(req, res, next) {
	const authHeader = req.headers.authorization

	if (!authHeader || !authHeader.startsWith("Bearer ")) {
		return res.status(401).json({ message: "Token não enviado" })
	}

	const token = authHeader.split(" ")[1]

	try {
		const dados = verificarToken(token)
		// Fica disponível nos controllers: req.usuario.codUsuario e req.usuario.tipo
		req.usuario = { codUsuario: dados.codUsuario, tipo: dados.tipo }
		next()
	} catch (err) {
		if (err.name === "TokenExpiredError") {
			return res.status(401).json({ message: "Sessão expirada, faça login novamente" })
		}
		return res.status(401).json({ message: "Token inválido" })
	}
}

// Para rotas públicas que mudam um pouco quando quem chama é admin
// (ex.: o admin pode ver produtos desativados). Se vier um token válido, preenche
// req.usuario; se não vier nada ou o token for inválido, segue como visitante.
function autenticarOpcional(req, res, next) {
	const authHeader = req.headers.authorization

	if (authHeader && authHeader.startsWith("Bearer ")) {
		try {
			const dados = verificarToken(authHeader.split(" ")[1])
			req.usuario = { codUsuario: dados.codUsuario, tipo: dados.tipo }
		} catch (err) {
			// token inválido em rota pública: só ignora
		}
	}

	next()
}

// Só deixa passar administradores. Usar sempre DEPOIS do autenticar.
function somenteAdmin(req, res, next) {
	if (!req.usuario || req.usuario.tipo !== "admin") {
		return res.status(403).json({ message: "Acesso restrito a administradores" })
	}
	next()
}

// Deixa passar o próprio usuário (pelo :id da rota) ou um admin.
function proprioOuAdmin(req, res, next) {
	const ehProprio = Number(req.params.id) === req.usuario.codUsuario
	if (!ehProprio && req.usuario.tipo !== "admin") {
		return res.status(403).json({ message: "Você não tem permissão para isso" })
	}
	next()
}

module.exports = {
	autenticar,
	autenticarOpcional,
	somenteAdmin,
	proprioOuAdmin
}
