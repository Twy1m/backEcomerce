const Sequelize = require("sequelize")

const conn = new Sequelize("artlist", "root", "senai", {
	host: "localhost",
	dialect: "mysql",
	port: 3306
})

module.exports = conn
