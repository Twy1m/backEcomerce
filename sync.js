const { Usuario, Categoria, Produto, ImagemProduto, Pedido, ItemPedido, Carrinho, ItemCarrinho, Favorito, Cupom } = require('./models/rel')
const conn = require('./db/conn')
async function syncDataBase() {
    try{
        await conn.sync({ alter: true })
        console.log('iniciando sinc')
    }catch(err){
        console.error('erro ao sincronizar tabelas', err)
    }finally{
        await conn.close()
        console.log("finalizando sinc")
    }
}

syncDataBase()