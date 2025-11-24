// backend/middleware/errorHandler.js
const logger = require('../utils/logger');

/**
 * Classe de erro customizada para erros da aplicação
 */
class AppError extends Error {
    constructor(message, statusCode, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

        Error.captureStackTrace(this, this.constructor);
    }
}

/**
 * Middleware centralizado de tratamento de erros
 * Deve ser o último middleware registrado no app.js
 */
const errorHandler = (err, req, res, next) => {
    let error = { ...err };
    error.message = err.message;
    error.stack = err.stack;

    // Log do erro
    if (err.isOperational) {
        // Erro operacional esperado - log como warning
        logger.warn(`Operational Error: ${err.message}`, {
            path: req.path,
            method: req.method,
            statusCode: err.statusCode,
            userId: req.userData?.id
        });
    } else {
        // Erro inesperado - log completo como error
        logger.error('Unexpected Error:', {
            message: err.message,
            stack: err.stack,
            path: req.path,
            method: req.method,
            body: req.body,
            params: req.params,
            query: req.query,
            userId: req.userData?.id
        });
    }

    // Erros específicos do MySQL
    if (err.code === 'ER_DUP_ENTRY') {
        error.message = 'Registro duplicado. Este item já existe.';
        error.statusCode = 409;
        error.isOperational = true;
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        error.message = 'Erro de referência: registro relacionado não encontrado.';
        error.statusCode = 400;
        error.isOperational = true;
    }

    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
        error.message = 'Não é possível excluir: existem registros relacionados.';
        error.statusCode = 409;
        error.isOperational = true;
    }

    // Erros de JWT
    if (err.name === 'JsonWebTokenError') {
        error.message = 'Token inválido. Faça login novamente.';
        error.statusCode = 401;
        error.isOperational = true;
    }

    if (err.name === 'TokenExpiredError') {
        error.message = 'Token expirado. Faça login novamente.';
        error.statusCode = 401;
        error.isOperational = true;
    }

    // Erros de validação do express-validator
    if (err.array && typeof err.array === 'function') {
        const errors = err.array();
        error.message = 'Erro de validação';
        error.statusCode = 400;
        error.isOperational = true;
        error.errors = errors.map(e => ({ field: e.param, message: e.msg }));
    }

    // Erros de cast (ID inválido, etc)
    if (err.name === 'CastError') {
        error.message = `Valor inválido para ${err.path}: ${err.value}`;
        error.statusCode = 400;
        error.isOperational = true;
    }

    // Define status code padrão
    const statusCode = error.statusCode || err.statusCode || 500;
    const message = error.message || 'Erro interno do servidor';

    // Resposta em produção vs desenvolvimento
    if (process.env.NODE_ENV === 'production') {
        // Produção: não expõe detalhes internos
        if (error.isOperational || err.isOperational) {
            res.status(statusCode).json({
                status: error.status || 'error',
                message: message,
                ...(error.errors && { errors: error.errors })
            });
        } else {
            // Erro de programação: não expõe detalhes
            res.status(500).json({
                status: 'error',
                message: 'Algo deu errado. Por favor, tente novamente mais tarde.'
            });
        }
    } else {
        // Desenvolvimento: retorna stack trace para debug
        res.status(statusCode).json({
            status: error.status || 'error',
            message: message,
            stack: error.stack,
            error: error,
            ...(error.errors && { errors: error.errors })
        });
    }
};

/**
 * Middleware para capturar erros assíncronos
 * Wrapper para evitar try/catch em todos os controllers
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

/**
 * Middleware para rotas não encontradas (404)
 */
const notFoundHandler = (req, res, next) => {
    const error = new AppError(
        `Rota não encontrada: ${req.method} ${req.originalUrl}`,
        404
    );
    next(error);
};

module.exports = {
    AppError,
    errorHandler,
    asyncHandler,
    notFoundHandler
};
