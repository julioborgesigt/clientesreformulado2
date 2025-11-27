import { Request, Response, NextFunction } from 'express';

/**
 * Interface para erros customizados
 */
export interface CustomError extends Error {
  statusCode?: number;
  details?: any;
}

/**
 * Middleware global de tratamento de erros
 * Deve ser registrado APÓS todas as rotas
 */
export function errorHandler(
  err: CustomError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Log do erro (em produção, usar logger apropriado)
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    statusCode: err.statusCode,
    details: err.details
  });

  // Status code padrão: 500 Internal Server Error
  const statusCode = err.statusCode || 500;

  // Mensagem de erro
  const message = err.message || 'Erro interno do servidor';

  // Em produção, não expor stack trace
  const isDevelopment = process.env.NODE_ENV !== 'production';

  // Resposta padronizada
  res.status(statusCode).json({
    error: message,
    ...(err.details && { details: err.details }),
    ...(isDevelopment && { stack: err.stack })
  });
}

/**
 * Middleware para capturar rotas não encontradas (404)
 * Deve ser registrado ANTES do errorHandler
 */
export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({
    error: 'Rota não encontrada',
    message: 'O endpoint solicitado não existe'
  });
}

/**
 * Helper para criar erros customizados
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: any;

  constructor(message: string, statusCode: number = 500, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'AppError';

    // Mantém stack trace correto
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Erros HTTP comuns
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Requisição inválida', details?: any) {
    super(message, 400, details);
    this.name = 'BadRequestError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Não autorizado', details?: any) {
    super(message, 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado', details?: any) {
    super(message, 403, details);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Recurso não encontrado', details?: any) {
    super(message, 404, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string = 'Conflito', details?: any) {
    super(message, 409, details);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string = 'Erro de validação', details?: any) {
    super(message, 422, details);
    this.name = 'ValidationError';
  }
}

export class InternalServerError extends AppError {
  constructor(message: string = 'Erro interno do servidor', details?: any) {
    super(message, 500, details);
    this.name = 'InternalServerError';
  }
}

/**
 * Helper para validação assíncrona com try-catch
 * Envolve funções async para capturar erros automaticamente
 */
export function asyncHandler(fn: Function) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
