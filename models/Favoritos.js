const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Favorito = conn.define(
	"favorito",
	{
		codFavorito: {
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
		},
		idProduto: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: "produtos",
				key: "codProduto"
			}
		}
	},
	{
		tableName: "favoritos",
		timestamps: false
	}
)

module.exports = Favorito
