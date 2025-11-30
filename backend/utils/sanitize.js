// backend/utils/sanitize.js

/**
 * 🔒 SEGURANÇA: Utilitários para sanitização de inputs
 * Previne SQL Injection, XSS e outros ataques de injeção
 */

const logger = require('./logger');

/**
 * Escapa caracteres especiais do LIKE SQL
 * Previne que %, _ e \ sejam interpretados como wildcards
 *
 * @param {string} str - String a ser escapada
 * @returns {string} String escapada para uso em LIKE queries
 *
 * @example
 * const search = "test%"; // Usuário digitou %
 * const escaped = escapeLike(search); // "test\\%"
 * db.query("SELECT * FROM table WHERE name LIKE ?", [`%${escaped}%`]);
 */
function escapeLike(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }

    // Escapa backslash primeiro, depois % e _
    // Ordem é importante: \ deve vir primeiro
    return str
        .replace(/\\/g, '\\\\')  // \ -> \\
        .replace(/%/g, '\\%')     // % -> \%
        .replace(/_/g, '\\_');    // _ -> \_
}

/**
 * Remove caracteres de controle perigosos
 * Mantém apenas caracteres imprimíveis
 *
 * @param {string} str - String a ser sanitizada
 * @returns {string} String sem caracteres de controle
 */
function sanitizeInput(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }

    // Remove caracteres de controle ASCII (0x00-0x1F, 0x7F)
    // Mantém tabs, newlines e carriage returns se necessário
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Valida e sanitiza número inteiro
 * Previne injeção via parâmetros numéricos
 *
 * @param {any} value - Valor a ser validado
 * @param {Object} options - Opções de validação
 * @param {number} options.min - Valor mínimo permitido
 * @param {number} options.max - Valor máximo permitido
 * @param {number} options.default - Valor padrão se inválido
 * @returns {number|null} Número validado ou null/default
 */
function sanitizeInteger(value, options = {}) {
    const { min = -Infinity, max = Infinity, default: defaultValue = null } = options;

    // Converte para número
    const num = parseInt(value, 10);

    // Verifica se é número válido
    if (isNaN(num)) {
        logger.warn(`sanitizeInteger: Valor inválido "${value}", usando default: ${defaultValue}`);
        return defaultValue;
    }

    // Verifica range
    if (num < min || num > max) {
        logger.warn(`sanitizeInteger: Valor ${num} fora do range [${min}, ${max}], usando default: ${defaultValue}`);
        return defaultValue;
    }

    return num;
}

/**
 * Valida e sanitiza número decimal
 *
 * @param {any} value - Valor a ser validado
 * @param {Object} options - Opções de validação
 * @param {number} options.min - Valor mínimo permitido
 * @param {number} options.max - Valor máximo permitido
 * @param {number} options.decimals - Número de casas decimais
 * @param {number} options.default - Valor padrão se inválido
 * @returns {number|null} Número validado ou null/default
 */
function sanitizeFloat(value, options = {}) {
    const { min = -Infinity, max = Infinity, decimals = 2, default: defaultValue = null } = options;

    // Converte para número
    const num = parseFloat(value);

    // Verifica se é número válido
    if (isNaN(num) || !isFinite(num)) {
        logger.warn(`sanitizeFloat: Valor inválido "${value}", usando default: ${defaultValue}`);
        return defaultValue;
    }

    // Verifica range
    if (num < min || num > max) {
        logger.warn(`sanitizeFloat: Valor ${num} fora do range [${min}, ${max}], usando default: ${defaultValue}`);
        return defaultValue;
    }

    // Arredonda para número de casas decimais especificado
    return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * Sanitiza email
 * Remove espaços e converte para lowercase
 *
 * @param {string} email - Email a ser sanitizado
 * @returns {string} Email sanitizado
 */
function sanitizeEmail(email) {
    if (!email || typeof email !== 'string') {
        return '';
    }

    return email.trim().toLowerCase();
}

/**
 * Valida e sanitiza booleano
 *
 * @param {any} value - Valor a ser validado
 * @param {boolean} defaultValue - Valor padrão se inválido
 * @returns {boolean} Boolean validado
 */
function sanitizeBoolean(value, defaultValue = false) {
    // Strings que representam true
    const trueValues = ['true', '1', 'yes', 'on'];
    // Strings que representam false
    const falseValues = ['false', '0', 'no', 'off'];

    // Se já é boolean, retorna
    if (typeof value === 'boolean') {
        return value;
    }

    // Se é string, compara com valores válidos
    if (typeof value === 'string') {
        const normalized = value.toLowerCase().trim();
        if (trueValues.includes(normalized)) return true;
        if (falseValues.includes(normalized)) return false;
    }

    // Se é número
    if (typeof value === 'number') {
        return value !== 0;
    }

    logger.warn(`sanitizeBoolean: Valor inválido "${value}", usando default: ${defaultValue}`);
    return defaultValue;
}

/**
 * Sanitiza array de IDs
 * Garante que todos os elementos são inteiros válidos
 *
 * @param {Array|string} ids - Array ou string de IDs separados por vírgula
 * @param {Object} options - Opções de validação
 * @param {number} options.max - Número máximo de IDs permitidos
 * @returns {Array<number>} Array de IDs validados
 */
function sanitizeIdArray(ids, options = {}) {
    const { max = 100 } = options;

    let idsArray = [];

    // Se é string, divide por vírgula
    if (typeof ids === 'string') {
        idsArray = ids.split(',').map(id => id.trim());
    } else if (Array.isArray(ids)) {
        idsArray = ids;
    } else {
        logger.warn(`sanitizeIdArray: Tipo inválido "${typeof ids}"`);
        return [];
    }

    // Limita número de IDs
    if (idsArray.length > max) {
        logger.warn(`sanitizeIdArray: Número de IDs (${idsArray.length}) excede máximo (${max})`);
        idsArray = idsArray.slice(0, max);
    }

    // Converte todos para inteiros e remove inválidos
    const validIds = idsArray
        .map(id => parseInt(id, 10))
        .filter(id => !isNaN(id) && id > 0);

    return validIds;
}

/**
 * Previne path traversal em nomes de arquivo
 * Remove ../ e caracteres perigosos
 *
 * @param {string} filename - Nome do arquivo
 * @returns {string} Nome de arquivo sanitizado
 */
function sanitizeFilename(filename) {
    if (!filename || typeof filename !== 'string') {
        return '';
    }

    return filename
        // Remove path separators
        .replace(/[\/\\]/g, '')
        // Remove parent directory references
        .replace(/\.\./g, '')
        // Remove null bytes
        .replace(/\0/g, '')
        // Limita caracteres permitidos: alphanumeric, -, _, .
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        // Limita tamanho
        .substring(0, 255);
}

/**
 * Sanitiza HTML removendo tags perigosas
 * NOTA: Para produção, usar biblioteca como DOMPurify
 *
 * @param {string} html - HTML a ser sanitizado
 * @returns {string} HTML sanitizado
 */
function sanitizeHtml(html) {
    if (!html || typeof html !== 'string') {
        return '';
    }

    // Remove tags script e style
    let sanitized = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');

    // Remove javascript: URLs
    sanitized = sanitized.replace(/javascript:/gi, '');

    return sanitized;
}

module.exports = {
    escapeLike,
    sanitizeInput,
    sanitizeInteger,
    sanitizeFloat,
    sanitizeEmail,
    sanitizeBoolean,
    sanitizeIdArray,
    sanitizeFilename,
    sanitizeHtml
};
