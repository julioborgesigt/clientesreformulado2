/**
 * @swagger
 * components:
 *   schemas:
 *     HealthBasic:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           example: healthy
 *         message:
 *           type: string
 *           example: Servidor online
 *
 *     HealthDetailed:
 *       type: object
 *       properties:
 *         status:
 *           type: string
 *           enum: [healthy, unhealthy]
 *           example: healthy
 *         timestamp:
 *           type: string
 *           format: date-time
 *           example: 2025-11-23T17:00:00.000Z
 *         checks:
 *           type: object
 *           properties:
 *             database:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 message:
 *                   type: string
 *                   example: Conectado
 *                 responseTime:
 *                   type: string
 *                   example: 15ms
 *             server:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: healthy
 *                 message:
 *                   type: string
 *                   example: Servidor operacional
 *         system:
 *           type: object
 *           properties:
 *             platform:
 *               type: string
 *               example: win32
 *             arch:
 *               type: string
 *               example: x64
 *             nodeVersion:
 *               type: string
 *               example: v20.10.0
 *             cpus:
 *               type: integer
 *               example: 8
 *             hostname:
 *               type: string
 *               example: server-01
 *         memory:
 *           type: object
 *           properties:
 *             process:
 *               type: object
 *               properties:
 *                 heapUsed:
 *                   type: string
 *                   example: 50 MB
 *                 heapTotal:
 *                   type: string
 *                   example: 80 MB
 *             system:
 *               type: object
 *               properties:
 *                 total:
 *                   type: string
 *                   example: 16 GB
 *                 free:
 *                   type: string
 *                   example: 8 GB
 *                 usagePercent:
 *                   type: string
 *                   example: 50%
 *         uptime:
 *           type: object
 *           properties:
 *             raw:
 *               type: integer
 *               example: 3600
 *             formatted:
 *               type: string
 *               example: 0d 1h 0m 0s
 *             since:
 *               type: string
 *               format: date-time
 *               example: 2025-11-23T16:00:00.000Z
 *         environment:
 *           type: string
 *           example: production
 *         version:
 *           type: string
 *           example: 1.0.0
 *         totalCheckTime:
 *           type: string
 *           example: 25ms
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check básico
 *     tags: [Health Check]
 *     description: Verifica se o servidor está online (resposta rápida para load balancers)
 *     responses:
 *       200:
 *         description: Servidor está saudável
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthBasic'
 */

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Health check detalhado
 *     tags: [Health Check]
 *     description: Retorna informações completas sobre a saúde do sistema (banco de dados, memória, uptime, etc)
 *     responses:
 *       200:
 *         description: Sistema está saudável
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthDetailed'
 *       503:
 *         description: Sistema não está saudável
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/HealthDetailed'
 */

/**
 * @swagger
 * /health/liveness:
 *   get:
 *     summary: Liveness probe (Kubernetes)
 *     tags: [Health Check]
 *     description: Verifica se a aplicação está viva (processo rodando)
 *     responses:
 *       200:
 *         description: Aplicação está viva
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: alive
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-11-23T17:00:00.000Z
 */

/**
 * @swagger
 * /health/readiness:
 *   get:
 *     summary: Readiness probe (Kubernetes)
 *     tags: [Health Check]
 *     description: Verifica se a aplicação está pronta para receber tráfego (banco de dados acessível)
 *     responses:
 *       200:
 *         description: Sistema está pronto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: 2025-11-23T17:00:00.000Z
 *                 message:
 *                   type: string
 *                   example: Sistema pronto para receber requisições
 *       503:
 *         description: Sistema não está pronto
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: not_ready
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 message:
 *                   type: string
 *                   example: Sistema não está pronto
 *                 reason:
 *                   type: string
 *                   example: Banco de dados inacessível
 */

module.exports = {};
