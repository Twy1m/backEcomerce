const { DataTypes } = require("sequelize")
const conn = require("../db/conn")

// Um usuário pode ter vários endereços (casa, trabalho...). Um deles é o principal,
// que o front usa como padrão na hora de comprar.
const Endereco = conn.define(
	"endereco",
	{
		codEndereco: {
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
		// nome opcional para o usuário reconhecer o endereço: "Casa", "Trabalho"
		apelido: {
			type: DataTypes.STRING(50),
			allowNull: true
		},
		// só os 8 dígitos, sem traço
		cep: {
			type: DataTypes.CHAR(8),
			allowNull: false
		},
		logradouro: {
			type: DataTypes.STRING(150),
			allowNull: false
		},
		// texto porque existe "S/N", "12A"...
		numero: {
			type: DataTypes.STRING(20),
			allowNull: false
		},
		complemento: {
			type: DataTypes.STRING(100),
			allowNull: true
		},
		bairro: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		cidade: {
			type: DataTypes.STRING(100),
			allowNull: false
		},
		// sigla do estado: "SP", "RS"...
		estado: {
			type: DataTypes.CHAR(2),
			allowNull: false
		},
		principal: {
			type: DataTypes.BOOLEAN,
			allowNull: false,
			defaultValue: false
		}
	},
	{
		tableName: "enderecos",
		timestamps: false,
		indexes: [{ name: "enderecos_idUsuario", fields: ["idUsuario"] }]
	}
)

module.exports = Endereco
