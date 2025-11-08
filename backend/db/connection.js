// backend/db/connection.js
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
    // multipleStatements removido - vulnerabilidade de SQL injection
}).promise();

// Teste de conexão inicial usando Promises
db.getConnection()
    .then(connection => {
        console.log("Pool de conexões MySQL conectado!");
        connection.release();
    })
    .catch(err => {
        console.error("Erro ao conectar ao banco de dados no startup:", err);
    });

module.exports = db; // <-- Export the pool