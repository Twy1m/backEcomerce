const { DataTypes } = require('sequelize')
const conn = require('../db/conn')

const Usuario = conn.define('usuario', {
    codUsuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        allowNull:false
    },
    nome: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    sobrenome: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    senha: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    cpf: {
        type: DataTypes.STRING(15),
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM("USER", "ADMIN"),
        allowNull: false
    }
}, {
    tableName: 'usuarios',
    timesamps: false
})

module.exports = Usuario