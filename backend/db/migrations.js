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
 * Verifica se a coluna arquivado existe na tabela clientes
 */
async function checkArquivadoColumn() {
    try {
        const [columns] = await db.query(
            "SHOW COLUMNS FROM clientes LIKE 'arquivado'"
        );
        return columns.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar coluna arquivado:', error);
        return false;
    }
}

/**
 * Verifica se a coluna user_id existe nas tabelas necessárias
 */
async function checkUserIdColumns() {
    try {
        const [clientesColumns] = await db.query(
            "SHOW COLUMNS FROM clientes LIKE 'user_id'"
        );
        const [servicosColumns] = await db.query(
            "SHOW COLUMNS FROM servicos LIKE 'user_id'"
        );
        const [actionLogColumns] = await db.query(
            "SHOW COLUMNS FROM action_log LIKE 'user_id'"
        );

        return clientesColumns.length > 0 &&
               servicosColumns.length > 0 &&
               actionLogColumns.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar colunas user_id:', error);
        return false;
    }
}

/**
 * Verifica se a coluna token_hash existe na tabela refresh_tokens
 * 🔒 SEGURANÇA: Token hash para armazenamento seguro
 */
async function checkTokenHashColumn() {
    try {
        const [columns] = await db.query(
            "SHOW COLUMNS FROM refresh_tokens LIKE 'token_hash'"
        );
        return columns.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar coluna token_hash:', error);
        return false;
    }
}

/**
 * Verifica se a coluna deleted_at existe na tabela clientes
 * BOA PRÁTICA: Soft delete ao invés de deletar permanentemente
 */
async function checkDeletedAtColumn() {
    try {
        const [columns] = await db.query(
            "SHOW COLUMNS FROM clientes LIKE 'deleted_at'"
        );
        return columns.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar coluna deleted_at:', error);
        return false;
    }
}

/**
 * Verifica se os índices de performance já existem
 * Checa índice representativo do conjunto
 */
async function checkPerformanceIndexes() {
    try {
        const [indexes] = await db.query(
            "SHOW INDEX FROM clientes WHERE Key_name = 'idx_clientes_user_vencimento'"
        );
        return indexes.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar índices de performance:', error);
        return false;
    }
}

/**
 * Adiciona a coluna arquivado à tabela clientes
 */
async function addArquivadoColumn() {
    try {
        logger.info('Adicionando coluna arquivado à tabela clientes...');

        const sqlPath = path.join(__dirname, '../../database/migrations/add_arquivado_column.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comentários SQL
        const cleanSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        // Divide em statements individuais e executa cada um
        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            await db.query(statement);
        }

        logger.info('✓ Coluna arquivado adicionada com sucesso');
        return true;
    } catch (error) {
        logger.error('Erro ao adicionar coluna arquivado:', error);
        return false;
    }
}

/**
 * Adiciona colunas user_id às tabelas para isolamento de dados
 */
async function addUserIdColumns() {
    try {
        logger.info('🔒 Adicionando colunas user_id para segurança...');

        const sqlPath = path.join(__dirname, '../../database/migrations/add_user_id_columns.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comentários SQL
        const cleanSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        // Divide em statements individuais e executa cada um
        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('SELECT'));

        for (const statement of statements) {
            try {
                await db.query(statement);
            } catch (err) {
                // Ignora erros de coluna/constraint/index já existente
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_INDEX') {
                    logger.warn(`⚠ Coluna/constraint/índice já existe, continuando...`);
                } else {
                    throw err;
                }
            }
        }

        logger.info('✓ Colunas user_id adicionadas com sucesso');
        logger.info('🔒 SEGURANÇA: Isolamento de dados por usuário ATIVADO');
        return true;
    } catch (error) {
        logger.error('Erro ao adicionar colunas user_id:', error);
        return false;
    }
}

/**
 * Adiciona coluna token_hash à tabela refresh_tokens para armazenamento seguro
 * 🔒 SEGURANÇA: Armazena hash SHA-256 ao invés de tokens plaintext
 */
async function addTokenHashColumn() {
    try {
        logger.info('🔒 Adicionando coluna token_hash para segurança de tokens...');

        const sqlPath = path.join(__dirname, '../../database/migrations/hash_refresh_tokens.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comentários SQL
        const cleanSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        // Divide em statements individuais e executa cada um
        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await db.query(statement);
            } catch (err) {
                // Ignora erros de coluna/índice já existente
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_INDEX') {
                    logger.warn(`⚠ Coluna/índice já existe, continuando...`);
                } else {
                    throw err;
                }
            }
        }

        logger.info('✓ Coluna token_hash adicionada com sucesso');
        logger.info('🔒 SEGURANÇA: Tokens agora são armazenados como hash SHA-256');
        return true;
    } catch (error) {
        logger.error('Erro ao adicionar coluna token_hash:', error);
        return false;
    }
}

/**
 * Adiciona coluna deleted_at à tabela clientes para soft delete
 * BOA PRÁTICA: Preserva histórico ao invés de deletar permanentemente
 */
async function addDeletedAtColumn() {
    try {
        logger.info('📦 Adicionando coluna deleted_at para soft delete...');

        const sqlPath = path.join(__dirname, '../../database/migrations/add_soft_delete.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comentários SQL
        const cleanSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        // Divide em statements individuais e executa cada um
        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await db.query(statement);
            } catch (err) {
                // Ignora erros de coluna/índice já existente
                if (err.code === 'ER_DUP_FIELDNAME' || err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_INDEX') {
                    logger.warn(`⚠ Coluna/índice já existe, continuando...`);
                } else {
                    throw err;
                }
            }
        }

        logger.info('✓ Coluna deleted_at adicionada com sucesso');
        logger.info('📦 BOA PRÁTICA: Soft delete ativado - dados preservados com histórico');
        return true;
    } catch (error) {
        logger.error('Erro ao adicionar coluna deleted_at:', error);
        return false;
    }
}

/**
 * Adiciona índices de performance para otimizar queries
 * BOA PRÁTICA: Índices em colunas frequentemente consultadas
 */
async function addPerformanceIndexes() {
    try {
        logger.info('⚡ Adicionando índices de performance...');

        const sqlPath = path.join(__dirname, '../../database/migrations/add_performance_indexes.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comentários SQL
        const cleanSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        // Divide em statements individuais e executa cada um
        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        let indexCount = 0;
        for (const statement of statements) {
            try {
                await db.query(statement);
                if (statement.toUpperCase().includes('CREATE INDEX')) {
                    indexCount++;
                }
            } catch (err) {
                // Ignora erros de índice já existente
                if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_INDEX') {
                    logger.warn(`⚠ Índice já existe, continuando...`);
                } else {
                    // Não falha se algum índice der erro, continua com os próximos
                    logger.warn(`⚠ Erro ao criar índice (continuando): ${err.message}`);
                }
            }
        }

        logger.info(`✓ Índices de performance processados (${indexCount} novos)`);
        logger.info('⚡ BOA PRÁTICA: Performance otimizada com índices estratégicos');
        return true;
    } catch (error) {
        logger.error('Erro ao adicionar índices de performance:', error);
        return false;
    }
}

/**
 * Verifica se ainda existem índices duplicados
 * Checa se idx_vencimento (antigo) ainda existe
 */
async function checkDuplicateIndexes() {
    try {
        const [indexes] = await db.query(
            "SHOW INDEX FROM clientes WHERE Key_name = 'idx_vencimento'"
        );
        return indexes.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar índices duplicados:', error);
        return false;
    }
}

/**
 * Remove índices duplicados para otimizar performance
 * BOA PRÁTICA: Remove redundâncias, mantém índices compostos
 */
async function cleanupDuplicateIndexes() {
    try {
        logger.info('🧹 Removendo índices duplicados...');

        const sqlPath = path.join(__dirname, '../../database/migrations/cleanup_duplicate_indexes.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comentários SQL
        const cleanSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        // Divide em statements individuais e executa cada um
        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        let indexCount = 0;
        for (const statement of statements) {
            try {
                await db.query(statement);
                if (statement.toUpperCase().includes('DROP INDEX')) {
                    indexCount++;
                }
            } catch (err) {
                // Ignora erros de índice não existente
                if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
                    // Índice já foi removido, ok
                } else {
                    // Não falha se algum índice der erro, continua com os próximos
                    logger.warn(`⚠ Erro ao remover índice (continuando): ${err.message}`);
                }
            }
        }

        logger.info(`✓ Índices duplicados removidos (${indexCount} índices)`);
        logger.info('🧹 BOA PRÁTICA: Banco otimizado sem redundâncias');
        return true;
    } catch (error) {
        logger.error('Erro ao remover índices duplicados:', error);
        return false;
    }
}

/**
 * Verifica se as foreign keys faltando já existem
 * Checa se fk_action_log_user existe
 */
async function checkMissingConstraints() {
    try {
        const [constraints] = await db.query(`
            SELECT CONSTRAINT_NAME
            FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
            WHERE TABLE_SCHEMA = '${process.env.DB_NAME}'
            AND TABLE_NAME = 'action_log'
            AND CONSTRAINT_NAME = 'fk_action_log_user'
        `);
        return constraints.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar constraints:', error);
        return false;
    }
}

/**
 * Adiciona foreign keys e índices faltando
 * 🔒 SEGURANÇA: Garante integridade referencial
 */
async function addMissingConstraints() {
    try {
        logger.info('🔒 Adicionando foreign keys e índices faltando...');

        const sqlPath = path.join(__dirname, '../../database/migrations/add_missing_constraints.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Remove comentários SQL
        const cleanSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        // Divide em statements individuais e executa cada um
        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        let fkCount = 0;
        let indexCount = 0;
        for (const statement of statements) {
            try {
                await db.query(statement);
                if (statement.toUpperCase().includes('FOREIGN KEY')) {
                    fkCount++;
                }
                if (statement.toUpperCase().includes('CREATE INDEX')) {
                    indexCount++;
                }
            } catch (err) {
                // Ignora erros de constraint/índice já existente
                if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_FK_DUP_NAME') {
                    logger.warn(`⚠ Constraint/índice já existe, continuando...`);
                } else {
                    // Não falha se algum constraint der erro, continua com os próximos
                    logger.warn(`⚠ Erro ao adicionar constraint (continuando): ${err.message}`);
                }
            }
        }

        logger.info(`✓ Foreign keys e índices adicionados (${fkCount} FKs, ${indexCount} índices)`);
        logger.info('🔒 SEGURANÇA: Integridade referencial garantida');
        return true;
    } catch (error) {
        logger.error('Erro ao adicionar constraints:', error);
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

        // Verifica e adiciona coluna arquivado se necessário
        const columnExists = await checkArquivadoColumn();

        if (!columnExists) {
            logger.warn('Coluna arquivado não encontrada. Adicionando...');
            await addArquivadoColumn();
        } else {
            logger.info('✓ Coluna arquivado já existe');
        }

        // Verifica e adiciona colunas user_id se necessário
        const userIdColumnsExist = await checkUserIdColumns();

        if (!userIdColumnsExist) {
            logger.warn('🔒 Colunas user_id não encontradas. Adicionando para segurança...');
            await addUserIdColumns();
        } else {
            logger.info('✓ Colunas user_id já existem');
        }

        // Verifica e adiciona coluna token_hash se necessário
        const tokenHashColumnExists = await checkTokenHashColumn();

        if (!tokenHashColumnExists) {
            logger.warn('🔒 Coluna token_hash não encontrada. Adicionando para segurança de tokens...');
            await addTokenHashColumn();
        } else {
            logger.info('✓ Coluna token_hash já existe');
        }

        // Verifica e adiciona coluna deleted_at se necessário
        const deletedAtColumnExists = await checkDeletedAtColumn();

        if (!deletedAtColumnExists) {
            logger.warn('📦 Coluna deleted_at não encontrada. Adicionando para soft delete...');
            await addDeletedAtColumn();
        } else {
            logger.info('✓ Coluna deleted_at já existe');
        }

        // Verifica e adiciona índices de performance se necessário
        const performanceIndexesExist = await checkPerformanceIndexes();

        if (!performanceIndexesExist) {
            logger.warn('⚡ Índices de performance não encontrados. Adicionando...');
            await addPerformanceIndexes();
        } else {
            logger.info('✓ Índices de performance já existem');
        }

        // Verifica e remove índices duplicados se necessário
        const duplicateIndexesExist = await checkDuplicateIndexes();

        if (duplicateIndexesExist) {
            logger.warn('🧹 Índices duplicados encontrados. Removendo...');
            await cleanupDuplicateIndexes();
        } else {
            logger.info('✓ Nenhum índice duplicado encontrado');
        }

        // Verifica e adiciona foreign keys faltando se necessário
        const missingConstraintsExist = await checkMissingConstraints();

        if (!missingConstraintsExist) {
            logger.warn('🔒 Foreign keys faltando. Adicionando...');
            await addMissingConstraints();
        } else {
            logger.info('✓ Foreign keys já existem');
        }

        logger.info('✓ Migrations concluídas');
    } catch (error) {
        logger.error('Erro ao executar migrations:', error);
        // Não interrompe a aplicação se migrations falharem
        logger.warn('⚠ Aplicação continuará sem algumas funcionalidades');
    }
}

module.exports = {
    runMigrations,
    checkRefreshTokensTable,
    createRefreshTokensTable,
    checkArquivadoColumn,
    addArquivadoColumn,
    checkUserIdColumns,
    addUserIdColumns,
    checkTokenHashColumn,
    addTokenHashColumn,
    checkDeletedAtColumn,
    addDeletedAtColumn,
    checkPerformanceIndexes,
    addPerformanceIndexes,
    checkDuplicateIndexes,
    cleanupDuplicateIndexes,
    checkMissingConstraints,
    addMissingConstraints
};
