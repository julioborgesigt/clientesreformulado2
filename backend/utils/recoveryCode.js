// backend/utils/recoveryCode.js
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * Gera um código de recuperação seguro e legível
 * Formato: XXXX-XXXX-XXXX-XXXX (16 caracteres alfanuméricos)
 *
 * @returns {string} Código de recuperação em texto plano
 */
function generateRecoveryCode() {
    // Gera 16 bytes aleatórios criptograficamente seguros
    const buffer = crypto.randomBytes(16);

    // Converte para string alfanumérica (A-Z, 0-9)
    let code = buffer.toString('base64')
        .replace(/[^A-Z0-9]/gi, '') // Remove caracteres especiais
        .toUpperCase()
        .substring(0, 16); // Garante 16 caracteres

    // Se não tiver 16 caracteres, gera mais bytes
    while (code.length < 16) {
        const extraBuffer = crypto.randomBytes(4);
        const extraChars = extraBuffer.toString('base64')
            .replace(/[^A-Z0-9]/gi, '')
            .toUpperCase();
        code += extraChars;
    }

    code = code.substring(0, 16);

    // Formata como XXXX-XXXX-XXXX-XXXX (mais legível)
    return `${code.substring(0, 4)}-${code.substring(4, 8)}-${code.substring(8, 12)}-${code.substring(12, 16)}`;
}

/**
 * Gera hash bcrypt do código de recuperação para armazenar no banco
 *
 * @param {string} recoveryCode - Código em texto plano
 * @returns {Promise<string>} Hash bcrypt do código
 */
async function hashRecoveryCode(recoveryCode) {
    // Remove hífens antes de fazer hash
    const cleanCode = recoveryCode.replace(/-/g, '');
    return await bcrypt.hash(cleanCode, 10);
}

/**
 * Verifica se um código de recuperação corresponde ao hash armazenado
 *
 * @param {string} recoveryCode - Código fornecido pelo usuário
 * @param {string} hashedCode - Hash armazenado no banco
 * @returns {Promise<boolean>} True se o código é válido
 */
async function verifyRecoveryCode(recoveryCode, hashedCode) {
    // Remove hífens do código fornecido
    const cleanCode = recoveryCode.replace(/-/g, '');
    return await bcrypt.compare(cleanCode, hashedCode);
}

/**
 * Formata um código de recuperação no padrão XXXX-XXXX-XXXX-XXXX
 * Remove caracteres inválidos e adiciona hífens
 *
 * @param {string} code - Código sem formatação
 * @returns {string} Código formatado ou string vazia se inválido
 */
function formatRecoveryCode(code) {
    // Remove todos os caracteres que não são alfanuméricos
    const cleanCode = code.replace(/[^A-Z0-9]/gi, '').toUpperCase();

    // Verifica se tem 16 caracteres
    if (cleanCode.length !== 16) {
        return '';
    }

    // Formata com hífens
    return `${cleanCode.substring(0, 4)}-${cleanCode.substring(4, 8)}-${cleanCode.substring(8, 12)}-${cleanCode.substring(12, 16)}`;
}

/**
 * Valida o formato de um código de recuperação
 *
 * @param {string} code - Código para validar
 * @returns {boolean} True se o formato é válido
 */
function isValidRecoveryCodeFormat(code) {
    // Remove hífens
    const cleanCode = code.replace(/-/g, '');

    // Verifica se tem exatamente 16 caracteres alfanuméricos
    return /^[A-Z0-9]{16}$/i.test(cleanCode);
}

module.exports = {
    generateRecoveryCode,
    hashRecoveryCode,
    verifyRecoveryCode,
    formatRecoveryCode,
    isValidRecoveryCodeFormat
};
