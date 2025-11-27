import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } from '../config/jwt.config';

/**
 * Payload do JWT
 */
export interface JwtPayload {
  id: number;
  email: string;
  name: string;
  role: string;
  iat?: number;
  exp?: number;
  iss?: string;
  aud?: string;
  sub?: string;
}

/**
 * Middleware de autenticação
 * Valida JWT e injeta userData no request
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  try {
    // Obter token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    // Formato esperado: "Bearer TOKEN"
    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      res.status(401).json({ error: 'Formato de token inválido' });
      return;
    }

    const scheme = parts[0] || '';
    const token = parts[1] || '';

    if (!/^Bearer$/i.test(scheme)) {
      res.status(401).json({ error: 'Token mal formatado' });
      return;
    }

    if (!token) {
      res.status(401).json({ error: 'Token não fornecido' });
      return;
    }

    // Verificar e decodificar token
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }) as unknown as JwtPayload;

    // Injetar dados do usuário no request
    (req as any).userData = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expirado' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Token inválido' });
      return;
    }

    res.status(401).json({ error: 'Falha na autenticação' });
  }
}

/**
 * Middleware para verificar se usuário é admin
 * Deve ser usado após authMiddleware
 */
export function adminMiddleware(req: Request, res: Response, next: NextFunction): void {
  const userData = (req as any).userData;

  if (!userData) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  if (userData.role !== 'admin') {
    res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
    return;
  }

  next();
}

/**
 * Middleware opcional de autenticação
 * Injeta userData se token válido, mas não bloqueia se não houver token
 */
export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      next();
      return;
    }

    const parts = authHeader.split(' ');

    if (parts.length !== 2) {
      next();
      return;
    }

    const scheme = parts[0] || '';
    const token = parts[1] || '';

    if (!/^Bearer$/i.test(scheme)) {
      next();
      return;
    }

    if (!token) {
      next();
      return;
    }

    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE
    }) as unknown as JwtPayload;

    (req as any).userData = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
      role: decoded.role
    };

    next();
  } catch (_error) {
    // Em caso de erro, apenas continua sem userData
    next();
  }
}
