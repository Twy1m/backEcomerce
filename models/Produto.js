const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Produto = conn.define(
	"produto",
	{
		codProduto: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		nome: {
			type: DataTypes.STRING(150),
			allowNull: false
		},
		descricao: {
			type: DataTypes.TEXT,
			allowNull: false
		},
		preco: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false
		},
		estoque: {
			type: DataTypes.INTEGER,
			allowNull: false
		},
		idCategoria: {
			type: DataTypes.INTEGER,
			allowNull: false,
			references: {
				model: "categorias",
				key: "codCategoria"
			}
		},
		visualizacoes: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},
		promocao: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		},
		imagem_principal: {
			type: DataTypes.STRING(255),
			allowNull: false
		}
	},
	{
		tableName: "produtos",
		timestamps: false
	}
)

module.exports = Produto
