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

        res.json({
            success: true,
            count: backups.length,
            maxBackups: BACKUP_CONFIG.maxBackups,
            autoBackupEnabled: BACKUP_CONFIG.enabled,
            backupDir: BACKUP_DIR,
            backups: backups
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

/**
 * GET /backup/config/status - Retorna status e configuração do backup
 */
router.get('/config/status', (req, res) => {
    res.json({
        success: true,
        config: {
            enabled: BACKUP_CONFIG.enabled,
            maxBackups: BACKUP_CONFIG.maxBackups,
            intervalHours: BACKUP_CONFIG.autoBackupInterval / 1000 / 60 / 60,
            backupDir: BACKUP_DIR
        }
    });
});

module.exports = router;
