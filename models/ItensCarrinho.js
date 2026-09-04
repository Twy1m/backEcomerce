const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const ItemCarrinho = conn.define(
	"itemCarrinho",
	{
		codItemCarrinho: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		idCarrinho: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: "carrinho",
				key: "codCarrinho"
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
		}
	},
	{
		tableName: "itens_carrinho",
		timestamps: false
	}
)

module.exports = ItemCarrinho
