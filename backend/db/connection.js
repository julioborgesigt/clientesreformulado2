// backend/db/connection.js
const mysql = require('mysql2');
const logger = require('../utils/logger');

// 🔒 SEGURANÇA E BOA PRÁTICA: Configuração robusta de conexão
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,

    // Pool de conexões
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'), // Configurável via .env
    queueLimit: 0,

    // 🔒 SEGURANÇA: Timezone UTC para consistência de datas
    // Evita problemas com horário de verão e diferenças de fuso horário
    timezone: '+00:00',

    // Timeout para evitar conexões travadas
    connectTimeout: 10000, // 10 segundos para estabelecer conexão

    // Charset para suporte adequado a caracteres especiais
    charset: 'utf8mb4',

    // multipleStatements removido - vulnerabilidade de SQL injection
}).promise();

// Teste de conexão inicial usando Promises
db.getConnection()
    .then(connection => {
        logger.info("✅ Pool de conexões MySQL conectado com sucesso!");
        logger.info(`📊 Configuração: ${process.env.DB_CONNECTION_LIMIT || '10'} conexões, timezone UTC, charset utf8mb4`);
        connection.release();
    })
    .catch(err => {
        logger.error("❌ Erro ao conectar ao banco de dados no startup:", err);
        logger.error("❌ Verifique as credenciais no arquivo .env");
        // Não faz process.exit() aqui para permitir que migrations tentem criar o DB
    });

module.exports = db; // <-- Export the pool