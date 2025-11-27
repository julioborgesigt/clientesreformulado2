/**
 * Configuração JWT
 */

/**
 * Secret para assinar tokens JWT
 * Em produção, deve vir do .env
 */
export const JWT_SECRET: string = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

/**
 * Tempo de expiração do access token
 * 15 minutos em produção
 */
export const JWT_EXPIRES_IN: string = process.env.JWT_EXPIRES_IN || '15m';

/**
 * Issuer do token (emissor)
 */
export const JWT_ISSUER: string = process.env.JWT_ISSUER || 'clientes-api';

/**
 * Audience do token
 */
export const JWT_AUDIENCE: string = process.env.JWT_AUDIENCE || 'clientes-api-users';
