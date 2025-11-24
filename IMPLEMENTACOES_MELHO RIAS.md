# 🔧 Implementações de Melhorias - Guia Prático

**Data**: 2025-11-23
**Status**: Pronto para implementação

---

## ⚠️ IMPORTANTE: Ordem de Implementação

Siga esta ordem para evitar quebrar o sistema:

1. ✅ **Backup do banco de dados** antes de qualquer mudança
2. ✅ **Testar em ambiente de desenvolvimento** primeiro
3. ✅ Implementar melhorias uma por uma
4. ✅ Testar após cada implementação

---

## 🔴 MELHORIAS CRÍTICAS (Implementar Imediatamente)

### 1. Hashing de Refresh Tokens no Banco de Dados

**Problema**: Tokens armazenados em plaintext. Se o banco vazar, atacantes podem usar os tokens.

**Solução**: Armazenar hash SHA-256 dos tokens.

#### Passo 1: Migration do Banco de Dados

Crie: `database/migrations/hash_refresh_tokens.sql`
```sql
-- Migration: Adiciona hashing de refresh tokens
-- Data: 2025-11-23

-- 1. Adicionar coluna token_hash
ALTER TABLE refresh_tokens
ADD COLUMN token_hash VARCHAR(64) NULL
COMMENT 'Hash SHA-256 do refresh token para armazenamento seguro';

-- 2. Criar índice no token_hash
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- 3. Remover índice da coluna token (se existir)
-- ALTER TABLE refresh_tokens DROP INDEX token; -- Descomentar se houver índice

-- 4. Após migration, a coluna `token` será deprecated e pode ser removida
-- em uma migração futura, quando todos os tokens antigos expirarem (7 dias)

-- Nota: Tokens existentes não podem ser convertidos para hash porque
-- não temos o plaintext original. Eles expirarão naturalmente em 7 dias.
```

#### Passo 2: Atualizar backend/utils/tokens.js

```javascript
// Adicionar função de hashing no início do arquivo
/**
 * 🔒 SEGURANÇA: Hash de token para armazenamento seguro
 * Usa SHA-256 para criar hash do token antes de salvar no banco
 * @param {string} token - Token a ser hasheado
 * @returns {string} Hash do token em hexadecimal
 */
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Atualizar função saveRefreshToken (linha 41-75)
async function saveRefreshToken(userId, token, maxTokensPerUser = 5) {
  try {
    // 🔒 SEGURANÇA: Hash do token ANTES de salvar
    const tokenHash = hashToken(token);

    // Remove tokens antigos se usuário exceder limite
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
      [userId, userId, maxTokensPerUser - 1]
    );

    // Calcula data de expiração (7 dias)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // 🔒 SEGURANÇA: Salva APENAS o hash, não o token plaintext
    await db.query(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt]
    );

    logger.info(`Refresh token hasheado salvo para usuário ${userId}`);
  } catch (error) {
    logger.error('Erro ao salvar refresh token:', error.message);
  }
}

// Atualizar função verifyRefreshToken (linha 82-107)
async function verifyRefreshToken(token) {
  try {
    // Verifica JWT primeiro
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // 🔒 SEGURANÇA: Busca pelo hash do token
    const tokenHash = hashToken(token);

    // Verifica no banco se não foi revogado
    const [results] = await db.query(
      `SELECT * FROM refresh_tokens
       WHERE token_hash = ? AND revoked = FALSE AND expires_at > NOW()`,
      [tokenHash]
    );

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

// Atualizar função revokeRefreshToken (linha 115-127)
async function revokeRefreshToken(token, replacedByToken = null) {
  try {
    // 🔒 SEGURANÇA: Revoga pelo hash
    const tokenHash = hashToken(token);
    const replacedByHash = replacedByToken ? hashToken(replacedByToken) : null;

    await db.query(
      'UPDATE refresh_tokens SET revoked = TRUE, replaced_by_token = ? WHERE token_hash = ?',
      [replacedByHash, tokenHash]
    );

    logger.info('Refresh token revogado');
  } catch (error) {
    logger.error('Erro ao revogar refresh token:', error.message);
  }
}

// Exportar hashToken também
module.exports = {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
  revokeRefreshToken,
  cleanupExpiredTokens,
  revokeAllUserTokens,
  hashToken // ← Adicionar export
};
```

#### Passo 3: Integrar Migration

Adicionar em `backend/db/migrations.js`:

```javascript
/**
 * Verifica se coluna token_hash existe
 */
async function checkTokenHashColumn() {
    try {
        const [columns] = await db.query(
            "SHOW COLUMNS FROM refresh_tokens LIKE 'token_hash'"
        );
        return columns.length > 0;
    } catch (error) {
        logger.error('Erro ao verificar coluna token_hash:', error);
        return false;
    }
}

/**
 * Adiciona coluna token_hash para hashing de tokens
 */
async function addTokenHashColumn() {
    try {
        logger.info('🔒 Adicionando coluna token_hash para segurança...');

        const sqlPath = path.join(__dirname, '../../database/migrations/hash_refresh_tokens.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        const cleanSql = sql
            .split('\n')
            .filter(line => !line.trim().startsWith('--'))
            .join('\n');

        const statements = cleanSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                await db.query(statement);
            } catch (err) {
                if (err.code === 'ER_DUP_KEYNAME' || err.code === 'ER_DUP_INDEX') {
                    logger.warn(`⚠ Índice já existe, continuando...`);
                } else {
                    throw err;
                }
            }
        }

        logger.info('✓ Coluna token_hash adicionada com sucesso');
        logger.info('🔒 SEGURANÇA: Tokens agora armazenados com hash SHA-256');
        return true;
    } catch (error) {
        logger.error('Erro ao adicionar coluna token_hash:', error);
        return false;
    }
}

// Adicionar em runMigrations()
const tokenHashExists = await checkTokenHashColumn();

if (!tokenHashExists) {
    logger.warn('🔒 Coluna token_hash não encontrada. Adicionando para segurança...');
    await addTokenHashColumn();
} else {
    logger.info('✓ Coluna token_hash já existe');
}

// Exportar novas funções
module.exports = {
    // ... funções existentes
    checkTokenHashColumn,
    addTokenHashColumn
};
```

---

### 2. Log Rotation (Prevenir Crescimento Infinito)

**Problema**: Logs crescem infinitamente, podem encher o disco em produção.

**Solução**: Usar winston-daily-rotate-file.

#### Passo 1: Instalar Dependência

```bash
npm install winston-daily-rotate-file --save
```

#### Passo 2: Atualizar backend/utils/logger.js

```javascript
// Adicionar import
const DailyRotateFile = require('winston-daily-rotate-file');

// Substituir transports (linha 43-59) por:
const transports = [
  // Console - sempre ativo
  new winston.transports.Console({
    format: consoleFormat,
  }),

  // 🔒 SEGURANÇA: Arquivo de erros com rotação diária
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true, // Compacta logs antigos
    maxSize: '20m', // Rotaciona se arquivo exceder 20MB
    maxFiles: '14d', // Mantém últimos 14 dias
    level: 'error',
    format: format,
  }),

  // 🔒 SEGURANÇA: Arquivo de todos os logs com rotação
  new DailyRotateFile({
    filename: path.join(__dirname, '../../logs/combined-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '50m', // Rotaciona se arquivo exceder 50MB
    maxFiles: '30d', // Mantém últimos 30 dias
    format: format,
  }),
];
```

**Benefícios**:
- ✅ Logs rotacionam automaticamente a cada dia
- ✅ Logs antigos são compactados (.gz)
- ✅ Logs são deletados após 14/30 dias
- ✅ Disco nunca fica cheio

---

### 3. Aumentar Requisitos de Senha

**Problema**: Senha mínima de 6 caracteres é muito fraca (OWASP recomenda 12+).

**Solução**: Aumentar para 12 caracteres + exigir caracteres especiais.

#### Atualizar backend/routes/auth.js (linha 102-106)

```javascript
// ❌ ANTES
body('password')
    .isLength({ min: 6 })
    .withMessage('Senha deve ter no mínimo 6 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Senha deve conter letras maiúsculas, minúsculas e números')

// ✅ DEPOIS (Conformidade OWASP 2023)
body('password')
    .isLength({ min: 12 })
    .withMessage('Senha deve ter no mínimo 12 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
    .withMessage('Senha deve conter: 12+ caracteres, maiúsculas, minúsculas, números e símbolos (@$!%*?&)')
```

**Atualizar Swagger também** (linha 60-62):

```javascript
*                 minLength: 12  // ← Mudar de 6 para 12
*                 pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])
*                 description: Deve conter 12+ caracteres, maiúsculas, minúsculas, números e símbolos
```

---

### 4. Remover Fallback Inseguro do CSRF Secret

**Problema**: Se CSRF_SECRET não estiver definido, usa fallback previsível.

**Solução**: Falhar rápido (fail-fast) se secret não estiver configurado.

#### Atualizar backend/app.js (linha 185-198)

```javascript
// ❌ ANTES
const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
logger.info(`[CSRF] CSRF_SECRET definido: ${csrfSecret ? 'SIM' : 'NÃO'}`);

if (!csrfSecret) {
  logger.warn('[CSRF] CSRF_SECRET ou JWT_SECRET não definido. CSRF protection será desabilitada.');
}

// ✅ DEPOIS
const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET;

if (!csrfSecret) {
  logger.error('[CSRF] CSRF_SECRET ou JWT_SECRET não definido!');
  throw new Error('CSRF_SECRET ou JWT_SECRET must be defined in .env file');
}

logger.info(`[CSRF] CSRF_SECRET definido com comprimento: ${csrfSecret.length} caracteres`);
```

**E também atualizar** (linha 197-198):

```javascript
// ❌ ANTES
try {
  const csrfProtection = doubleCsrf({
    getSecret: () => csrfSecret || 'fallback-secret-change-in-production',
    // ...

// ✅ DEPOIS
try {
  const csrfProtection = doubleCsrf({
    getSecret: () => csrfSecret, // ← Remove fallback inseguro
    // ...
```

---

## 🟡 MELHORIAS IMPORTANTES (Implementar em 1-2 semanas)

### 5. Centralizar Função logAction

**Criar**: `backend/utils/logAction.js`

```javascript
// backend/utils/logAction.js
const db = require('../db/connection');
const logger = require('./logger');

/**
 * Registra uma ação no sistema de auditoria
 * @param {string} actionType - Tipo da ação (CREATE_CLIENT, UPDATE_CLIENT, etc.)
 * @param {number|null} clientId - ID do cliente relacionado (opcional)
 * @param {string|null} details - Detalhes da ação
 * @param {number|null} userId - ID do usuário que executou a ação
 * @param {boolean} revertable - Se a ação pode ser revertida
 * @param {Object|null} originalData - Dados originais para reversão
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
    logger.debug(`Ação registrada: ${actionType} - Cliente ID: ${clientId}`);
  } catch (error) {
    logger.error('Erro ao registrar ação no log:', error);
  }
}

module.exports = logAction;
```

**Atualizar** `backend/routes/clientes.js` (linha 7-19):

```javascript
// ❌ REMOVER função duplicada (linha 7-19)

// ✅ ADICIONAR import no início do arquivo
const logAction = require('../utils/logAction');
```

---

### 6. Adicionar Validação de Input em Todas as Rotas

**Exemplo para** `/adjust-date/:id`:

```javascript
const { param, body, validationResult } = require('express-validator');

router.put('/adjust-date/:id', [
  // Validações
  param('id').isInt().withMessage('ID deve ser um número inteiro'),
  body('value').isInt().withMessage('Valor deve ser um número inteiro'),
  body('unit').isIn(['DAY', 'MONTH']).withMessage('Unidade deve ser DAY ou MONTH')
], async (req, res) => {
  // Verifica erros de validação
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }

  // Resto da lógica...
});
```

**Aplicar o mesmo padrão** em todas as rotas de clientes.js e servicos.js.

---

### 7. Configurar Timezone no Banco de Dados

**Atualizar** `backend/db/connection.js`:

```javascript
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    timezone: '+00:00', // ✅ UTC para consistência
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20, // ✅ Configurável
    queueLimit: 0,
    connectTimeout: 10000, // ✅ Timeout de conexão (10s)
    acquireTimeout: 10000  // ✅ Timeout de aquisição (10s)
}).promise();
```

---

### 8. Sanitizar Logs (Prevenir vazamento de PII)

**Criar**: `backend/utils/sanitizer.js`

```javascript
// backend/utils/sanitizer.js

/**
 * Remove dados sensíveis de objetos antes de logar
 * @param {Object} data - Dados a serem sanitizados
 * @returns {Object} Dados sanitizados
 */
function sanitizeForLogging(data) {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitive = ['password', 'token', 'secret', 'authorization', 'cookie'];
  const sanitized = { ...data };

  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();

    // Remove completamente campos sensíveis
    if (sensitive.some(s => lowerKey.includes(s))) {
      sanitized[key] = '[REDACTED]';
    }

    // Ofusca emails (mantém 3 primeiros caracteres)
    if (lowerKey.includes('email') && typeof sanitized[key] === 'string') {
      const email = sanitized[key];
      sanitized[key] = email.substring(0, 3) + '***@***';
    }

    // Recursivo para objetos aninhados
    if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key]);
    }
  }

  return sanitized;
}

module.exports = { sanitizeForLogging };
```

**Usar em** `backend/routes/auth.js`:

```javascript
const { sanitizeForLogging } = require('../utils/sanitizer');

// ✅ Sanitizar antes de logar
logger.info('[LOGIN] Tentativa de login:', sanitizeForLogging(req.body));
```

---

## 🟢 MELHORIAS MÉDIAS (Melhorias Futuras)

### 9. Migrar body-parser → express.json()

**Atualizar** `backend/app.js`:

```javascript
// ❌ REMOVER (linha 2, 179)
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// ✅ ADICIONAR
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
```

**Remover dependência**:
```bash
npm uninstall body-parser
```

---

### 10. Criar Arquivo de Constantes

**Criar**: `backend/constants/index.js`

```javascript
// backend/constants/index.js

module.exports = {
  // Auth
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  MAX_TOKENS_PER_USER: 5,
  MIN_PASSWORD_LENGTH: 12,

  // Rate Limiting
  GLOBAL_RATE_LIMIT: 100,
  AUTH_RATE_LIMIT: 10,
  AUTHENTICATED_RATE_LIMIT: 500,
  RATE_LIMIT_WINDOW_MS: 15 * 60 * 1000,

  // Business Rules
  DEFAULT_VALOR_COBRADO: 15.00,
  DEFAULT_CUSTO: 6.00,
  CALENDAR_DAYS: 31,
  ALERT_DAYS_THRESHOLD: 3,

  // Database
  DEFAULT_CONNECTION_LIMIT: 20,
  CONNECTION_TIMEOUT_MS: 10000,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Logs
  LOG_RETENTION_DAYS: 30,
  ERROR_LOG_RETENTION_DAYS: 14
};
```

**Usar nas rotas**:

```javascript
const constants = require('../constants');

// ❌ ANTES
const valorCobrado = valor_cobrado || 15.00;

// ✅ DEPOIS
const valorCobrado = valor_cobrado || constants.DEFAULT_VALOR_COBRADO;
```

---

## 📊 Checklist de Implementação

### Crítico (Fazer Hoje)
- [ ] 1. Implementar hashing de refresh tokens
  - [ ] Criar migration
  - [ ] Atualizar tokens.js
  - [ ] Integrar em migrations.js
  - [ ] Testar login/refresh/logout

- [ ] 2. Adicionar log rotation
  - [ ] Instalar winston-daily-rotate-file
  - [ ] Atualizar logger.js
  - [ ] Testar criação de logs

- [ ] 3. Aumentar requisitos de senha
  - [ ] Atualizar validação em auth.js
  - [ ] Atualizar documentação Swagger
  - [ ] Testar registro com senhas fracas/fortes

- [ ] 4. Remover fallback CSRF
  - [ ] Atualizar app.js
  - [ ] Verificar .env tem CSRF_SECRET
  - [ ] Testar startup sem secret (deve falhar)

### Importante (1-2 semanas)
- [ ] 5. Centralizar logAction
  - [ ] Criar utils/logAction.js
  - [ ] Atualizar clientes.js
  - [ ] Testar logging de ações

- [ ] 6. Adicionar validação de input
  - [ ] Adicionar validadores em rotas críticas
  - [ ] Testar com inputs inválidos

- [ ] 7. Configurar timezone DB
  - [ ] Atualizar connection.js
  - [ ] Reiniciar servidor
  - [ ] Verificar datas estão corretas

- [ ] 8. Sanitizar logs
  - [ ] Criar utils/sanitizer.js
  - [ ] Atualizar logs em auth.js
  - [ ] Verificar logs não expõem PII

### Opcional (Melhorias Futuras)
- [ ] 9. Migrar para express.json()
- [ ] 10. Criar arquivo de constantes
- [ ] 11. Adicionar testes automatizados
- [ ] 12. Implementar camada de serviço

---

## 🚀 Após Implementar Tudo

**Nova Pontuação Estimada**: 9.0/10 🎯

✅ Segurança: 9.5/10
✅ Performance: 8.5/10
✅ Manutenibilidade: 9.0/10
✅ Qualidade de Código: 9.0/10

Seu sistema estará em **excelente estado de produção**!
