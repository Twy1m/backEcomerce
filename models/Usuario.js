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
			allowNull: false
		},
		senha: {
			type: DataTypes.STRING(255),
			allowNull: false
		},
		cpf: {
			type: DataTypes.STRING(14),
			allowNull: false
		},
		tipo: {
			type: DataTypes.ENUM("admin", "user"),
			allowNull: false,
			defaultValue: "user"
		},
		// bloqueio da conta de admin depois de várias senhas erradas (ver auth.service)
		falhasLogin: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},
		bloqueadoAte: {
			type: DataTypes.DATE,
			allowNull: true
		}
	},
	{
		tableName: "usuarios",
		timestamps: false,
		indexes: [
			{ name: "usuarios_email_unique", unique: true, fields: ["email"] },
			{ name: "usuarios_cpf_unique", unique: true, fields: ["cpf"] }
		]
	}
)

module.exports = Usuario

// e-mail e CPF únicos. Ficam aqui, com nome fixo, e não como "unique: true" no campo,
// porque o sync({ alter: true }) cria um índice repetido a cada execução nesse caso.