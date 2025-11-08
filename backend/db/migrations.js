// backend/db/migrations.js
const db = require('./connection');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');

/**
 * Verifica se a tabela refresh_tokens existe
 */
async function checkRefreshTokensTable() {
    try {
        const [tables] = await db.query(
            "SHOW TABLES LIKE 'refresh_tokens'"
        );
        return tables.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar tabela refresh_tokens:', error);
        return false;
    }
}

/**
 * Cria a tabela refresh_tokens executando a migration SQL
 */
async function createRefreshTokensTable() {
    try {
        logger.info('Criando tabela refresh_tokens...');

        const sqlPath = path.join(__dirname, '../../database/migrations/create_refresh_tokens.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comentários SQL
        const cleanSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        // Executa a migration
        await db.query(cleanSql);

        logger.info('✓ Tabela refresh_tokens criada com sucesso');
        return true;
    } catch (error) {
        logger.error('Erro ao criar tabela refresh_tokens:', error);
        return false;
    }
}

/**
 * Executa todas as migrations necessárias
 */
async function runMigrations() {
    try {
        logger.info('Verificando migrations...');

        // Verifica e cria tabela refresh_tokens se necessário
        const tableExists = await checkRefreshTokensTable();

        if (!tableExists) {
            logger.warn('Tabela refresh_tokens não encontrada. Criando...');
            await createRefreshTokensTable();
        } else {
            logger.info('✓ Tabela refresh_tokens já existe');
        }

        logger.info('✓ Migrations concluídas');
    } catch (error) {
        logger.error('Erro ao executar migrations:', error);
        // Não interrompe a aplicação se migrations falharem
        logger.warn('⚠ Aplicação continuará sem algumas funcionalidades (refresh tokens)');
    }
}

module.exports = {
    runMigrations,
    checkRefreshTokensTable,
    createRefreshTokensTable
};
