/**
 * Configuração do banco de dados MySQL
 *
 * Pool de conexões com tipagem TypeScript
 */

import mysql from 'mysql2/promise';

/**
 * Configuração do pool de conexões MySQL
 */
export const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASS || '',
  database: process.env.DB_NAME || 'clientes_db',
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
  queueLimit: 0,
  timezone: '+00:00', // UTC para consistência
  connectTimeout: 10000, // 10 segundos
  charset: 'utf8mb4'
};

/**
 * Cria e retorna o pool de conexões MySQL
 */
export function createDatabasePool(): mysql.Pool {
  return mysql.createPool(dbConfig);
}

/**
 * Testa a conexão com o banco de dados
 */
export async function testDatabaseConnection(pool: mysql.Pool): Promise<boolean> {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Pool de conexões MySQL conectado com sucesso!');
    console.log(`📊 Configuração: ${dbConfig.connectionLimit} conexões, timezone UTC, charset utf8mb4`);
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao banco de dados:', error);
    console.error('❌ Verifique as credenciais no arquivo .env');
    return false;
  }
}
