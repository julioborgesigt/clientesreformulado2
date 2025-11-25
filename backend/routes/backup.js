// backend/routes/backup.js
const express = require('express');
const router = express.Router();
const {
    createBackup,
    listBackups,
    BACKUP_CONFIG,
    BACKUP_DIR
} = require('../services/backupService');
const logger = require('../utils/logger');
const fs = require('fs').promises;
const path = require('path');
const os = require('os');

/**
 * 📦 Rotas de Backup
 *
 * Todas as rotas requerem autenticação de admin
 * (Adicionar middleware de admin quando implementado)
 */

/**
 * GET /backup - Lista todos os backups disponíveis
 */
router.get('/', async (req, res) => {
    try {
        const backups = await listBackups();

        logger.info(`📋 Listagem de backups solicitada. Total: ${backups.length}, Enabled: ${BACKUP_CONFIG.enabled}, MaxBackups: ${BACKUP_CONFIG.maxBackups}`);

        res.json({
            success: true,
            count: backups.length,
            maxBackups: BACKUP_CONFIG.maxBackups,
            autoBackupEnabled: BACKUP_CONFIG.enabled,
            backupDir: BACKUP_DIR,
            backups: backups,
            // Campos adicionais para compatibilidade com frontend
            config: {
                enabled: BACKUP_CONFIG.enabled,
                retention: BACKUP_CONFIG.maxBackups,
                intervalHours: BACKUP_CONFIG.autoBackupInterval / 1000 / 60 / 60
            }
        });
    } catch (error) {
        logger.error('Erro ao listar backups:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao listar backups',
            message: error.message
        });
    }
});

/**
 * POST /backup - Cria novo backup manualmente
 */
router.post('/', async (req, res) => {
    try {
        logger.info('📦 Backup manual solicitado');

        const result = await createBackup();

        res.json({
            success: true,
            message: 'Backup criado com sucesso',
            backup: result
        });
    } catch (error) {
        logger.error('Erro ao criar backup:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao criar backup',
            message: error.message
        });
    }
});

/**
 * GET /backup/admin/dashboard - Retorna informações completas para o painel de admin
 * ⚠️ IMPORTANTE: Esta rota DEVE vir ANTES de /:filename para não ser capturada por ela
 */
router.get('/admin/dashboard', async (req, res) => {
    try {
        const backups = await listBackups();
        const used = process.memoryUsage();
        const totalMemory = os.totalmem();
        const freeMemory = os.freemem();

        res.json({
            success: true,
            system: {
                memory: {
                    process: {
                        heapUsed: Math.round(used.heapUsed / 1024 / 1024), // MB
                        heapTotal: Math.round(used.heapTotal / 1024 / 1024), // MB
                        rss: Math.round(used.rss / 1024 / 1024), // MB
                    },
                    system: {
                        total: Math.round(totalMemory / 1024 / 1024 / 1024 * 100) / 100, // GB
                        free: Math.round(freeMemory / 1024 / 1024 / 1024 * 100) / 100, // GB
                        used: Math.round((totalMemory - freeMemory) / 1024 / 1024 / 1024 * 100) / 100, // GB
                        usagePercent: Math.round(((totalMemory - freeMemory) / totalMemory) * 100)
                    }
                },
                platform: os.platform(),
                cpus: os.cpus().length,
                nodeVersion: process.version
            },
            backup: {
                enabled: BACKUP_CONFIG.enabled,
                maxBackups: BACKUP_CONFIG.maxBackups,
                intervalHours: BACKUP_CONFIG.autoBackupInterval / 1000 / 60 / 60,
                currentBackupsCount: backups.length,
                latestBackup: backups.length > 0 ? backups[0] : null
            }
        });
    } catch (error) {
        logger.error('Erro ao obter informações do dashboard:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter informações do sistema',
            message: error.message
        });
    }
});

/**
 * GET /backup/config/status - Retorna status e configuração do backup
 * ⚠️ IMPORTANTE: Esta rota DEVE vir ANTES de /:filename para não ser capturada por ela
 */
router.get('/config/status', (req, res) => {
    logger.info(`📊 Configuração de backup solicitada. BACKUP_CONFIG:`, {
        enabled: BACKUP_CONFIG.enabled,
        maxBackups: BACKUP_CONFIG.maxBackups,
        intervalHours: BACKUP_CONFIG.autoBackupInterval / 1000 / 60 / 60
    });

    res.json({
        success: true,
        config: {
            enabled: BACKUP_CONFIG.enabled,
            autoBackupEnabled: BACKUP_CONFIG.enabled, // Alias para compatibilidade
            maxBackups: BACKUP_CONFIG.maxBackups,
            retention: BACKUP_CONFIG.maxBackups, // Alias para maxBackups (compatibilidade com frontend)
            retentionDays: BACKUP_CONFIG.maxBackups, // Outro alias possível
            intervalHours: BACKUP_CONFIG.autoBackupInterval / 1000 / 60 / 60,
            backupDir: BACKUP_DIR
        }
    });
});

/**
 * GET /backup/:filename - Download de um backup específico
 */
router.get('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // Validação básica de segurança
        if (!filename.endsWith('.sql') || filename.includes('..')) {
            return res.status(400).json({
                success: false,
                error: 'Nome de arquivo inválido'
            });
        }

        const filePath = path.join(BACKUP_DIR, filename);

        // Verifica se arquivo existe
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Backup não encontrado'
            });
        }

        // Envia arquivo para download
        res.download(filePath, filename, (err) => {
            if (err) {
                logger.error('Erro ao enviar backup:', err);
                if (!res.headersSent) {
                    res.status(500).json({
                        success: false,
                        error: 'Erro ao baixar backup'
                    });
                }
            } else {
                logger.info(`📥 Backup baixado: ${filename}`);
            }
        });
    } catch (error) {
        logger.error('Erro ao processar download de backup:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao processar download',
            message: error.message
        });
    }
});

/**
 * DELETE /backup/:filename - Remove um backup específico
 */
router.delete('/:filename', async (req, res) => {
    try {
        const { filename } = req.params;

        // Validação básica de segurança
        if (!filename.endsWith('.sql') || filename.includes('..')) {
            return res.status(400).json({
                success: false,
                error: 'Nome de arquivo inválido'
            });
        }

        const filePath = path.join(BACKUP_DIR, filename);

        // Verifica se arquivo existe
        try {
            await fs.access(filePath);
        } catch {
            return res.status(404).json({
                success: false,
                error: 'Backup não encontrado'
            });
        }

        // Remove arquivo
        await fs.unlink(filePath);

        logger.info(`🗑️  Backup removido: ${filename}`);

        res.json({
            success: true,
            message: 'Backup removido com sucesso',
            filename: filename
        });
    } catch (error) {
        logger.error('Erro ao remover backup:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao remover backup',
            message: error.message
        });
    }
});

module.exports = router;
