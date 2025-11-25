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
            // 🔍 FEEDBACK MELHORADO: Informa o motivo específico da negação
            const userEmail = decoded.email || 'desconhecido';
            const adminEmail = process.env.ADMIN_EMAIL || 'não configurado';

            // Oculta parcialmente o email do admin por segurança (mostra apenas primeiras letras e domínio)
            const adminEmailHint = adminEmail !== 'não configurado'
                ? adminEmail.replace(/(.{2})(.*)(@.*)/, '$1***$3')
                : adminEmail;

            logger.warn(`Tentativa de acesso admin negada para o usuário: ${userEmail} (ID: ${decoded.id})`);
            logger.warn(`Email do admin configurado: ${adminEmail}`);
            logger.warn(`Token não contém a flag 'AdminIsTrue' - usuário não é administrador`);
            logger.debug(`[ADMIN DEBUG] Conteúdo do token decodificado:`, decoded);

            return res.status(403).json({
                message: 'Acesso negado. Esta área é restrita a administradores.',
                details: {
                    reason: 'Você não possui privilégios de administrador',
                    userEmail: userEmail,
                    adminEmailHint: adminEmailHint,
                    explanation: 'Apenas o e-mail configurado como ADMIN_EMAIL pode acessar esta área. Se você é o administrador, verifique se está logado com o e-mail correto.',
                    troubleshooting: [
                        'Verifique se o e-mail usado no login corresponde ao ADMIN_EMAIL configurado nas variáveis de ambiente',
                        'Após alterar o ADMIN_EMAIL, é necessário fazer logout e login novamente para obter um novo token',
                        'Confirme que a variável ADMIN_EMAIL está corretamente definida no arquivo .env do servidor'
                    ]
                }
            });
        }
    } catch (error) {
        logger.error('Erro de autenticação de administrador:', error.message);
        if (error instanceof jwt.TokenExpiredError) {
            return res.status(401).json({
                message: 'Token expirado. Por favor, faça login novamente.',
                details: {
                    reason: 'Sessão expirada',
                    action: 'Faça login novamente para obter um novo token de acesso'
                }
            });
        }
        return res.status(401).json({
            message: 'Token inválido.',
            details: {
                reason: 'Token de autenticação inválido ou corrompido',
                action: 'Faça login novamente'
            }
        });
    }
}

module.exports = adminMiddleware;
