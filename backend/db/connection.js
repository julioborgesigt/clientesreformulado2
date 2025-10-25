// backend/db/connection.js
const mysql = require('mysql2');

const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
}).promise(); // <-- Only here

// Optional: Keep this initial check or remove if causing issues on deploy
db.getConnection((err) => { 
    if (err) {
      console.error("Erro ao conectar ao banco de dados no startup:", err);
    } else {
      console.log("Pool de conexões MySQL conectado!");
    }
});

module.exports = db; // <-- Export the pool