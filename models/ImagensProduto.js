const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const ImgProduto = conn.define(
	"imgProduto",
	{
		codImg: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			allowNull: false
		},
		idProduto: {
			type: DataTypes.TEXT,
			allowNull: false,
			references: {
				key: 'codProduto',
				model: 'produtos'
			}
		},
		urlImagem: {
			type: DataTypes.STRING(150),
			allowNull:false
		}
	},
	{
		tableName: "imgProdutos",
		timesamps: false
	}
)

module.exports = ImgProduto
