const Usuario = require("./Usuario")
const Categoria = require("./Categorias")
const Produto = require("./Produto")
const ImagemProduto = require("./ImagensProduto")
const Pedido = require("./Pedidos")
const ItemPedido = require("./ItemPedidos")
const Carrinho = require("./Carrinho")
const ItemCarrinho = require("./ItensCarrinho")
const Favorito = require("./Favoritos")
const Cupom = require("./Cupons")

Categoria.hasMany(Produto, {
	foreignKey: "idCategoria",
	as: "produtos"
})

Produto.belongsTo(Categoria, {
	foreignKey: "idCategoria",
	as: "categoria"
})

Produto.hasMany(ImagemProduto, {
	foreignKey: "idProduto",
	as: "imagens"
})

ImagemProduto.belongsTo(Produto, {
	foreignKey: "idProduto",
	as: "produto"
})

Usuario.hasMany(Pedido, {
	foreignKey: "idUsuario",
	as: "pedidos"
})

Pedido.belongsTo(Usuario, {
	foreignKey: "idUsuario",
	as: "usuario"
})

Pedido.hasMany(ItemPedido, {
	foreignKey: "idPedido",
	as: "itens"
})

ItemPedido.belongsTo(Pedido, {
	foreignKey: "idPedido",
	as: "pedido"
})

Produto.hasMany(ItemPedido, {
	foreignKey: "idProduto",
	as: "itensPedido"
})

ItemPedido.belongsTo(Produto, {
	foreignKey: "idProduto",
	as: "produto"
})

Pedido.belongsToMany(Produto, {
	through: ItemPedido,
	foreignKey: "idPedido",
	otherKey: "idProduto",
	as: "produtos"
})

Produto.belongsToMany(Pedido, {
	through: ItemPedido,
	foreignKey: "idProduto",
	otherKey: "idPedido",
	as: "pedidos"
})

Usuario.hasOne(Carrinho, {
	foreignKey: "idUsuario",
	as: "carrinho"
})

Carrinho.belongsTo(Usuario, {
	foreignKey: "idUsuario",
	as: "usuario"
})

Carrinho.hasMany(ItemCarrinho, {
	foreignKey: "idCarrinho",
	as: "itens"
})

ItemCarrinho.belongsTo(Carrinho, {
	foreignKey: "idCarrinho",
	as: "carrinho"
})

Produto.hasMany(ItemCarrinho, {
	foreignKey: "idProduto",
	as: "itensCarrinho"
})

ItemCarrinho.belongsTo(Produto, {
	foreignKey: "idProduto",
	as: "produto"
})

Carrinho.belongsToMany(Produto, {
	through: ItemCarrinho,
	foreignKey: "idCarrinho",
	otherKey: "idProduto",
	as: "produtos"
})

Produto.belongsToMany(Carrinho, {
	through: ItemCarrinho,
	foreignKey: "idProduto",
	otherKey: "idCarrinho",
	as: "carrinhos"
})

Usuario.hasMany(Favorito, {
	foreignKey: "idUsuario",
	as: "favoritos"
})

Favorito.belongsTo(Usuario, {
	foreignKey: "idUsuario",
	as: "usuario"
})

Produto.hasMany(Favorito, {
	foreignKey: "idProduto",
	as: "favoritos"
})

Favorito.belongsTo(Produto, {
	foreignKey: "idProduto",
	as: "produto"
})

Usuario.belongsToMany(Produto, {
	through: Favorito,
	foreignKey: "idUsuario",
	otherKey: "idProduto",
	as: "produtosFavoritos"
})

Produto.belongsToMany(Usuario, {
	through: Favorito,
	foreignKey: "idProduto",
	otherKey: "idUsuario",
	as: "usuariosFavoritaram"
})

module.exports = {
	Usuario,
	Categoria,
	Produto,
	ImagemProduto,
	Pedido,
	ItemPedido,
	Carrinho,
	ItemCarrinho,
	Favorito,
	Cupom
}
