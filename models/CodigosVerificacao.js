const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

// Códigos de uso único enviados por e-mail (hoje só a verificação em duas etapas do login de admin).
// O código em si nunca é salvo: só o hash dele.
const CodigoVerificacao = conn.define(
	"codigoVerificacao",
	{
		codCodigo: {
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
		// para que serve o código (dá para reaproveitar a tabela em "esqueci a senha", por exemplo)
		finalidade: {
			type: DataTypes.ENUM("LOGIN_ADMIN"),
			allowNull: false
		},
		// HMAC-SHA256 do código em hexadecimal
		codigoHash: {
			type: DataTypes.CHAR(64),
			allowNull: false
		},
		expiraEm: {
			type: DataTypes.DATE,
			allowNull: false
		},
		// erros de digitação; no limite, o código para de valer
		tentativas: {
			type: DataTypes.INTEGER,
			allowNull: false,
			defaultValue: 0
		},
		// preenchido quando o código é usado (ou invalidado por um reenvio)
		usadoEm: {
			type: DataTypes.DATE,
			allowNull: true
		},
		criadoEm: {
			type: DataTypes.DATE,
			allowNull: false,
			defaultValue: DataTypes.NOW
		}
	},
	{
		tableName: "codigos_verificacao",
		timestamps: false,
		indexes: [{ name: "codigos_verificacao_usuario_finalidade", fields: ["idUsuario", "finalidade", "criadoEm"] }]
	}
)

module.exports = CodigoVerificacao
