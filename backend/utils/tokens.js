// backend/utils/tokens.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/connection');
const logger = require('./logger');

/**
 * Gera um access token (JWT de curta duração)
 * @param {Object} user - Objeto com dados do usuário
 * @returns {string} Access token
 */
function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // 15 minutos
  );
}

/**
 * Gera um refresh token (JWT de longa duração)
 * @param {Object} user - Objeto com dados do usuário
 * @returns {string} Refresh token
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' } // 7 dias
  );
}

/**
 * Salva refresh token no banco de dados
 * @param {number} userId - ID do usuário
 * @param {string} token - Refresh token
 * @returns {Promise<void>}
 */
async function saveRefreshToken(userId, token) {
  try {
    // Calcula data de expiração (7 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.query(
      'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
      [userId, token, expiresAt]
    );

    logger.info(`Refresh token salvo para usuário ${userId}`);
  } catch (error) {
    logger.error('Erro ao salvar refresh token:', error);
    throw error;
  }
}

/**
 * Verifica se refresh token é válido
 * @param {string} token - Refresh token
 * @returns {Promise<Object|null>} Dados do token ou null se inválido
 */
async function verifyRefreshToken(token) {
  try {
    // Verifica JWT
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Verifica no banco se não foi revogado
    const [results] = await db.query(
      `SELECT * FROM refresh_tokens
       WHERE token = ? AND revoked = FALSE AND expires_at > NOW()`,
      [token]
    );

    if (results.length === 0) {
      logger.warn('Refresh token não encontrado ou revogado');
      return null;
    }

    return decoded;
  } catch (error) {
    logger.error('Erro ao verificar refresh token:', error);
    return null;
  }
}

/**
 * Revoga um refresh token
 * @param {string} token - Refresh token
 * @param {string} replacedByToken - Token que substituiu este (opcional)
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(token, replacedByToken = null) {
  try {
    await db.query(
      'UPDATE refresh_tokens SET revoked = TRUE, replaced_by_token = ? WHERE token = ?',
      [replacedByToken, token]
    );

    logger.info('Refresh token revogado');
  } catch (error) {
    logger.error('Erro ao revogar refresh token:', error);
    throw error;
  }
}

/**
 * Remove refresh tokens expirados (limpeza periódica)
 * @returns {Promise<number>} Número de tokens removidos
 */
async function cleanupExpiredTokens() {
  try {
    const [result] = await db.query(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE'
    );

    const deletedCount = result.affectedRows || 0;
    if (deletedCount > 0) {
      logger.info(`${deletedCount} refresh tokens expirados removidos`);
    }

    return deletedCount;
  } catch (error) {
    logger.error('Erro ao limpar tokens expirados:', error);
    throw error;
  }
}

/**
 * Revoga todos os refresh tokens de um usuário
 * @param {number} userId - ID do usuário
 * @returns {Promise<void>}
 */
async function revokeAllUserTokens(userId) {
  try {
    await db.query(
      'UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = ?',
      [userId]
    );

    logger.info(`Todos os tokens do usuário ${userId} foram revogados`);
  } catch (error) {
    logger.error('Erro ao revogar tokens do usuário:', error);
    throw error;
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  cleanupExpiredTokens,
  revokeAllUserTokens
};
