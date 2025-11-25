// backend/middleware/adminMiddleware.js
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * 🔒 Middleware de verificação de administrador
 * 
 * 1. Extrai o token do cabeçalho 'Authorization'.
 * 2. Valida a assinatura do JWT.
 * 3. Verifica se o payload do token contém a flag `AdminIsTrue`.
 * 
 * Se qualquer uma das verificações falhar, retorna um erro 403 (Proibido).
 * Caso contrário, permite que a requisição continue para a rota protegida.
 */
function adminMiddleware(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        logger.warn('Tentativa de acesso admin sem token');
        return res.status(401).json({
            message: 'Acesso negado. Nenhum token fornecido.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Verifica se o usuário é administrador
        if (decoded.AdminIsTrue) {
            req.user = decoded; // Adiciona os dados do usuário decodificados à requisição
            logger.info(`Acesso de administrador concedido ao usuário ID: ${decoded.id}`);
            next(); // O usuário é um administrador, continua para a próxima função de middleware
        } else {
            logger.warn(`Tentativa de acesso admin negada para o usuário ID: ${decoded.id}. O token não continha a flag 'AdminIsTrue'.`);
            // Para depuração, logue o conteúdo do token (sem informações sensíveis em produção se necessário)
            logger.debug(`[ADMIN DEBUG] Conteúdo do token decodificado:`, decoded);
            return res.status(403).json({
                message: 'Acesso proibido. Requer privilégios de administrador.'
            });
        }
    } catch (error) {
        logger.error('Erro de autenticação de administrador:', error.message);
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                message: 'Token expirado. Por favor, faça login novamente.'
            });
        }
        return res.status(401).json({
            message: 'Token inválido.'
        });
    }
}

module.exports = adminMiddleware;
