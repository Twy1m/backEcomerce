// Cria um administrador (ou promove um usuário que já existe).
//   npm run criar-admin
//
// Roda no terminal do servidor: só quem tem acesso à máquina consegue criar admin.
// O cadastro público (POST /usuarios) continua criando sempre "user".
// A senha é digitada sem aparecer na tela e não fica salva em arquivo nenhum.
require("dotenv").config({ quiet: true })
const readline = require("readline")
const conn = require("../db/conn")
const { Usuario } = require("../models/rel")
const usuarioService = require("../services/usuario.service")

const interativo = process.stdin.isTTY
const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: interativo })

// fila de linhas: funciona digitando no terminal e também com a entrada vinda de um pipe
const linhas = []
const esperando = []
rl.on("line", (linha) => (esperando.length ? esperando.shift()(linha) : linhas.push(linha)))
rl.on("close", () => esperando.splice(0).forEach((r) => r(null)))

function perguntar(texto, { oculto = false } = {}) {
	process.stdout.write(texto)
	let esconder = null
	if (oculto && interativo) {
		// troca o que for digitado por nada (a senha não aparece)
		esconder = rl._writeToOutput
		rl._writeToOutput = () => {}
	}
	return new Promise((resolver) => {
		const responder = (linha) => {
			if (esconder) {
				rl._writeToOutput = esconder
				process.stdout.write("\n")
			}
			if (linha === null) {
				console.error("\nEntrada encerrada antes de terminar.")
				process.exit(1)
			}
			resolver(linha.trim())
		}
		if (linhas.length) responder(linhas.shift())
		else esperando.push(responder)
	})
}

async function confirmar(texto) {
	const resposta = (await perguntar(`${texto} (s/n) `)).toLowerCase()
	return resposta === "s" || resposta === "sim"
}

async function main() {
	console.log("\n=== Criar administrador ===\n")

	const email = (await perguntar("E-mail: ")).toLowerCase()
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido")

	const existente = await Usuario.findOne({ where: { email } })

	if (existente) {
		if (existente.tipo === "admin") {
			console.log(`\n${existente.nome} (${email}) já é administrador. Nada a fazer.`)
			return
		}
		console.log(`\nJá existe o usuário ${existente.nome} (${email}).`)
		if (!(await confirmar("Promover para administrador?"))) {
			console.log("Cancelado.")
			return
		}
		await existente.update({ tipo: "admin" })
		console.log(`\nPronto: ${existente.nome} agora é administrador.`)
		console.log("No próximo login, o código de verificação vai para esse e-mail.")
		return
	}

	const nome = await perguntar("Nome: ")
	const cpf = await perguntar("CPF: ")
	const senha = await perguntar("Senha (mínimo 6 caracteres): ", { oculto: true })
	const confirmarSenha = await perguntar("Repita a senha: ", { oculto: true })
	if (senha !== confirmarSenha) throw new Error("As senhas não são iguais")

	// usa as mesmas validações do cadastro (CPF, e-mail único, senha) e depois promove
	const criado = await usuarioService.cadastrar({ nome, email, senha, cpf })
	await Usuario.update({ tipo: "admin" }, { where: { codUsuario: criado.codUsuario } })

	console.log(`\nPronto: administrador ${criado.nome} criado (código ${criado.codUsuario}).`)
	console.log("No login, depois da senha, vai ser pedido o código enviado para esse e-mail.")
	if (!process.env.SMTP_HOST) {
		console.log("Atenção: SMTP_HOST está vazio no .env, então o código vai aparecer no console do servidor.")
	}
}

main()
	.then(() => (process.exitCode = 0))
	.catch((err) => {
		console.error(`\nErro: ${err.message}`)
		process.exitCode = 1
	})
	.finally(async () => {
		rl.close()
		await conn.close()
	})
