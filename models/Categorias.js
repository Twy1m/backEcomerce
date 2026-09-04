const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Categoria = conn.define(
	"categoria",
	{
		codCategoria: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		nome: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		descricao: {
			type: DataTypes.TEXT,
			allowNull: false
		}
	},
	{
		tableName: "categorias",
		timestamps: false
	}
)

module.exports = Categoria
