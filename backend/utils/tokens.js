// backend/utils/tokens.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../db/connection');
const logger = require('./logger');

/**
 * 🔒 SEGURANÇA: Hash de token para armazenamento seguro
 * Usa SHA-256 para criar hash do token antes de salvar no banco
 * @param {string} token - Token a ser hasheado
 * @returns {string} Hash do token em hexadecimal
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Gera um access token (JWT de curta duração)
 * @param {Object} user - Objeto com dados do usuário
 * @returns {string} Access token
 */
function generateAccessToken(user) {
  // 🔒 SEGURANÇA: Adiciona flag de admin se o e-mail corresponder
  const isAdmin = user.email === process.env.ADMIN_EMAIL;
  
  const payload = {
    id: user.id,
    email: user.email,
    ...(isAdmin && { AdminIsTrue: true }) // Adiciona a flag apenas se for admin
  };

  return jwt.sign(
    payload,
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
 * 🔒 SEGURANÇA: Armazena hash SHA-256 do token (não plaintext)
 * 🔒 SEGURANÇA: Limita tokens ativos por usuário (max 5)
 * @param {number} userId - ID do usuário
 * @param {string} token - Refresh token
 * @param {number} maxTokensPerUser - Máximo de tokens ativos por usuário (padrão: 5)
 * @returns {Promise<void>}
 */
async function saveRefreshToken(userId, token, maxTokensPerUser = 5) {
  try {
    // 🔒 SEGURANÇA: Hash do token ANTES de salvar
    const tokenHash = hashToken(token);

    // 🔒 SEGURANÇA: Remove tokens antigos se usuário exceder limite
    // Mantém apenas os N tokens mais recentes ativos
    await db.query(
      `DELETE FROM refresh_tokens
       WHERE user_id = ?
       AND revoked = FALSE
       AND id NOT IN (
         SELECT id FROM (
           SELECT id FROM refresh_tokens
           WHERE user_id = ? AND revoked = FALSE
           ORDER BY created_at DESC
           LIMIT ?
         ) AS recent_tokens
       )`,
      [userId, userId, maxTokensPerUser - 1] // -1 porque vamos inserir um novo
    );

    // Calcula data de expiração (7 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 🔒 SEGURANÇA: Salva APENAS o hash, não o token plaintext
    // Tenta primeiro com token_hash (nova coluna), se falhar usa token (legado)
    try {
      await db.query(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [userId, tokenHash, expiresAt]
      );
      logger.info(`🔒 Refresh token hasheado salvo para usuário ${userId} (limite: ${maxTokensPerUser} ativos)`);
    } catch (hashError) {
      // Fallback para coluna antiga se token_hash não existir ainda
      if (hashError.code === 'ER_BAD_FIELD_ERROR') {
        logger.warn('⚠️ Coluna token_hash não existe ainda, usando coluna token (legado)');
        await db.query(
          'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
          [userId, token, expiresAt]
        );
        logger.info(`Refresh token salvo (legado) para usuário ${userId}`);
      } else {
        throw hashError;
      }
    }
  } catch (error) {
    logger.error('Erro ao salvar refresh token:', error.message);
    // Não propaga o erro - permite que o login continue mesmo sem tabela de refresh tokens
  }
}

/**
 * Verifica se refresh token é válido
 * 🔒 SEGURANÇA: Busca por hash SHA-256 do token
 * @param {string} token - Refresh token
 * @returns {Promise<Object|null>} Dados do token ou null se inválido
 */
async function verifyRefreshToken(token) {
  try {
    // Verifica JWT primeiro
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // 🔒 SEGURANÇA: Busca pelo hash do token
    const tokenHash = hashToken(token);

    // Tenta buscar por hash primeiro (novo método)
    let [results] = await db.query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = ? AND revoked = FALSE AND expires_at > NOW()`,
      [tokenHash]
    );

    // Fallback: se não encontrou por hash, tenta por token (legado)
    if (results.length === 0) {
      [results] = await db.query(
        `SELECT * FROM refresh_tokens
         WHERE token = ? AND revoked = FALSE AND expires_at > NOW()`,
        [token]
      );

      if (results.length > 0) {
        logger.warn('⚠️ Token encontrado em formato legado (plaintext). Considere fazer logout/login novamente.');
      }
    }

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
 * 🔒 SEGURANÇA: Revoga por hash do token
 * @param {string} token - Refresh token
 * @param {string} replacedByToken - Token que substituiu este (opcional)
 * @returns {Promise<void>}
 */
async function revokeRefreshToken(token, replacedByToken = null) {
  try {
    // 🔒 SEGURANÇA: Revoga pelo hash
    const tokenHash = hashToken(token);
    const replacedByHash = replacedByToken ? hashToken(replacedByToken) : null;

    // Tenta revogar por hash primeiro
    const [result] = await db.query(
      'UPDATE refresh_tokens SET revoked = TRUE, replaced_by_token = ? WHERE token_hash = ?',
      [replacedByHash, tokenHash]
    );

    // Se não afetou nenhuma linha, tenta por token (legado)
    if (result.affectedRows === 0) {
      await db.query(
        'UPDATE refresh_tokens SET revoked = TRUE, replaced_by_token = ? WHERE token = ?',
        [replacedByToken, token]
      );
    }

    logger.info('Refresh token revogado');
  } catch (error) {
    logger.error('Erro ao revogar refresh token:', error.message);
    // Não propaga o erro - permite que o logout continue mesmo sem tabela
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
    logger.error('Erro ao limpar tokens expirados (tabela pode não existir):', error.message);
    return 0;
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
    logger.error('Erro ao revogar tokens do usuário (tabela pode não existir):', error.message);
    // Não propaga o erro
  }
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  cleanupExpiredTokens,
  revokeAllUserTokens,
  hashToken
};
