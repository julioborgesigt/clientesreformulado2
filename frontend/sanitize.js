// ============================================================
// FUNÇÃO DE SANITIZAÇÃO XSS - Proteção contra ataques XSS
// ============================================================
/**
 * Sanitiza strings para prevenir XSS (Cross-Site Scripting)
 * Escapa caracteres HTML perigosos antes de inserir no DOM
 * @param {string} str - String a ser sanitizada
 * @returns {string} - String sanitizada
 */
function sanitizeHTML(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Sanitiza um objeto completo (para dados de cliente)
 * @param {Object} obj - Objeto com dados do cliente
 * @returns {Object} - Objeto com todos os campos sanitizados
 */
function sanitizeClientData(obj) {
  const sanitized = {};
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      sanitized[key] = sanitizeHTML(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
}

/**
 * Sanitiza um array de objetos (para lista de clientes)
 * @param {Array} arr - Array de objetos
 * @returns {Array} - Array com todos os objetos sanitizados
 */
function sanitizeArray(arr) {
  return arr.map(item => sanitizeClientData(item));
}
