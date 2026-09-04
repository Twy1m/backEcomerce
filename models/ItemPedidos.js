const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const ItemPedido = conn.define(
	"itemPedido",
	{
		codItemPedido: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		idPedido: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: "pedidos",
				key: "codPedido"
			}
		},
		idProduto: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: "produtos",
				key: "codProduto"
			}
		},
		quantidade: {
			type: DataTypes.INTEGER,
			allowNull: false
		},
		preco_unitario: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false
		}
	},
	{
		tableName: "itens_pedido",
	}
)

module.exports = ItemPedido
