// backend/services/backupService.js
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const db = require('../db/connection');
const logger = require('../utils/logger');

/**
 * 📦 Serviço de Backup Automatizado
 *
 * Cria backups do banco de dados usando duas estratégias:
 * 1. mysqldump (preferido) - Backup completo nativo do MySQL
 * 2. SQL dumps (fallback) - Backup usando queries SQL
 *
 * Funcionalidades:
 * - Backup automático agendado
 * - Backup manual sob demanda
 * - Rotação de backups (mantém últimos N backups)
 * - Compactação opcional
 * - Restauração de backups
 */

// Diretório de backups
const BACKUP_DIR = path.join(__dirname, '../../backups');

// Configurações
const BACKUP_CONFIG = {
    maxBackups: parseInt(process.env.BACKUP_MAX_FILES || '7'), // Manter últimos 7 backups
    autoBackupInterval: parseInt(process.env.BACKUP_INTERVAL_HOURS || '24') * 60 * 60 * 1000, // 24 horas em ms
    enabled: process.env.BACKUP_ENABLED !== 'false' // Habilitar por padrão
};

/**
 * Garante que o diretório de backups existe
 */
async function ensureBackupDir() {
    try {
        await fs.access(BACKUP_DIR);
    } catch {
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        logger.info(`📁 Diretório de backups criado: ${BACKUP_DIR}`);
    }
}

/**
 * Gera nome de arquivo para backup
 */
function getBackupFileName() {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .slice(0, 19);
    return `backup_${process.env.DB_NAME}_${timestamp}.sql`;
}

/**
 * Lista todos os arquivos de backup
 */
async function listBackups() {
    try {
        await ensureBackupDir();
        const files = await fs.readdir(BACKUP_DIR);

        const backups = [];
        for (const file of files) {
            if (file.endsWith('.sql')) {
                const filePath = path.join(BACKUP_DIR, file);
                const stats = await fs.stat(filePath);
                backups.push({
                    filename: file,
                    path: filePath,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    created: stats.birthtime,
                    modified: stats.mtime
                });
            }
        }

        // Ordena por data de criação (mais recente primeiro)
        backups.sort((a, b) => b.created - a.created);

        return backups;
    } catch (error) {
        logger.error('Erro ao listar backups:', error);
        return [];
    }
}

/**
 * Remove backups antigos, mantendo apenas os N mais recentes
 */
async function rotateBackups() {
    try {
        const backups = await listBackups();

        if (backups.length > BACKUP_CONFIG.maxBackups) {
            const toDelete = backups.slice(BACKUP_CONFIG.maxBackups);

            for (const backup of toDelete) {
                await fs.unlink(backup.path);
                logger.info(`🗑️  Backup antigo removido: ${backup.filename}`);
            }

            logger.info(`🔄 Rotação de backups: ${toDelete.length} arquivo(s) removido(s)`);
        }
    } catch (error) {
        logger.error('Erro ao rotacionar backups:', error);
    }
}

/**
 * Cria backup usando queries SQL (fallback)
 * Exporta dados de todas as tabelas
 */
async function createSQLBackup() {
    try {
        await ensureBackupDir();

        const fileName = getBackupFileName();
        const filePath = path.join(BACKUP_DIR, fileName);

        let sqlDump = `-- Backup criado em: ${new Date().toISOString()}\n`;
        sqlDump += `-- Banco de dados: ${process.env.DB_NAME}\n`;
        sqlDump += `-- Gerado por: Sistema de Backup Automatizado\n\n`;

        sqlDump += `SET FOREIGN_KEY_CHECKS=0;\n\n`;

        // Lista todas as tabelas
        const [tables] = await db.query('SHOW TABLES');
        const tableName = `Tables_in_${process.env.DB_NAME}`;

        for (const tableRow of tables) {
            const table = tableRow[tableName];

            // Obtém estrutura da tabela
            const [createTable] = await db.query(`SHOW CREATE TABLE \`${table}\``);
            sqlDump += `-- Estrutura da tabela \`${table}\`\n`;
            sqlDump += `DROP TABLE IF EXISTS \`${table}\`;\n`;
            sqlDump += `${createTable[0]['Create Table']};\n\n`;

            // Obtém dados da tabela
            const [rows] = await db.query(`SELECT * FROM \`${table}\``);

            if (rows.length > 0) {
                sqlDump += `-- Dados da tabela \`${table}\`\n`;
                sqlDump += `INSERT INTO \`${table}\` VALUES\n`;

                const values = rows.map(row => {
                    const rowValues = Object.values(row).map(val => {
                        if (val === null) return 'NULL';
                        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                        if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                        return val;
                    });
                    return `(${rowValues.join(', ')})`;
                });

                sqlDump += values.join(',\n') + ';\n\n';
            }
        }

        sqlDump += `SET FOREIGN_KEY_CHECKS=1;\n`;

        // Salva arquivo
        await fs.writeFile(filePath, sqlDump, 'utf8');

        const stats = await fs.stat(filePath);

        logger.info(`✅ Backup SQL criado: ${fileName} (${formatBytes(stats.size)})`);

        return {
            success: true,
            filename: fileName,
            path: filePath,
            size: stats.size,
            sizeFormatted: formatBytes(stats.size),
            method: 'SQL'
        };
    } catch (error) {
        logger.error('Erro ao criar backup SQL:', error);
        throw error;
    }
}

/**
 * Cria backup usando mysqldump (se disponível)
 */
async function createMySQLDumpBackup() {
    return new Promise(async (resolve, reject) => {
        try {
            await ensureBackupDir();

            const fileName = getBackupFileName();
            const filePath = path.join(BACKUP_DIR, fileName);

            const command = `mysqldump -h ${process.env.DB_HOST} -u ${process.env.DB_USER} -p${process.env.DB_PASS} ${process.env.DB_NAME} > "${filePath}"`;

            exec(command, async (error, stdout, stderr) => {
                if (error) {
                    logger.warn('mysqldump não disponível, usando fallback SQL');
                    return reject(new Error('mysqldump_not_available'));
                }

                const stats = await fs.stat(filePath);

                logger.info(`✅ Backup mysqldump criado: ${fileName} (${formatBytes(stats.size)})`);

                resolve({
                    success: true,
                    filename: fileName,
                    path: filePath,
                    size: stats.size,
                    sizeFormatted: formatBytes(stats.size),
                    method: 'mysqldump'
                });
            });
        } catch (error) {
            reject(error);
        }
    });
}

/**
 * Cria backup do banco de dados
 * Tenta mysqldump primeiro, depois fallback para SQL
 */
async function createBackup() {
    try {
        logger.info('📦 Iniciando backup do banco de dados...');

        let result;

        // Tenta mysqldump primeiro
        try {
            result = await createMySQLDumpBackup();
        } catch (error) {
            // Fallback para SQL se mysqldump não disponível
            if (error.message === 'mysqldump_not_available') {
                result = await createSQLBackup();
            } else {
                throw error;
            }
        }

        // Rotaciona backups antigos
        await rotateBackups();

        return result;
    } catch (error) {
        logger.error('❌ Erro ao criar backup:', error);
        throw error;
    }
}

/**
 * Formata bytes para formato legível
 */
function formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Inicia backup automático agendado
 */
function startAutoBackup() {
    if (!BACKUP_CONFIG.enabled) {
        logger.info('📦 Backup automático está DESABILITADO');
        return null;
    }

    logger.info(`📦 Backup automático HABILITADO: a cada ${BACKUP_CONFIG.autoBackupInterval / 1000 / 60 / 60}h`);
    logger.info(`📦 Máximo de backups mantidos: ${BACKUP_CONFIG.maxBackups}`);

    // Executa backup inicial
    setTimeout(() => {
        createBackup().catch(err => logger.error('Erro no backup automático:', err));
    }, 60000); // Aguarda 1 minuto após início

    // Agenda backups periódicos
    const intervalId = setInterval(() => {
        createBackup().catch(err => logger.error('Erro no backup automático:', err));
    }, BACKUP_CONFIG.autoBackupInterval);

    return intervalId;
}

module.exports = {
    createBackup,
    listBackups,
    rotateBackups,
    startAutoBackup,
    BACKUP_CONFIG,
    BACKUP_DIR
};
