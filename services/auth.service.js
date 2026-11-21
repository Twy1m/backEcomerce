const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const { Usuario } = require("../models/rel")
const AppError = require("../utils/AppError")

const EXPIRA_EM = process.env.JWT_EXPIRES_IN || "1d"

// O payload do token só leva o necessário. Nunca coloque a senha aqui:
// o conteúdo do JWT pode ser lido por qualquer pessoa (só a assinatura é protegida).
function gerarToken(usuario) {
	return jwt.sign(
		{ codUsuario: usuario.codUsuario, tipo: usuario.tipo },
		process.env.TOKEN_SECRET,
		{ expiresIn: EXPIRA_EM }
	)
}

function verificarToken(token) {
	return jwt.verify(token, process.env.TOKEN_SECRET)
}

async function login({ email, senha }) {
	if (!email || !senha) {
		throw new AppError("Informe e-mail e senha")
	}

	const usuario = await Usuario.findOne({
		where: { email: String(email).trim().toLowerCase() }
	})

	// Mesma mensagem nos dois casos, para não revelar quais e-mails existem
	const senhaOk = usuario && (await bcrypt.compare(String(senha), usuario.senha))
	if (!senhaOk) {
		throw new AppError("E-mail ou senha inválidos", 401)
	}

	return {
		token: gerarToken(usuario),
		usuario: {
			codUsuario: usuario.codUsuario,
			nome: usuario.nome,
			email: usuario.email,
			tipo: usuario.tipo
		}
	}
}

module.exports = {
	login,
	gerarToken,
	verificarToken
}
