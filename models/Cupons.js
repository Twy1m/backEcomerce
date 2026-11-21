const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Cupom = conn.define(
	"cupom",
	{
		codCupom: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		codigo: {
			type: DataTypes.STRING(50),
			allowNull: false
		},
		desconto: {
			type: DataTypes.DECIMAL(5, 2),
			allowNull: false
		},
		validade: {
			type: DataTypes.DATE,
			allowNull: false
		},
		usos: {
			type: DataTypes.INTEGER,
			allowNull: false
		},
		ativo: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: true
		}
	},
	{
		tableName: "cupons",
		timestamps: false,
		// código único (índice com nome fixo para o sync não duplicar)
		indexes: [
			{ name: "cupons_codigo_unique", unique: true, fields: ["codigo"] }
		]
	}
)

module.exports = Cupom
