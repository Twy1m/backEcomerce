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
		// um carrinho por usuário (índice com nome fixo para o sync não duplicar)
		indexes: [
			{ name: "carrinho_idUsuario_unique", unique: true, fields: ["idUsuario"] }
		]
	}
)

module.exports = Carrinho
