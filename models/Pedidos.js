const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Pedido = conn.define(
	"pedido",
	{
		codPedido: {
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
		valor_total: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false
		},
		desconto: {
			type: DataTypes.DECIMAL(10, 2),
			allowNull: false,
			defaultValue: 0
		},
		codigo_cupom: {
			type: DataTypes.STRING(50),
			allowNull: true
		},
		status: {
			type: DataTypes.ENUM("PENDENTE", "PAGO", "ENVIADO", "ENTREGUE", "CANCELADO"),
			allowNull: false,
			defaultValue: "PENDENTE"
		}
	},
	{
		tableName: "pedidos"
	}
)

module.exports = Pedido
