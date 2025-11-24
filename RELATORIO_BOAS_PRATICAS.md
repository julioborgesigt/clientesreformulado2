# 📋 Relatório de Análise de Boas Práticas

**Data**: 2025-11-23
**Projeto**: API de Gestão de Clientes - Backend
**Revisor**: Claude Code - Análise Automática

---

## 🎯 Resumo Executivo

**Pontuação Geral**: 7.2/10

### Pontos Fortes ✅
- ✅ Segurança user_id implementada (isolamento de dados)
- ✅ Rate limiting multi-camadas
- ✅ Autenticação JWT com refresh tokens
- ✅ Migrations automáticas
- ✅ Logger estruturado com Winston
- ✅ Validação de entrada com express-validator
- ✅ Documentação Swagger

### Áreas de Melhoria 🔧
- ⚠️ **CRÍTICO**: Tokens armazenados em plaintext (deveriam ser hasheados)
- ⚠️ **CRÍTICO**: Password mínimo de 6 caracteres (deveria ser 12+)
- ⚠️ **ALTO**: Logs sem rotação (crescimento infinito)
- ⚠️ **ALTO**: Código duplicado (função logAction)
- ⚠️ **MÉDIO**: Falta de camada de serviço (business logic nos controllers)
- ⚠️ **MÉDIO**: Magic numbers espalhados no código

---

## 📁 Análise por Arquivo

### 1. `backend/app.js`

#### ❌ Problemas Críticos

**1.1. Uso de `body-parser` deprecated**
```javascript
// ❌ ATUAL (linha 2, 179)
const bodyParser = require('body-parser');
app.use(bodyParser.json());

// ✅ DEVERIA SER
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
```
**Impacto**: `body-parser` está deprecated desde Express 4.16.0
**Prioridade**: BAIXA (funciona, mas não é best practice)

**1.2. CSRF Secret com fallback inseguro**
```javascript
// ❌ ATUAL (linha 198)
getSecret: () => csrfSecret || 'fallback-secret-change-in-production',

// ✅ DEVERIA SER
getSecret: () => {
  if (!csrfSecret) {
    throw new Error('CSRF_SECRET must be defined');
  }
  return csrfSecret;
}
```
**Impacto**: Em produção sem CSRF_SECRET, usa secret previsível
**Prioridade**: ALTA

**1.3. Middleware de CORS duplicado**
```javascript
// ❌ ATUAL: Middleware manual (linha 44-72) + cors() (linha 132)
// Ambos fazem a mesma coisa

// ✅ DEVERIA SER: Usar apenas cors() com configuração completa
```
**Impacto**: Performance (processamento duplicado)
**Prioridade**: MÉDIA

**1.4. Rate limiting muito permissivo**
```javascript
// ❌ ATUAL (linha 139, 162)
max: 500,  // 500 req/15min para POST/PUT/DELETE
max: 2000, // 2000 req/15min para autenticados

// ✅ RECOMENDADO para API normal
max: 100,  // 100 req/15min para escrita
max: 500,  // 500 req/15min para autenticados
```
**Impacto**: Vulnerável a ataques de DoS
**Prioridade**: MÉDIA

#### ⚠️ Problemas Moderados

**1.5. Logs excessivos em produção**
```javascript
// ❌ ATUAL: Muitos logger.info() em cada requisição
// Exemplo: linhas 47, 48, 51, 112, 113, etc.

// ✅ DEVERIA: Log apenas em development ou com nível debug
if (process.env.NODE_ENV !== 'production') {
  logger.info(...);
}
```
**Impacto**: Performance e custo de armazenamento de logs
**Prioridade**: MÉDIA

**1.6. CSP muito restritiva para API**
```javascript
// ❌ ATUAL (linha 77-95): CSP configurada para API
// APIs geralmente não precisam de CSP (é para browsers)

// ✅ RECOMENDADO: Remover CSP ou simplificar
contentSecurityPolicy: false, // API não serve HTML
```
**Impacto**: Headers desnecessários
**Prioridade**: BAIXA

---

### 2. `backend/routes/auth.js`

#### ❌ Problemas Críticos

**2.1. Validação de senha muito fraca**
```javascript
// ❌ ATUAL (linha 103-106)
.isLength({ min: 6 })
.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)

// ✅ DEVERIA SER (OWASP 2023)
.isLength({ min: 12 })
.matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
.withMessage('Senha deve ter 12+ caracteres, maiúsculas, minúsculas, números e caracteres especiais')
```
**Impacto**: Senhas fracas facilitam ataques de força bruta
**Prioridade**: CRÍTICA 🔴

**2.2. Logging de dados sensíveis**
```javascript
// ❌ ATUAL (linha 253)
logger.info(`[LOGIN] Tentativa de login para: ${email}`);

// ✅ DEVERIA SER
logger.info(`[LOGIN] Tentativa de login para: ${email.substring(0,3)}***`);
// Ou não logar o email completo
```
**Impacto**: Vazamento de PII em logs
**Prioridade**: ALTA

#### ⚠️ Problemas Moderados

**2.3. authLimiter muito restritivo**
```javascript
// ❌ ATUAL (linha 24)
max: 5, // 5 tentativas/15min

// ✅ RECOMENDADO
max: 10, // 10 tentativas/15min
skipSuccessfulRequests: true, // Já está correto
```
**Impacto**: Pode bloquear usuários legítimos que erram senha
**Prioridade**: MÉDIA

**2.4. Falta de proteção contra timing attacks**
```javascript
// ❌ ATUAL (linha 272-276)
const match = await bcrypt.compare(password, user.password);
if (!match) {
  return res.status(401).json({ error: 'Credenciais inválidas.' });
}

// ✅ DEVERIA usar constant-time comparison para evitar timing attacks
// Já está bom com bcrypt, mas poderia adicionar delay artificial
```
**Impacto**: Informações podem vazar via tempo de resposta
**Prioridade**: BAIXA

---

### 3. `backend/routes/clientes.js` & `backend/routes/servicos.js`

#### ❌ Problemas Críticos

**3.1. Função logAction duplicada**
```javascript
// ❌ ATUAL: Definida em clientes.js (linha 7-19)
// Deveria estar em backend/utils/logAction.js

// ✅ CRIAR: backend/utils/logAction.js
async function logAction(actionType, clientId = null, details = null, userId = null, revertable = false, originalData = null) {
  // ... implementação
}
module.exports = logAction;
```
**Impacto**: Código duplicado, dificulta manutenção
**Prioridade**: ALTA

**3.2. Falta de validação de input**
```javascript
// ❌ ATUAL: Muitas rotas sem validação
// Exemplo: PUT /adjust-date/:id (linha 112-187)

// ✅ DEVERIA usar express-validator como em auth.js
router.put('/adjust-date/:id', [
  param('id').isInt(),
  body('value').isInt(),
  body('unit').isIn(['DAY', 'MONTH'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // ...
});
```
**Impacto**: Vulnerável a dados malformados
**Prioridade**: ALTA

**3.3. Magic numbers espalhados**
```javascript
// ❌ ATUAL
Array(31).fill(0); // linha 438 clientes.js
const threeDays = new Date(); threeDays.setDate(threeDays.getDate() + 3); // linha 312

// ✅ CRIAR: backend/constants/index.js
const CALENDAR_DAYS = 31;
const ALERT_DAYS_THRESHOLD = 3;
const DEFAULT_VALOR_COBRADO = 15.00;
const DEFAULT_CUSTO = 6.00;
```
**Impacto**: Dificulta manutenção
**Prioridade**: MÉDIA

#### ⚠️ Problemas Moderados

**3.4. Queries SQL inline (não usa query builder)**
```javascript
// ❌ ATUAL: SQL direto nos controllers
const query = `SELECT * FROM clientes WHERE user_id = ? ...`;

// ✅ DEVERIA considerar usar Knex.js ou similar
const clients = await db('clientes')
  .where({ user_id: userId })
  .select('*');
```
**Impacto**: Dificulta testes e manutenção
**Prioridade**: MÉDIA

**3.5. Falta de paginação em algumas rotas**
```javascript
// ⚠️ ATENÇÃO: Rota /pending-this-month não tem paginação
// Se houver 1000+ clientes, retorna todos de uma vez

// ✅ DEVERIA adicionar limit/offset
```
**Impacto**: Performance com muitos registros
**Prioridade**: MÉDIA

---

### 4. `backend/db/connection.js`

#### ❌ Problemas Críticos

**4.1. Sem configuração de timezone**
```javascript
// ❌ ATUAL
const db = mysql.createPool({
    host: process.env.DB_HOST,
    // ... falta timezone
});

// ✅ DEVERIA SER
const db = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    timezone: '+00:00', // UTC
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 20,
    queueLimit: 0,
    connectTimeout: 10000,
    acquireTimeout: 10000
});
```
**Impacto**: Datas podem ter timezone incorreto
**Prioridade**: ALTA

**4.2. ConnectionLimit muito baixo**
```javascript
// ❌ ATUAL (linha 10)
connectionLimit: 10,

// ✅ RECOMENDADO para produção
connectionLimit: 20, // Ou configurável via env
```
**Impacto**: Performance sob carga
**Prioridade**: MÉDIA

#### ⚠️ Problemas Moderados

**4.3. Sem retry logic para reconexão**
```javascript
// ✅ DEVERIA adicionar:
db.on('error', (err) => {
  logger.error('Database connection error:', err);
  if (err.code === 'PROTOCOL_CONNECTION_LOST') {
    // Implementar lógica de reconexão
  }
});
```
**Impacto**: Falha permanente se conexão cair
**Prioridade**: MÉDIA

**4.4. Sem health check do pool**
```javascript
// ✅ DEVERIA adicionar função health check
async function checkDatabaseHealth() {
  try {
    const [result] = await db.query('SELECT 1');
    return result !== null;
  } catch (error) {
    return false;
  }
}
```
**Impacto**: Dificulta monitoramento
**Prioridade**: BAIXA

---

### 5. `backend/utils/tokens.js`

#### ❌ Problemas CRÍTICOS

**5.1. Tokens armazenados em plaintext**
```javascript
// ❌ ATUAL (linha 65-68): Token salvo sem hash
await db.query(
  'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
  [userId, token, expiresAt]
);

// ✅ DEVERIA SER
const crypto = require('crypto');

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Salvar hash
const tokenHash = hashToken(token);
await db.query(
  'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
  [userId, tokenHash, expiresAt]
);

// Verificar hash
const tokenHash = hashToken(token);
const [results] = await db.query(
  'SELECT * FROM refresh_tokens WHERE token_hash = ? ...',
  [tokenHash]
);
```
**Impacto**: Se banco vazar, todos os refresh tokens são expostos
**Prioridade**: CRÍTICA 🔴

**5.2. Fallback para JWT_SECRET inseguro**
```javascript
// ❌ ATUAL (linha 28, 87)
process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET

// ✅ DEVERIA SER
if (!process.env.JWT_REFRESH_SECRET) {
  throw new Error('JWT_REFRESH_SECRET must be defined');
}
```
**Impacto**: Usar mesma chave para access e refresh é inseguro
**Prioridade**: ALTA

#### ⚠️ Problemas Moderados

**5.3. Query ineficiente para deletar tokens antigos**
```javascript
// ❌ ATUAL (linha 45-57): Subquery complexa
DELETE FROM refresh_tokens
WHERE user_id = ?
AND id NOT IN (
  SELECT id FROM (
    SELECT id FROM refresh_tokens ...
  ) AS recent_tokens
)

// ✅ DEVERIA SER (mais eficiente)
WITH ranked_tokens AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
  FROM refresh_tokens
  WHERE user_id = ? AND revoked = FALSE
)
DELETE FROM refresh_tokens
WHERE id IN (SELECT id FROM ranked_tokens WHERE rn > ?)
```
**Impacto**: Performance com muitos tokens
**Prioridade**: MÉDIA

---

### 6. `backend/utils/logger.js`

#### ❌ Problemas Críticos

**6.1. Logs sem rotação (crescimento infinito)**
```javascript
// ❌ ATUAL (linha 49-58): Logs crescem infinitamente
new winston.transports.File({
  filename: path.join(__dirname, '../../logs/error.log'),
  level: 'error',
  format: format,
}),

// ✅ DEVERIA SER
const DailyRotateFile = require('winston-daily-rotate-file');

new DailyRotateFile({
  filename: path.join(__dirname, '../../logs/error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d', // Mantém 14 dias
  level: 'error',
  format: format,
}),
```
**Impacto**: Disco cheio em produção
**Prioridade**: CRÍTICA 🔴

**6.2. Logs podem conter informação sensível**
```javascript
// ⚠️ ATENÇÃO: Logger não sanitiza dados
// ✅ DEVERIA ter função para remover PII
function sanitizeLogData(data) {
  const sensitive = ['password', 'token', 'secret', 'authorization'];
  // ... remover campos sensíveis
}
```
**Impacto**: Vazamento de dados sensíveis em logs
**Prioridade**: ALTA

---

### 7. `backend/middleware/authMiddleware.js`

#### ✅ Bem implementado

O middleware está correto após a correção do bug `userId` → `id`.

**Sugestões de melhoria:**
```javascript
// ✅ PODERIA adicionar blacklist de tokens
const tokenBlacklist = new Set();

// Verificar se token está na blacklist
if (tokenBlacklist.has(token)) {
  return res.status(401).json({ error: 'Token inválido!' });
}
```
**Prioridade**: BAIXA (nice to have)

---

## 🏗️ Problemas Arquiteturais

### 1. Falta de Camada de Serviço

**❌ Problema**: Business logic nos controllers
```javascript
// ❌ ATUAL: clientes.js tem lógica de negócio
router.post('/add', async (req, res) => {
  // Validação, transformação, SQL tudo junto
});

// ✅ DEVERIA SER:
// backend/services/ClienteService.js
class ClienteService {
  async createCliente(userId, data) {
    // Validação e lógica de negócio
    const valorCobrado = data.valor_cobrado || DEFAULT_VALOR_COBRADO;
    // ...
    return await ClienteRepository.create({ ...data, userId });
  }
}

// backend/controllers/ClienteController.js
router.post('/add', async (req, res) => {
  const cliente = await ClienteService.createCliente(req.userData.id, req.body);
  res.status(201).json(cliente);
});
```
**Prioridade**: MÉDIA (melhora testabilidade)

### 2. Falta de DTOs/Schemas Centralizados

**❌ Problema**: Validações espalhadas
```javascript
// ✅ DEVERIA criar: backend/schemas/clienteSchema.js
const createClienteSchema = {
  name: {
    in: ['body'],
    trim: true,
    isLength: { min: 2, max: 100 }
  },
  // ...
};

// Usar com checkSchema
router.post('/add', checkSchema(createClienteSchema), async (req, res) => {
  // ...
});
```
**Prioridade**: MÉDIA

### 3. Falta de Testes

**❌ Problema**: Nenhum teste automatizado
```javascript
// ✅ DEVERIA ter:
// __tests__/unit/services/ClienteService.test.js
// __tests__/integration/routes/clientes.test.js
// __tests__/e2e/auth.test.js
```
**Prioridade**: ALTA (para produção)

---

## 📊 Constantes que deveriam ser centralizadas

**Criar**: `backend/constants/index.js`
```javascript
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
  RATE_LIMIT_WINDOW: 15 * 60 * 1000,

  // Business
  DEFAULT_VALOR_COBRADO: 15.00,
  DEFAULT_CUSTO: 6.00,
  CALENDAR_DAYS: 31,
  ALERT_DAYS_THRESHOLD: 3,

  // Database
  DEFAULT_CONNECTION_LIMIT: 20,
  CONNECTION_TIMEOUT: 10000,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100
};
```

---

## 🎯 Priorização de Melhorias

### 🔴 CRÍTICO (Implementar Imediatamente)
1. ✅ **Já corrigido**: Bug authMiddleware `userId` → `id`
2. ⚠️ **Tokens em plaintext** → Implementar hashing
3. ⚠️ **Logs sem rotação** → Adicionar winston-daily-rotate-file
4. ⚠️ **Senha mínimo 6 chars** → Aumentar para 12+ com chars especiais

### 🟡 ALTO (Implementar em 1-2 semanas)
5. CSRF secret fallback inseguro
6. Validação de input faltando em rotas
7. Função logAction duplicada → Centralizar
8. Timezone não configurado no DB
9. Logging de PII sem sanitização

### 🟢 MÉDIO (Melhorias futuras)
10. Migrar body-parser → express.json()
11. Magic numbers → Constantes centralizadas
12. Rate limiting muito permissivo
13. Adicionar camada de serviço
14. Query builder ao invés de SQL inline
15. DTOs/Schemas centralizados

### 🔵 BAIXO (Nice to have)
16. CSP desnecessária para API
17. Middleware CORS duplicado
18. Health check do pool de conexões
19. Retry logic para reconexão DB
20. Testes automatizados

---

## 📈 Métricas de Qualidade

| Categoria | Pontuação | Status |
|-----------|-----------|--------|
| Segurança | 8.0/10 | ✅ Bom |
| Performance | 7.0/10 | ⚠️ Melhorar |
| Manutenibilidade | 6.5/10 | ⚠️ Melhorar |
| Testabilidade | 4.0/10 | ❌ Crítico |
| Documentação | 7.5/10 | ✅ Bom |
| **GERAL** | **7.2/10** | ⚠️ Bom mas com pontos críticos |

---

## 🔧 Próximos Passos Recomendados

1. **Fase 1 (Urgente - 1 dia)**
   - [ ] Implementar hashing de refresh tokens
   - [ ] Adicionar log rotation
   - [ ] Aumentar requisitos de senha para 12+ chars

2. **Fase 2 (Importante - 3 dias)**
   - [ ] Centralizar função logAction
   - [ ] Adicionar validação de input em todas as rotas
   - [ ] Configurar timezone no DB
   - [ ] Remover CSRF fallback inseguro

3. **Fase 3 (Melhorias - 1 semana)**
   - [ ] Criar arquivo de constantes
   - [ ] Refatorar rate limiting
   - [ ] Adicionar sanitização de logs
   - [ ] Migrar body-parser

4. **Fase 4 (Arquitetura - 2 semanas)**
   - [ ] Implementar camada de serviço
   - [ ] Criar DTOs/Schemas centralizados
   - [ ] Adicionar testes unitários
   - [ ] Adicionar testes de integração

---

## 📝 Conclusão

O código tem uma **base sólida de segurança** com isolamento de dados por user_id, autenticação JWT robusta, e rate limiting. No entanto, existem **4 pontos críticos** que precisam ser corrigidos imediatamente:

1. ✅ Tokens em plaintext (hashe-los)
2. ✅ Logs sem rotação (adicionar rotação)
3. ✅ Senha com apenas 6 caracteres (aumentar para 12+)
4. ✅ CSRF secret com fallback inseguro

Após corrigir estes pontos, o código estará em **excelente estado** para produção.

**Pontuação Estimada Após Correções**: 8.5/10 🎯
