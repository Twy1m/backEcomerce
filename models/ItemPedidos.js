const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Pedido = conn.define(
	"pedido",
	{
		codImg: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			allowNull: false
		},
		idUsuario: {
			type: DataTypes.TEXT,
			allowNull: false,
			references: {
				key: "codUsuario",
				model: "usuarios"
			}
		},
		valorTotal: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false
		},
		status: {
			type: DataTypes.ENUM("PENDENTE", "PAGO"),
			allowNull: false
		},
		data: {
			type: DataTypes.DATE,
			allowNull: false
		}
	},
	{
		tableName: "pedidos"
	}
)

module.exports = Pedido
