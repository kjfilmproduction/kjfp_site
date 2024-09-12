require('dotenv').config()
const mysql = require('mysql2')

const connectionFunction = () => {
    const connection = mysql.createPool({
        connectionLimit: 100,
        host: process.env.HOST,
        user: process.env.USER,
        password: process.env.PASSWORD,
        database: process.env.DATABASE
    })
    
    connection.on('error', err => {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { 
            console.log(Error(err))
            connectionFunction()
        } else {   
            console.log(Error(err))
        }
    })
    return connection
}

const connection = connectionFunction()

module.exports = connection