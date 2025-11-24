// backend/tests/validateEnv.test.js
const path = require('path');

// Carrega variáveis de ambiente de teste
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

const {
    validateEnvVar,
    validateEnvironment,
    REQUIRED_ENV_VARS
} = require('../config/validateEnv');

describe('Validação de Variáveis de Ambiente', () => {
    // Salva valores originais
    const originalEnv = { ...process.env };

    // Restaura após cada teste
    afterEach(() => {
        process.env = { ...originalEnv };
    });

    describe('validateEnvVar()', () => {
        it('deve validar variável presente e válida', () => {
            process.env.TEST_VAR = 'valor_teste';
            const result = validateEnvVar('TEST_VAR');

            expect(result.valid).toBe(true);
            expect(result.name).toBe('TEST_VAR');
            expect(result.value).toBe('valor_teste');
        });

        it('deve invalidar variável vazia', () => {
            process.env.TEST_VAR = '';
            const result = validateEnvVar('TEST_VAR');

            expect(result.valid).toBe(false);
            expect(result.error).toBeDefined();
        });

        it('deve invalidar variável não definida', () => {
            delete process.env.TEST_VAR;
            const result = validateEnvVar('TEST_VAR');

            expect(result.valid).toBe(false);
        });

        it('deve validar JWT_SECRET com mínimo 32 caracteres', () => {
            process.env.JWT_SECRET = 'a'.repeat(32);
            const result = validateEnvVar('JWT_SECRET');

            expect(result.valid).toBe(true);
        });

        it('deve invalidar JWT_SECRET com menos de 32 caracteres', () => {
            process.env.JWT_SECRET = 'curto';
            const result = validateEnvVar('JWT_SECRET');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('32 caracteres');
        });

        it('deve validar NODE_ENV com valores permitidos', () => {
            const validValues = ['production', 'development', 'test'];

            validValues.forEach(value => {
                process.env.NODE_ENV = value;
                const result = validateEnvVar('NODE_ENV');
                expect(result.valid).toBe(true);
            });
        });

        it('deve invalidar NODE_ENV com valores não permitidos', () => {
            process.env.NODE_ENV = 'staging';
            const result = validateEnvVar('NODE_ENV');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('production');
        });

        it('deve validar FRONTEND_URL como URL válida', () => {
            process.env.FRONTEND_URL = 'https://exemplo.com';
            const result = validateEnvVar('FRONTEND_URL');

            expect(result.valid).toBe(true);
        });

        it('deve invalidar FRONTEND_URL inválida', () => {
            process.env.FRONTEND_URL = 'não-é-url';
            const result = validateEnvVar('FRONTEND_URL');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('URL válida');
        });

        it('deve validar DB_CONNECTION_LIMIT como número válido', () => {
            process.env.DB_CONNECTION_LIMIT = '10';
            const result = validateEnvVar('DB_CONNECTION_LIMIT');

            expect(result.valid).toBe(true);
        });

        it('deve invalidar DB_CONNECTION_LIMIT fora do range', () => {
            process.env.DB_CONNECTION_LIMIT = '200';
            const result = validateEnvVar('DB_CONNECTION_LIMIT');

            expect(result.valid).toBe(false);
            expect(result.error).toContain('1 e 100');
        });
    });

    describe('validateEnvironment()', () => {
        it('deve validar ambiente completo e correto', () => {
            // .env.test já tem todas as variáveis
            const result = validateEnvironment();

            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
        });

        it('deve detectar variáveis faltando', () => {
            delete process.env.DB_HOST;
            const result = validateEnvironment();

            expect(result.valid).toBe(false);
            expect(result.errors.length).toBeGreaterThan(0);
            expect(result.errors.some(e => e.name === 'DB_HOST')).toBe(true);
        });

        it('deve aplicar valores padrão para variáveis opcionais', () => {
            delete process.env.DB_CONNECTION_LIMIT;
            const result = validateEnvironment();

            expect(process.env.DB_CONNECTION_LIMIT).toBe('10');
            expect(result.warnings.length).toBeGreaterThan(0);
        });

        it('deve validar todas as variáveis obrigatórias', () => {
            REQUIRED_ENV_VARS.forEach(varName => {
                expect(process.env[varName]).toBeDefined();
                expect(process.env[varName]).not.toBe('');
            });
        });
    });
});
