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
			allowNull: false,
			unique: true
		},
		desconto: {
			type: DataTypes.DECIMAL(5, 2),
			allowNull: false
		},
		validade: {
			type: DataTypes.DATE,
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
		timestamps: false
	}
)

module.exports = Cupom
