// backend/utils/actionLog.js
const db = require('../db/connection');

/**
 * Registra uma ação no log de auditoria
 *
 * @param {string} actionType - Tipo de ação (CREATE_CLIENT, UPDATE_CLIENT, etc)
 * @param {number|null} clientId - ID do cliente relacionado (opcional)
 * @param {string|null} details - Detalhes da ação
 * @param {number|null} userId - ID do usuário que realizou a ação
 * @param {boolean} revertable - Se a ação pode ser revertida
 * @param {object|null} originalData - Dados originais para possibilitar reversão
 * @returns {Promise<void>}
 */
async function logAction(actionType, clientId = null, details = null, userId = null, revertable = false, originalData = null) {
  try {
    const query = `
      INSERT INTO action_log (action_type, client_id, details, user_id, revertable, original_data)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const originalDataJson = originalData ? JSON.stringify(originalData) : null;
    await db.query(query, [actionType, clientId, details, userId, revertable, originalDataJson]);
    console.log(`Ação registrada: ${actionType} - Cliente ID: ${clientId}`);
  } catch (error) {
    console.error('Erro ao registrar ação no log:', error);
  }
}

module.exports = { logAction };
