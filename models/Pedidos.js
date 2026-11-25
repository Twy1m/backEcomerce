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
			},
			// o padrão do Sequelize é CASCADE (apagar o usuário apagaria os pedidos dele).
			// RESTRICT faz o banco recusar apagar um usuário que tem pedidos.
			onDelete: "RESTRICT"
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
