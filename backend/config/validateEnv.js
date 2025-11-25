// backend/config/validateEnv.js
const logger = require('../utils/logger');

/**
 * 🔒 SEGURANÇA: Validação de variáveis de ambiente obrigatórias
 * Previne que a aplicação inicie com configuração incorreta
 */

// Variáveis obrigatórias
const REQUIRED_ENV_VARS = [
    'DB_HOST',
    'DB_USER',
    'DB_PASS',
    'DB_NAME',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CSRF_SECRET',
    'NODE_ENV',
    'FRONTEND_URL',
    'ADMIN_EMAIL'
];

// Variáveis opcionais com valores padrão
const OPTIONAL_ENV_VARS = {
    'DB_CONNECTION_LIMIT': '10',
    'DB_DIALECT': 'mysql'
};

/**
 * Valida uma variável individual
 * @param {string} varName - Nome da variável
 * @returns {Object} Resultado da validação
 */
function validateEnvVar(varName) {
    const value = process.env[varName];

    if (!value || value.trim() === '') {
        return {
            valid: false,
            name: varName,
            error: 'Variável não definida ou vazia'
        };
    }

    // Validações específicas por tipo de variável
    const validations = {
        // Secrets devem ter no mínimo 32 caracteres
        'JWT_SECRET': (val) => val.length >= 32 ? null : 'Deve ter no mínimo 32 caracteres',
        'JWT_REFRESH_SECRET': (val) => val.length >= 32 ? null : 'Deve ter no mínimo 32 caracteres',
        'CSRF_SECRET': (val) => val.length >= 32 ? null : 'Deve ter no mínimo 32 caracteres',

        // NODE_ENV deve ser production, development ou test
        'NODE_ENV': (val) => ['production', 'development', 'test'].includes(val)
            ? null
            : 'Deve ser "production", "development" ou "test"',

        // FRONTEND_URL deve ser uma URL válida
        'FRONTEND_URL': (val) => {
            try {
                new URL(val);
                return null;
            } catch {
                return 'Deve ser uma URL válida (ex: https://exemplo.com)';
            }
        },

        // ADMIN_EMAIL deve ser um email válido
        'ADMIN_EMAIL': (val) => {
            // Regex simples para validação de e-mail
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(val)) {
                return 'Deve ser um endereço de e-mail válido';
            }
            return null;
        },

        // DB_CONNECTION_LIMIT deve ser um número entre 1 e 100
        'DB_CONNECTION_LIMIT': (val) => {
            const num = parseInt(val);
            if (isNaN(num) || num < 1 || num > 100) {
                return 'Deve ser um número entre 1 e 100';
            }
            return null;
        }
    };

    // Executa validação específica se existir
    if (validations[varName]) {
        const error = validations[varName](value);
        if (error) {
            return {
                valid: false,
                name: varName,
                error: error
            };
        }
    }

    return {
        valid: true,
        name: varName,
        value: value
    };
}

/**
 * Valida todas as variáveis de ambiente obrigatórias
 * @returns {Object} Resultado da validação
 */
function validateEnvironment() {
    const errors = [];
    const warnings = [];
    const validVars = [];

    // Valida variáveis obrigatórias
    for (const varName of REQUIRED_ENV_VARS) {
        const result = validateEnvVar(varName);

        if (result.valid) {
            validVars.push(result);
        } else {
            errors.push(result);
        }
    }

    // Verifica variáveis opcionais e aplica valores padrão
    for (const [varName, defaultValue] of Object.entries(OPTIONAL_ENV_VARS)) {
        if (!process.env[varName] || process.env[varName].trim() === '') {
            process.env[varName] = defaultValue;
            warnings.push({
                name: varName,
                message: `Não definida. Usando valor padrão: ${defaultValue}`
            });
        }
    }

    // Log dos resultados
    if (errors.length > 0) {
        logger.error('❌ ERRO: Variáveis de ambiente inválidas ou faltando:');
        errors.forEach(err => {
            logger.error(`  - ${err.name}: ${err.error}`);
        });
        logger.error('\n📝 Verifique seu arquivo .env e corrija os erros acima.');
        logger.error('💡 Exemplo de .env correto:');
        logger.error(`
DB_HOST=localhost
DB_USER=root
DB_PASS=sua_senha
DB_NAME=nome_banco
JWT_SECRET=sua_chave_jwt_com_pelo_menos_32_caracteres_aqui
JWT_REFRESH_SECRET=sua_chave_refresh_com_pelo_menos_32_caracteres_aqui
CSRF_SECRET=sua_chave_csrf_com_pelo_menos_32_caracteres_aqui
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
        `);

        return {
            valid: false,
            errors: errors,
            warnings: warnings
        };
    }

    if (warnings.length > 0) {
        logger.warn('⚠️  Avisos de configuração:');
        warnings.forEach(warn => {
            logger.warn(`  - ${warn.name}: ${warn.message}`);
        });
    }

    logger.info('✅ Todas as variáveis de ambiente estão válidas');
    logger.info(`📊 Configuração: ${validVars.length} variáveis obrigatórias, ${warnings.length} opcionais com padrão`);

    return {
        valid: true,
        errors: [],
        warnings: warnings
    };
}

/**
 * Valida e falha rapidamente se ambiente inválido
 * 🔒 SEGURANÇA: Fail-fast - não deixa aplicação iniciar com config errada
 */
function validateOrExit() {
    const result = validateEnvironment();

    if (!result.valid) {
        logger.error('\n❌ APLICAÇÃO NÃO PODE INICIAR COM CONFIGURAÇÃO INVÁLIDA');
        logger.error('🛑 Encerrando processo...\n');
        process.exit(1);
    }

    return result;
}

module.exports = {
    validateEnvironment,
    validateOrExit,
    validateEnvVar,
    REQUIRED_ENV_VARS,
    OPTIONAL_ENV_VARS
};
