// backend/routes/health.js
const express = require('express');
const router = express.Router();
const db = require('../db/connection');
const logger = require('../utils/logger');
const os = require('os');

// Armazena tempo de início da aplicação
const startTime = Date.now();

/**
 * 🏥 Health Check Endpoint Melhorado
 *
 * Retorna informações detalhadas sobre a saúde do sistema:
 * - Status geral (healthy/unhealthy)
 * - Conexão com banco de dados
 * - Uso de memória
 * - Uptime
 * - Versão da aplicação
 * - Detalhes do ambiente
 *
 * Útil para:
 * - Monitoramento (Prometheus, Datadog, etc)
 * - Load balancers (verificar se servidor está saudável)
 * - Troubleshooting
 */

/**
 * Verifica conexão com banco de dados
 */
async function checkDatabase() {
    try {
        const [result] = await db.query('SELECT 1 as alive');

        if (result && result[0].alive === 1) {
            return {
                status: 'healthy',
                message: 'Conectado',
                responseTime: null // Será preenchido no handler
            };
        }

        return {
            status: 'unhealthy',
            message: 'Resposta inesperada',
            error: 'Query não retornou resultado esperado'
        };
    } catch (error) {
        logger.error('Health check - Erro ao verificar banco:', error);
        return {
            status: 'unhealthy',
            message: 'Falha na conexão',
            error: error.message
        };
    }
}

/**
 * Retorna informações de memória
 */
function getMemoryInfo() {
    const used = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    return {
        process: {
            heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
            heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
            rss: `${Math.round(used.rss / 1024 / 1024)} MB`,
            external: `${Math.round(used.external / 1024 / 1024)} MB`
        },
        system: {
            total: `${Math.round(totalMemory / 1024 / 1024 / 1024)} GB`,
            free: `${Math.round(freeMemory / 1024 / 1024 / 1024)} GB`,
            used: `${Math.round((totalMemory - freeMemory) / 1024 / 1024 / 1024)} GB`,
            usagePercent: `${Math.round(((totalMemory - freeMemory) / totalMemory) * 100)}%`
        }
    };
}

/**
 * Retorna uptime formatado
 */
function getUptime() {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const days = Math.floor(uptimeSeconds / 86400);
    const hours = Math.floor((uptimeSeconds % 86400) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;

    return {
        raw: uptimeSeconds,
        formatted: `${days}d ${hours}h ${minutes}m ${seconds}s`,
        since: new Date(startTime).toISOString()
    };
}

/**
 * Retorna informações do sistema
 */
function getSystemInfo() {
    return {
        platform: os.platform(),
        arch: os.arch(),
        nodeVersion: process.version,
        cpus: os.cpus().length,
        hostname: os.hostname()
    };
}

/**
 * GET /health - Health check básico (rápido)
 * Retorna apenas status 200 OK se servidor está rodando
 */
router.get('/', async (req, res) => {
    res.status(200).json({
        status: 'healthy',
        message: 'Servidor online'
    });
});

/**
 * GET /health/detailed - Health check detalhado
 * Retorna informações completas sobre saúde do sistema
 */
router.get('/detailed', async (req, res) => {
    const startCheck = Date.now();

    try {
        // Verifica banco de dados
        const dbCheckStart = Date.now();
        const dbStatus = await checkDatabase();
        dbStatus.responseTime = `${Date.now() - dbCheckStart}ms`;

        // Coleta informações do sistema
        const memory = getMemoryInfo();
        const uptime = getUptime();
        const system = getSystemInfo();

        // Determina status geral
        const isHealthy = dbStatus.status === 'healthy';
        const overallStatus = isHealthy ? 'healthy' : 'unhealthy';

        const response = {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            checks: {
                database: dbStatus,
                server: {
                    status: 'healthy',
                    message: 'Servidor operacional'
                }
            },
            system: system,
            memory: memory,
            uptime: uptime,
            environment: process.env.NODE_ENV || 'unknown',
            version: process.env.npm_package_version || '1.0.0',
            totalCheckTime: `${Date.now() - startCheck}ms`
        };

        // Retorna 200 se tudo ok, 503 se algo errado
        const statusCode = isHealthy ? 200 : 503;
        res.status(statusCode).json(response);

    } catch (error) {
        logger.error('Health check detailed - Erro:', error);

        res.status(503).json({
            status: 'unhealthy',
            message: 'Erro ao verificar saúde do sistema',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

/**
 * GET /health/liveness - Liveness probe
 * Kubernetes-style: verifica se aplicação está viva
 * Retorna 200 se processo está rodando
 */
router.get('/liveness', (req, res) => {
    res.status(200).json({
        status: 'alive',
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /health/readiness - Readiness probe
 * Kubernetes-style: verifica se aplicação está pronta para receber tráfego
 * Retorna 200 se banco está acessível e sistema pronto
 */
router.get('/readiness', async (req, res) => {
    try {
        const dbStatus = await checkDatabase();

        if (dbStatus.status === 'healthy') {
            res.status(200).json({
                status: 'ready',
                timestamp: new Date().toISOString(),
                message: 'Sistema pronto para receber requisições'
            });
        } else {
            res.status(503).json({
                status: 'not_ready',
                timestamp: new Date().toISOString(),
                message: 'Sistema não está pronto',
                reason: dbStatus.message
            });
        }
    } catch (error) {
        logger.error('Readiness check - Erro:', error);
        res.status(503).json({
            status: 'not_ready',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

module.exports = router;
