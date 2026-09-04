const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Carrinho = conn.define(
	"carrinho",
	{
		codCarrinho: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		idUsuario: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: "usuarios",
				key: "codUsuario"
			}
		}
	},
	{
		tableName: "carrinho",
	}
)

module.exports = Carrinho
