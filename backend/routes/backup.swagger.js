/**
 * @swagger
 * components:
 *   schemas:
 *     BackupInfo:
 *       type: object
 *       properties:
 *         filename:
 *           type: string
 *           example: backup_clientes_clientes_2025-11-23T17-00-00.sql
 *         path:
 *           type: string
 *           example: /path/to/backups/backup_clientes_clientes_2025-11-23T17-00-00.sql
 *         size:
 *           type: integer
 *           example: 1048576
 *         sizeFormatted:
 *           type: string
 *           example: 1.00 MB
 *         created:
 *           type: string
 *           format: date-time
 *           example: 2025-11-23T17:00:00.000Z
 *         modified:
 *           type: string
 *           format: date-time
 *           example: 2025-11-23T17:00:00.000Z
 *
 *     BackupResult:
 *       type: object
 *       properties:
 *         success:
 *           type: boolean
 *           example: true
 *         filename:
 *           type: string
 *           example: backup_clientes_clientes_2025-11-23T17-00-00.sql
 *         path:
 *           type: string
 *           example: /path/to/backups/backup_clientes_clientes_2025-11-23T17-00-00.sql
 *         size:
 *           type: integer
 *           example: 1048576
 *         sizeFormatted:
 *           type: string
 *           example: 1.00 MB
 *         method:
 *           type: string
 *           enum: [mysqldump, SQL]
 *           example: SQL
 */

/**
 * @swagger
 * /backup:
 *   get:
 *     summary: Listar todos os backups
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     description: Retorna lista de todos os backups disponíveis
 *     responses:
 *       200:
 *         description: Lista de backups
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 5
 *                 maxBackups:
 *                   type: integer
 *                   example: 7
 *                 autoBackupEnabled:
 *                   type: boolean
 *                   example: true
 *                 backupDir:
 *                   type: string
 *                   example: /path/to/backups
 *                 backups:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/BackupInfo'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   post:
 *     summary: Criar novo backup manualmente
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     description: Cria um novo backup do banco de dados sob demanda
 *     responses:
 *       200:
 *         description: Backup criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Backup criado com sucesso
 *                 backup:
 *                   $ref: '#/components/schemas/BackupResult'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro ao criar backup
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /backup/{filename}:
 *   get:
 *     summary: Baixar um backup específico
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do arquivo de backup
 *         example: backup_clientes_clientes_2025-11-23T17-00-00.sql
 *     responses:
 *       200:
 *         description: Arquivo de backup
 *         content:
 *           application/sql:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Nome de arquivo inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Backup não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *
 *   delete:
 *     summary: Remover um backup específico
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: filename
 *         required: true
 *         schema:
 *           type: string
 *         description: Nome do arquivo de backup
 *         example: backup_clientes_clientes_2025-11-23T17-00-00.sql
 *     responses:
 *       200:
 *         description: Backup removido com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Backup removido com sucesso
 *                 filename:
 *                   type: string
 *                   example: backup_clientes_clientes_2025-11-23T17-00-00.sql
 *       400:
 *         description: Nome de arquivo inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Backup não encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

/**
 * @swagger
 * /backup/config/status:
 *   get:
 *     summary: Obter status e configuração do backup
 *     tags: [Backup]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Configuração do backup
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 config:
 *                   type: object
 *                   properties:
 *                     enabled:
 *                       type: boolean
 *                       example: true
 *                     maxBackups:
 *                       type: integer
 *                       example: 7
 *                     intervalHours:
 *                       type: number
 *                       example: 24
 *                     backupDir:
 *                       type: string
 *                       example: /path/to/backups
 *       401:
 *         description: Não autenticado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */

module.exports = {};
