const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

const Usuario = conn.define(
	"usuario",
	{
		codUsuario: {
			type: DataTypes.INTEGER,
			primaryKey: true,
			autoIncrement: true
		},
		nome: {
			type: DataTypes.STRING(150),
			allowNull: false
		},
		email: {
			type: DataTypes.STRING(150),
			allowNull: false,
			unique: true
		},
		senha: {
			type: DataTypes.STRING(255),
			allowNull: false
		},
		cpf: {
			type: DataTypes.STRING(14),
			allowNull: false,
			unique: true
		},
		tipo: {
			type: DataTypes.ENUM("admin", "user"),
			allowNull: false,
			defaultValue: "user"
		}
	},
	{
		tableName: "usuarios",
		timestamps: false
	}
)

module.exports = Usuario
