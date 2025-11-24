// backend/tests/health.test.js
const request = require('supertest');
const path = require('path');

// Carrega variáveis de ambiente de teste
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

// Importa app depois de carregar env vars
const app = require('../app');

describe('Health Check Endpoints', () => {
    // Testes para GET /health
    describe('GET /health', () => {
        it('deve retornar status 200 e healthy', async () => {
            const response = await request(app)
                .get('/health')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('status', 'healthy');
            expect(response.body).toHaveProperty('message', 'Servidor online');
        });
    });

    // Testes para GET /health/detailed
    describe('GET /health/detailed', () => {
        it('deve retornar informações detalhadas do sistema', async () => {
            const response = await request(app)
                .get('/health/detailed')
                .expect('Content-Type', /json/)
                .expect(200);

            // Verifica estrutura básica
            expect(response.body).toHaveProperty('status');
            expect(response.body).toHaveProperty('timestamp');
            expect(response.body).toHaveProperty('checks');

            // Verifica checks
            expect(response.body.checks).toHaveProperty('database');
            expect(response.body.checks).toHaveProperty('server');

            // Verifica informações de sistema
            expect(response.body).toHaveProperty('system');
            expect(response.body.system).toHaveProperty('platform');
            expect(response.body.system).toHaveProperty('nodeVersion');

            // Verifica memória
            expect(response.body).toHaveProperty('memory');
            expect(response.body.memory).toHaveProperty('process');
            expect(response.body.memory).toHaveProperty('system');

            // Verifica uptime
            expect(response.body).toHaveProperty('uptime');
            expect(response.body.uptime).toHaveProperty('raw');
            expect(response.body.uptime).toHaveProperty('formatted');
        });

        it('deve retornar status healthy se banco estiver acessível', async () => {
            const response = await request(app)
                .get('/health/detailed')
                .expect(200);

            expect(response.body.status).toBe('healthy');
            expect(response.body.checks.database.status).toBe('healthy');
        });

        it('deve incluir tempo de resposta do banco', async () => {
            const response = await request(app)
                .get('/health/detailed')
                .expect(200);

            expect(response.body.checks.database).toHaveProperty('responseTime');
            expect(response.body.checks.database.responseTime).toMatch(/\d+ms/);
        });
    });

    // Testes para GET /health/liveness
    describe('GET /health/liveness', () => {
        it('deve retornar status 200 e alive', async () => {
            const response = await request(app)
                .get('/health/liveness')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('status', 'alive');
            expect(response.body).toHaveProperty('timestamp');
        });

        it('timestamp deve ser uma data ISO válida', async () => {
            const response = await request(app)
                .get('/health/liveness')
                .expect(200);

            const timestamp = new Date(response.body.timestamp);
            expect(timestamp).toBeInstanceOf(Date);
            expect(timestamp.toString()).not.toBe('Invalid Date');
        });
    });

    // Testes para GET /health/readiness
    describe('GET /health/readiness', () => {
        it('deve retornar status 200 se sistema está pronto', async () => {
            const response = await request(app)
                .get('/health/readiness')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('status', 'ready');
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('timestamp');
        });

        it('deve verificar conexão com banco de dados', async () => {
            const response = await request(app)
                .get('/health/readiness')
                .expect(200);

            // Se passou o teste, significa que banco está conectado
            expect(response.body.status).toBe('ready');
        });
    });
});
