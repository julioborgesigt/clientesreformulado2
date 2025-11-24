// backend/constants/index.js
/**
 * Constantes centralizadas da aplicação
 * BOA PRÁTICA: Evita "magic numbers" espalhados pelo código
 */

// ========================================
// CALENDÁRIO E DATAS
// ========================================
const CALENDAR_DAYS = 31; // Dias no calendário mensal
const ALERT_DAYS_THRESHOLD = 3; // Dias antes do vencimento para alertar

// ========================================
// VALORES PADRÃO DE NEGÓCIO
// ========================================
const DEFAULT_VALOR_COBRADO = 15.00; // Valor padrão cobrado do cliente
const DEFAULT_CUSTO = 6.00; // Custo padrão do serviço

// ========================================
// TOKENS E AUTENTICAÇÃO
// ========================================
const ACCESS_TOKEN_EXPIRES = '15m'; // Tempo de expiração do access token
const REFRESH_TOKEN_EXPIRES = '7d'; // Tempo de expiração do refresh token
const MAX_REFRESH_TOKENS_PER_USER = 5; // Máximo de refresh tokens ativos por usuário
const TOKEN_CLEANUP_INTERVAL = 24 * 60 * 60 * 1000; // 24 horas em millisegundos

// ========================================
// RATE LIMITING
// ========================================
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutos
const RATE_LIMIT_MAX_REQUESTS = 500; // Máximo de requisições globais
const AUTH_RATE_LIMIT_MAX = 5; // Máximo de tentativas de login
const AUTHENTICATED_RATE_LIMIT_MAX = 2000; // Máximo para usuários autenticados

// ========================================
// PAGINAÇÃO
// ========================================
const DEFAULT_PAGE_SIZE = 50; // Tamanho padrão de página
const MAX_PAGE_SIZE = 1000; // Tamanho máximo de página permitido

// ========================================
// SENHAS E SEGURANÇA
// ========================================
const MIN_PASSWORD_LENGTH = 12; // Mínimo de caracteres na senha
const BCRYPT_SALT_ROUNDS = 10; // Rounds de salt do bcrypt

// ========================================
// LOGS
// ========================================
const LOG_ERROR_MAX_DAYS = 30; // Dias para manter logs de erro
const LOG_COMBINED_MAX_DAYS = 14; // Dias para manter logs combinados
const LOG_MAX_SIZE = '20m'; // Tamanho máximo de arquivo de log

// ========================================
// DATABASE
// ========================================
const DB_CONNECTION_LIMIT = 10; // Limite padrão de conexões no pool
const DB_CONNECT_TIMEOUT = 10000; // Timeout para conectar (10 segundos)
const DB_ACQUIRE_TIMEOUT = 10000; // Timeout para adquirir conexão (10 segundos)

// ========================================
// STATUS DE CLIENTES
// ========================================
const CLIENT_STATUS = {
    PAID_ON_TIME: 'Pag. em dias',
    PENDING: 'Pendente',
    OVERDUE: 'Vencido',
    CANCELLED: 'Cancelado'
};

// ========================================
// TIPOS DE AÇÃO (ACTION LOG)
// ========================================
const ACTION_TYPES = {
    CREATE_CLIENT: 'CREATE_CLIENT',
    UPDATE_CLIENT: 'UPDATE_CLIENT',
    DELETE_CLIENT: 'DELETE_CLIENT',
    CHANGE_STATUS: 'CHANGE_STATUS',
    ADJUST_DATE: 'ADJUST_DATE',
    ARCHIVE_CLIENT: 'ARCHIVE_CLIENT',
    UNARCHIVE_CLIENT: 'UNARCHIVE_CLIENT',
    SAVE_MESSAGE: 'SAVE_MESSAGE',
    SAVE_MESSAGE_EXPIRED: 'SAVE_MESSAGE_EXPIRED'
};

// ========================================
// UNIDADES DE TEMPO
// ========================================
const TIME_UNITS = {
    DAY: 'DAY',
    WEEK: 'WEEK',
    MONTH: 'MONTH',
    YEAR: 'YEAR'
};

module.exports = {
    // Calendário
    CALENDAR_DAYS,
    ALERT_DAYS_THRESHOLD,

    // Valores padrão
    DEFAULT_VALOR_COBRADO,
    DEFAULT_CUSTO,

    // Tokens
    ACCESS_TOKEN_EXPIRES,
    REFRESH_TOKEN_EXPIRES,
    MAX_REFRESH_TOKENS_PER_USER,
    TOKEN_CLEANUP_INTERVAL,

    // Rate limiting
    RATE_LIMIT_WINDOW_MS,
    RATE_LIMIT_MAX_REQUESTS,
    AUTH_RATE_LIMIT_MAX,
    AUTHENTICATED_RATE_LIMIT_MAX,

    // Paginação
    DEFAULT_PAGE_SIZE,
    MAX_PAGE_SIZE,

    // Segurança
    MIN_PASSWORD_LENGTH,
    BCRYPT_SALT_ROUNDS,

    // Logs
    LOG_ERROR_MAX_DAYS,
    LOG_COMBINED_MAX_DAYS,
    LOG_MAX_SIZE,

    // Database
    DB_CONNECTION_LIMIT,
    DB_CONNECT_TIMEOUT,
    DB_ACQUIRE_TIMEOUT,

    // Status e tipos
    CLIENT_STATUS,
    ACTION_TYPES,
    TIME_UNITS
};
