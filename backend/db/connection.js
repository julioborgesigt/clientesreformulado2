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
    multipleStatements: true // Necessário para a rota de stats
}).promise(); // <--- Adicione .promise() aqui para usar async/await nas rotas

db.getConnection((err) => { // A verificação inicial pode usar o callback normal
    if (err) {
      console.error("Erro ao conectar ao banco de dados:", err);
      process.exit(1); // Encerra a aplicação se não conectar
    } else {
      console.log("Conectado ao banco de dados MySQL!");
    }
});

module.exports = db; // Exporta o pool com Promises habilitadas