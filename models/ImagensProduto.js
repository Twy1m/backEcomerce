const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Categoria = conn.define(
	"categoria",
	{
		codCategoria: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			allowNull: false
		},
		nome: {
			type: DataTypes.STRING(50),
			allowNull: false
		},
		descricao: {
			type: DataTypes.TEXT,
			allowNull: false
		}
	},
	{
		tableName: "categorias",
		timesamps: false
	}
)

module.exports = Categoria
