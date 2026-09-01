const Sequelize = require('sequelize')

const conn = require('artlist', 'root', 'senai', {
    hostname: 'localhost',
    dialect: 'mysql',
    port: 3306
})

module.exports = conn
