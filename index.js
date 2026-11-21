require('dotenv').config()

const express = require('express')
const cors = require('cors')
const conn = require('./db/conn')
const app = express()

const authRouter = require('./routes/auth.routes')
const categoriaRouter = require('./routes/categoria.routes')
const usuarioRouter = require('./routes/usuario.routes')

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())

// Rota de teste: confere se o servidor está no ar
app.get('/', (req, res) => {
	res.status(200).json({ message: 'API Artlist funcionando' })
})

// Cada router recebe um "prefixo". As rotas de dentro do arquivo são somadas a ele:
// router.post('/login') em auth.routes  →  POST /auth/login
app.use('/auth', authRouter)
app.use('/usuarios', usuarioRouter)
app.use('/categorias', categoriaRouter)

// Qualquer rota que não existe cai aqui
app.use((req, res) => {
	res.status(404).json({ message: 'Rota não encontrada' })
})

const PORT = process.env.PORT || 3000

// Só sobe o servidor depois de confirmar que o banco conectou
conn.authenticate()
	.then(() => {
		app.listen(PORT, () => {
			console.log(`Servidor rodando em http://localhost:${PORT}`)
		})
	})
	.catch((err) => {
		console.error('Erro ao conectar no banco:', err.message)
	})
