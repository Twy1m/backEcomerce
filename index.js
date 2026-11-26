require('dotenv').config()

const express = require('express')
const cors = require('cors')
const conn = require('./db/conn')
const app = express()

const authRouter = require('./routes/auth.routes')
const categoriaRouter = require('./routes/categoria.routes')
const usuarioRouter = require('./routes/usuario.routes')
const produtoRouter = require('./routes/produto.routes')
const favoritoRouter = require('./routes/favorito.routes')
const carrinhoRouter = require('./routes/carrinho.routes')
const cupomRouter = require('./routes/cupom.routes')
const pedidoRouter = require('./routes/pedido.routes')
const enderecoRouter = require('./routes/endereco.routes')

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())

app.get('/', (req, res) => {
	res.status(200).json({ message: 'API Artlist funcionando' })
})


app.use('/auth', authRouter)
app.use('/usuarios', usuarioRouter)
app.use('/categorias', categoriaRouter)
app.use('/produtos', produtoRouter)
app.use('/favoritos', favoritoRouter)
app.use('/carrinho', carrinhoRouter)
app.use('/cupons', cupomRouter)
app.use('/pedidos', pedidoRouter)
app.use('/enderecos', enderecoRouter)


app.use((req, res) => {
	res.status(404).json({ message: 'Rota não encontrada' })
})

const PORT = process.env.PORT || 3000

conn.authenticate()
	.then(() => {
		app.listen(PORT, () => {
			console.log(`Servidor rodando em http://localhost:${PORT}`)
		})
	})
	.catch((err) => {
		console.error('Erro ao conectar no banco:', err.message)
	})
