const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Produto = conn.define(
	"produto",
	{
		codProduto: {
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
			type: DataTypes.STRING(15),
			allowNull: false,
            references: {
                model: 'categorias',
                key: 'codCategoria'
            }
		},
		visualizacoes: {
			type: DataTypes.INTEGER("USER", "ADMIN"),
			allowNull: false
		},
		desconto: {
			type: DataTypes.DECIMAL(1,2),
			allowNull: false
		},
        imgPrincipal: {
            type: DataTypes.TEXT,
            allowNull: false
        }
	},
	{
		tableName: "produtos",
		timesamps: false
	}
)

module.exports = Produto
