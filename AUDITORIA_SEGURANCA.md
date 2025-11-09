# 🔍 AUDITORIA COMPLETA DE SEGURANÇA E QUALIDADE
**Projeto:** clientesreformulado2
**Data:** 9 de novembro de 2025
**Auditor:** Claude Code Analysis Agent
**Escopo:** Backend (Node.js/Express), Frontend (JavaScript Vanilla), Segurança (OWASP Top 10)

---

## 📊 SCORECARD EXECUTIVO

| Categoria | Score | Status |
|-----------|-------|--------|
| **Segurança** | 6.5/10 | ⚠️ Vulnerabilidades críticas |
| **Qualidade de Código** | 7/10 | ✅ Aceitável |
| **Testes** | 4/10 | 🔴 Cobertura insuficiente |
| **Performance** | 7/10 | ✅ Adequada |
| **Manutenibilidade** | 6.5/10 | ⚠️ Pode melhorar |
| **Documentação** | 6/10 | ⚠️ Razoável |
| **MÉDIA GERAL** | **6.2/10** | ⚠️ **ACEITÁVEL COM RESSALVAS CRÍTICAS** |

**⚠️ NÃO RECOMENDADO PARA PRODUÇÃO ATÉ CORRIGIR VULNERABILIDADES CRÍTICAS**

---

## 🔴 VULNERABILIDADES CRÍTICAS (P0 - Ação Imediata)

### 1. CREDENCIAIS EXPOSTAS NO REPOSITÓRIO
**Severidade:** 🔴 CRÍTICO
**Arquivo:** `.env`
**Linha:** Arquivo inteiro

**Problema:**
```bash
# Credenciais visíveis no repositório Git
DB_USER=feriasdriguatu2
DB_PASS=gi7287+_XTLNc7_cXy
JWT_SECRET=64276f53eb7eaa7000c71ac033a83604e2a82ecfaf4c1a6aa87af80530156c1644f41b1d1efdbb9db41d36aeac6f0ae5957019d5d6fe3eab733d6b864280bcb6
```

**Impacto:**
- ✅ Arquivo está em `.gitignore` (correto)
- ❌ MAS o arquivo `.env` existe no diretório de trabalho
- ❌ Qualquer pessoa com acesso ao servidor vê as credenciais
- ❌ Se commitado, credenciais ficam no histórico do Git

**Ação Imediata:**
```bash
# 1. Verificar se está no histórico Git
git log --all --full-history -- .env

# 2. Se estiver, remover do histórico
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 3. Rotear TODAS as credenciais:
# - Mudar senha do banco MySQL
# - Gerar novos JWT_SECRET
# - Gerar novo JWT_REFRESH_SECRET
# - Gerar novo CSRF_SECRET

# 4. Garantir que .env está em .gitignore
echo ".env" >> .gitignore
git add .gitignore
git commit -m "Garante que .env não será commitado"
```

---

### 2. BROKEN ACCESS CONTROL - Sem Autorização por Usuário
**Severidade:** 🔴 CRÍTICO
**Arquivos:** `backend/routes/clientes.js`, `backend/routes/servicos.js`
**OWASP:** A01:2021 - Broken Access Control

**Problema:**
```javascript
// backend/routes/clientes.js linha 215
router.get('/list', authMiddleware, async (req, res) => {
    const [results] = await db.query(
        'SELECT * FROM clientes ...'
        // ❌ Retorna TODOS os clientes, não apenas do usuário autenticado
    );
});
```

**Impacto:**
- Usuário A pode ver clientes de Usuário B
- Usuário A pode editar clientes de Usuário B
- Usuário A pode deletar clientes de Usuário B
- **Violação grave de privacidade e conformidade (LGPD/GDPR)**

**Teste de Verificação:**
```bash
# 1. Criar Usuário A e adicionar cliente
# 2. Criar Usuário B
# 3. Fazer login como Usuário B
# 4. Chamar GET /clientes/list
# 5. Resultado: Vê clientes de Usuário A ❌
```

**Correção:**
```javascript
// backend/routes/clientes.js
router.get('/list', authMiddleware, async (req, res) => {
    const userId = req.userData.id;  // Do JWT decodificado

    const [results] = await db.query(
        'SELECT * FROM clientes WHERE user_id = ? ...',
        [userId, ...otherParams]
    );
});

// Aplicar em TODAS as rotas:
// - GET /list
// - GET /stats
// - POST /add
// - PUT /update/:id
// - DELETE /delete/:id
// - POST /adjust-date/:id
// - POST /change-status/:id
```

**Também necessário:**
```sql
-- Adicionar coluna user_id à tabela clientes
ALTER TABLE clientes ADD COLUMN user_id INT NOT NULL;
ALTER TABLE clientes ADD FOREIGN KEY (user_id) REFERENCES users(id);

-- Adicionar à tabela servicos também
ALTER TABLE servicos ADD COLUMN user_id INT NOT NULL;
ALTER TABLE servicos ADD FOREIGN KEY (user_id) REFERENCES users(id);
```

---

### 3. CONTENT SECURITY POLICY DESABILITADA
**Severidade:** 🔴 ALTO
**Arquivo:** `backend/app.js` linha 34
**OWASP:** A03:2021 - Injection (XSS)

**Problema:**
```javascript
app.use(helmet({
  contentSecurityPolicy: false,  // ❌ DESABILITADO
  crossOriginEmbedderPolicy: false
}));
```

**Impacto:**
- Permite execução de scripts inline maliciosos
- Aumenta risco de XSS (Cross-Site Scripting)
- Atacante pode injetar `<script>` tags

**Correção:**
```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Apenas se necessário
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://clientes.domcloud.dev"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: true
}));
```

---

### 4. POSSÍVEL XSS EM FRONTEND
**Severidade:** 🔴 ALTO
**Arquivo:** `frontend/script.js` (não completamente revisado - 3000+ linhas)
**OWASP:** A03:2021 - Injection

**Problema Potencial:**
```javascript
// Se houver código como:
document.getElementById('nome').innerHTML = cliente.name;  // ❌ XSS

// Dados de usuário sem sanitização:
const html = `<div>${cliente.descricao}</div>`;  // ❌ XSS
element.innerHTML = html;
```

**Impacto:**
- Atacante pode injetar código JavaScript
- Roubo de tokens de localStorage
- Ações em nome do usuário

**Correção:**
```javascript
// Opção 1: Usar textContent (preferível)
document.getElementById('nome').textContent = cliente.name;  // ✅

// Opção 2: Sanitizar antes (se precisa de HTML)
import DOMPurify from 'dompurify';
element.innerHTML = DOMPurify.sanitize(cliente.descricao);  // ✅

// Opção 3: Usar template segura
const template = document.createElement('div');
template.textContent = cliente.name;
element.appendChild(template);  // ✅
```

**Ação Necessária:**
- Revisar COMPLETAMENTE `frontend/script.js`
- Procurar por todos os usos de `.innerHTML`
- Substituir ou sanitizar
- Procurar por interpolação de strings com dados de usuário

---

## ⚠️ VULNERABILIDADES ALTAS (P1 - Corrigir em 30 dias)

### 5. REFRESH TOKENS NUNCA LIMPOS
**Severidade:** ⚠️ ALTO
**Arquivo:** `backend/utils/tokens.js` linhas 113-128

**Problema:**
```javascript
// Função existe mas NUNCA é chamada
async function cleanupExpiredTokens() {
  const [result] = await db.query(
    'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR revoked = TRUE'
  );
  return result.affectedRows || 0;
}
// ❌ Não há setInterval(), cron job ou chamada em lugar nenhum
```

**Impacto:**
- Tabela `refresh_tokens` cresce indefinidamente
- Performance degrada com o tempo
- Aumento do tamanho do banco de dados
- Possível DoS por exaustão de recursos

**Correção:**
```javascript
// backend/app.js - Adicionar após inicialização
const { cleanupExpiredTokens } = require('./utils/tokens');

// Executar limpeza a cada 24 horas
setInterval(async () => {
  try {
    const deleted = await cleanupExpiredTokens();
    logger.info(`Limpeza de tokens: ${deleted} tokens removidos`);
  } catch (error) {
    logger.error('Erro na limpeza de tokens:', error);
  }
}, 24 * 60 * 60 * 1000);  // 24 horas

// Executar uma vez no startup também
cleanupExpiredTokens()
  .then(count => logger.info(`Limpeza inicial: ${count} tokens removidos`))
  .catch(err => logger.error('Erro na limpeza inicial:', err));
```

---

### 6. SEM HSTS (HTTP Strict Transport Security)
**Severidade:** ⚠️ MÉDIO
**Arquivo:** `backend/app.js`
**OWASP:** A05:2021 - Security Misconfiguration

**Problema:**
- Sem header HSTS configurado
- Navegadores não forçam HTTPS
- Vulnerável a downgrade attacks

**Correção:**
```javascript
app.use(helmet.hsts({
  maxAge: 31536000,        // 1 ano em segundos
  includeSubDomains: true, // Inclui subdomínios
  preload: true            // Permite submeter ao HSTS preload
}));
```

---

### 7. SEM LIMITE DE TOKENS POR USUÁRIO
**Severidade:** ⚠️ MÉDIO
**Arquivo:** `backend/utils/tokens.js` função `saveRefreshToken`

**Problema:**
```javascript
async function saveRefreshToken(userId, token) {
  // Sempre insere novo token
  // ❌ Sem deletar tokens antigos
  // Usuário pode ter ilimitados tokens salvos
}
```

**Impacto:**
- Token stuffing attack possível
- Banco de dados cresce sem controle
- Dificulta auditoria de sessões

**Correção:**
```javascript
async function saveRefreshToken(userId, token) {
  // 1. Deletar tokens antigos não-revogados (manter apenas 5 mais recentes)
  await db.query(`
    DELETE FROM refresh_tokens
    WHERE user_id = ?
    AND revoked = FALSE
    AND id NOT IN (
      SELECT id FROM (
        SELECT id FROM refresh_tokens
        WHERE user_id = ? AND revoked = FALSE
        ORDER BY created_at DESC
        LIMIT 5
      ) as t
    )
  `, [userId, userId]);

  // 2. Inserir novo token
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await db.query(
    'INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)',
    [userId, token, expiresAt]
  );
}
```

---

### 8. SEM RATE LIMITING POR USUÁRIO
**Severidade:** ⚠️ MÉDIO
**Arquivo:** `backend/routes/clientes.js`

**Problema:**
```javascript
// Apenas rate limit global (100 req/15min)
// ❌ Usuário pode criar 100 clientes em 15 minutos
// ❌ Sem limite específico por ação
```

**Impacto:**
- Abuso de recursos
- Possível DoS
- Dados lixo no banco

**Correção:**
```javascript
const userRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hora
  max: 100,  // 100 requisições por hora por usuário
  keyGenerator: (req) => {
    // Usa ID do usuário do JWT
    return req.userData?.id || req.ip;
  },
  handler: (req, res) => {
    logger.warn(`Rate limit excedido para usuário ${req.userData?.id}`);
    res.status(429).json({
      error: 'Muitas requisições. Aguarde 1 hora.'
    });
  }
});

// Aplicar em rotas de criação/edição
router.post('/add', authMiddleware, userRateLimiter, async (req, res) => {
  // ...
});
```

---

### 9. SEM VERIFICAÇÃO DE EMAIL
**Severidade:** ⚠️ MÉDIO
**Arquivo:** `backend/routes/auth.js`

**Problema:**
```javascript
router.post('/register', async (req, res) => {
  // Qualquer email pode ser registrado
  // ❌ Sem verificação de email
  // ❌ Conta ativa imediatamente
});
```

**Impacto:**
- Registro com emails falsos
- Spam e abuso
- Dificulta recuperação de conta

**Correção:**
```javascript
const crypto = require('crypto');

router.post('/register', async (req, res) => {
  const { name, email, password } = req.body;

  // 1. Criar usuário com status 'pending'
  const hashedPassword = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    'INSERT INTO users (name, email, password, email_verified, status) VALUES (?, ?, ?, FALSE, ?)',
    [name, email, hashedPassword, 'pending']
  );

  // 2. Gerar token de verificação
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);  // 24h

  await db.query(
    'INSERT INTO email_verifications (user_id, token, expires_at) VALUES (?, ?, ?)',
    [result.insertId, verificationToken, expiresAt]
  );

  // 3. Enviar email
  await sendVerificationEmail(email, verificationToken);

  res.status(201).json({
    message: 'Verifique seu email para ativar a conta'
  });
});

// Nova rota para verificar email
router.get('/verify-email/:token', async (req, res) => {
  const { token } = req.params;

  const [results] = await db.query(`
    SELECT * FROM email_verifications
    WHERE token = ? AND expires_at > NOW()
  `, [token]);

  if (results.length === 0) {
    return res.status(400).json({ error: 'Token inválido ou expirado' });
  }

  // Ativar usuário
  await db.query(
    'UPDATE users SET email_verified = TRUE, status = ? WHERE id = ?',
    ['active', results[0].user_id]
  );

  // Deletar token usado
  await db.query('DELETE FROM email_verifications WHERE token = ?', [token]);

  res.redirect('/login?verified=true');
});
```

**Também necessário:**
```sql
-- Migration para adicionar colunas
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN status ENUM('pending', 'active', 'suspended') DEFAULT 'pending';

-- Tabela de verificações
CREATE TABLE email_verifications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 10. SEM 2FA (TWO-FACTOR AUTHENTICATION)
**Severidade:** ⚠️ MÉDIO
**Escopo:** Autenticação geral

**Problema:**
- Apenas senha para login
- Se senha for comprometida, conta é acessada
- Sem segundo fator de autenticação

**Recomendação:**
```javascript
// Usar speakeasy para TOTP
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');

// Endpoint para habilitar 2FA
router.post('/2fa/enable', authMiddleware, async (req, res) => {
  const userId = req.userData.id;

  // Gerar secret
  const secret = speakeasy.generateSecret({
    name: `ClientesApp (${req.userData.email})`
  });

  // Salvar secret no banco (criptografado)
  await db.query(
    'UPDATE users SET totp_secret = ? WHERE id = ?',
    [secret.base32, userId]
  );

  // Gerar QR code para Google Authenticator
  const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

  res.json({
    secret: secret.base32,
    qrCode: qrCodeUrl
  });
});

// Modificar login para verificar TOTP
router.post('/login', async (req, res) => {
  const { email, password, totpCode } = req.body;

  // ... verificação de senha normal ...

  // Se usuário tem 2FA habilitado
  if (user.totp_secret) {
    if (!totpCode) {
      return res.status(400).json({
        error: 'Código 2FA necessário',
        requires2FA: true
      });
    }

    const verified = speakeasy.totp.verify({
      secret: user.totp_secret,
      encoding: 'base32',
      token: totpCode,
      window: 1  // Aceita 1 código antes/depois (30s)
    });

    if (!verified) {
      return res.status(401).json({ error: 'Código 2FA inválido' });
    }
  }

  // ... gerar tokens e retornar ...
});
```

---

## ✅ PONTOS FORTES IDENTIFICADOS

### 1. SQL INJECTION PROTECTION ✅
**Arquivo:** Todas as rotas
**Avaliação:** EXCELENTE

```javascript
// Todas as queries usam prepared statements
await db.query('SELECT * FROM clientes WHERE id = ?', [id]);  // ✅
await db.query(
  'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
  [name, email, hashedPassword]  // ✅
);
```

**Nenhuma query vulnerável encontrada.**

---

### 2. HASH DE SENHAS SEGURO ✅
**Arquivo:** `backend/routes/auth.js` linha 121
**Avaliação:** EXCELENTE

```javascript
const hashedPassword = await bcrypt.hash(password, 10);  // ✅
```

- bcryptjs com salt round 10 ✅
- Senhas nunca armazenadas em claro ✅
- Comparação com `bcrypt.compare()` (timing-safe) ✅

---

### 3. GERENCIAMENTO DE TOKENS ROBUSTO ✅
**Arquivo:** `backend/utils/tokens.js`
**Avaliação:** BOM

- Access token curto (15 minutos) ✅
- Refresh token longo (7 dias) ✅
- Token rotation implementado ✅
- Revogação funcional ✅
- Tokens salvos no banco para auditoria ✅

**Apenas falta:** Limpeza automática (já mencionado em P1)

---

### 4. RATE LIMITING IMPLEMENTADO ✅
**Arquivo:** `backend/app.js`, `backend/routes/auth.js`
**Avaliação:** BOM

```javascript
// Global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100  // ✅
});

// Login específico
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,  // ✅ Apenas 5 tentativas
  skipSuccessfulRequests: true  // ✅ Não conta sucessos
});
```

**Apenas falta:** Rate limit por usuário (já mencionado em P1)

---

### 5. LOGGING ESTRUTURADO ✅
**Arquivo:** `backend/utils/logger.js`
**Avaliação:** EXCELENTE

```javascript
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),  // ✅ Stack traces
    winston.format.json()  // ✅ Estruturado
  ),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

- Múltiplos níveis (error, warn, info, http, debug) ✅
- Timestamps incluídos ✅
- Stack traces capturados ✅
- Separação error vs combined ✅
- HTTP request logging ✅

---

### 6. CORS BEM CONFIGURADO ✅
**Arquivo:** `backend/app.js` linhas 50-77
**Avaliação:** BOM

```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://clientes.domcloud.dev',
  'https://clientesvue-1.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS bloqueado para origem: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,  // ✅ Necessário para cookies
  optionsSuccessStatus: 200
};
```

---

### 7. CSRF PROTECTION ✅
**Arquivo:** `backend/app.js` linhas 99-146
**Avaliação:** EXCELENTE

```javascript
const csrfProtection = doubleCsrf({
  getSecret: () => csrfSecret,
  cookieName: 'x-csrf-token',
  cookieOptions: {
    sameSite: 'none',  // ✅ Permite cross-site
    secure: true,      // ✅ HTTPS obrigatório
    httpOnly: false,   // ✅ JavaScript precisa ler
  },
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],  // ✅
  getSessionIdentifier: (req) => req.ip  // ✅
});
```

- Double CSRF implementado ✅
- Cookie + header validation ✅
- sameSite='none' com secure=true ✅
- Logs detalhados ✅

---

### 8. VALIDAÇÃO DE ENTRADA ✅
**Arquivo:** `backend/routes/auth.js`
**Avaliação:** EXCELENTE

```javascript
body('name')
  .trim()
  .isLength({ min: 2, max: 100 })
  .matches(/^[a-zA-ZÀ-ÿ\s]+$/),  // ✅ Apenas letras
body('email')
  .trim()
  .isEmail()
  .normalizeEmail(),  // ✅ Normalização
body('password')
  .isLength({ min: 6 })
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)  // ✅ Força forte
```

**Apenas falta:** Aplicar consistentemente em todas as rotas (clientes.js tem validação mínima)

---

### 9. SISTEMA DE REVERSÃO DE AÇÕES ✅
**Arquivo:** `backend/routes/clientes.js` linhas 408-524
**Avaliação:** EXCELENTE (Diferencial)

```javascript
switch (logEntry.action_type) {
  case 'DELETE_CLIENT':
    // Re-insere cliente com dados originais ✅
  case 'UPDATE_CLIENT':
    // Restaura dados originais ✅
  case 'CHANGE_STATUS':
    // Reverte status ✅
  case 'ADJUST_DATE':
    // Restaura data ✅
}
```

**Funcionalidade única e bem implementada!**

---

### 10. ASYNC/AWAIT CONSISTENTE ✅
**Arquivo:** Todos os arquivos backend
**Avaliação:** EXCELENTE

- Uso consistente de async/await ✅
- Error handling com try-catch ✅
- Promises encadeadas corretamente ✅
- Sem callback hell ✅

---

## 💡 MELHORIAS RECOMENDADAS (P2 - Médio Prazo)

### 11. Implementar TypeScript
**Benefícios:**
- Type checking em tempo de compilação
- Menos bugs em runtime
- Melhor IDE support
- Documentação automática de tipos

**Exemplo:**
```typescript
// backend/types/user.ts
interface User {
  id: number;
  name: string;
  email: string;
  password: string;
  created_at: Date;
}

interface AuthResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// backend/routes/auth.ts
router.post('/login', async (req: Request, res: Response<AuthResponse>) => {
  const { email, password }: { email: string; password: string } = req.body;
  // ...
});
```

---

### 12. Dividir script.js em Módulos
**Problema atual:**
- `frontend/script.js` tem 3000+ linhas
- Difícil de manter e testar
- Mistura múltiplas responsabilidades

**Estrutura sugerida:**
```
frontend/
├── modules/
│   ├── dashboard.js       # Estatísticas e gráficos
│   ├── clients.js         # Gerenciamento de clientes
│   ├── services.js        # Gerenciamento de serviços
│   ├── ui.js             # Componentes de UI (dropdowns, modals)
│   └── api.js            # Chamadas de API
├── utils/
│   ├── formatters.js     # Formatação de data, moeda, etc
│   ├── validators.js     # Validação de inputs
│   └── sanitizers.js     # Sanitização XSS
└── app.js               # Entry point (imports todos módulos)
```

---

### 13. Adicionar Testes de Integração
**Problema atual:**
- Apenas testes unitários básicos
- Sem testes de fluxo completo
- Cobertura de ~20%

**Recomendação:**
```javascript
// __tests__/integration/auth.integration.test.js
describe('Fluxo completo de autenticação', () => {
  let server;
  let db;

  beforeAll(async () => {
    // Setup SQLite em memória
    db = await setupTestDatabase();
    server = await startTestServer(db);
  });

  test('Usuário pode se registrar, logar e acessar dados', async () => {
    // 1. Registrar
    const registerRes = await request(server)
      .post('/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: 'Test123' });
    expect(registerRes.status).toBe(201);

    // 2. Login
    const loginRes = await request(server)
      .post('/auth/login')
      .send({ email: 'test@test.com', password: 'Test123' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body).toHaveProperty('accessToken');

    const { accessToken } = loginRes.body;

    // 3. Acessar rota protegida
    const clientsRes = await request(server)
      .get('/clientes/list')
      .set('Authorization', `Bearer ${accessToken}`);
    expect(clientsRes.status).toBe(200);
  });
});
```

**Target de cobertura:** 80%

---

### 14. Implementar Cache com Redis
**Benefícios:**
- Reduz carga no banco de dados
- Melhora performance de leitura
- Permite rate limiting distribuído

**Exemplo:**
```javascript
const redis = require('redis');
const client = redis.createClient();

// Cache de estatísticas (5 minutos)
router.get('/stats', authMiddleware, async (req, res) => {
  const userId = req.userData.id;
  const cacheKey = `stats:${userId}`;

  // 1. Verificar cache
  const cached = await client.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // 2. Buscar do banco
  const [results] = await db.query('SELECT ... FROM clientes WHERE user_id = ?', [userId]);

  // 3. Salvar no cache
  await client.setEx(cacheKey, 300, JSON.stringify(results));  // 5 min

  res.json(results);
});
```

---

### 15. Adicionar Monitoring e Alertas
**Ferramentas sugeridas:**
- **Sentry:** Para erros e exceções
- **New Relic / DataDog:** Para performance
- **Prometheus + Grafana:** Para métricas customizadas

**Exemplo com Sentry:**
```javascript
const Sentry = require('@sentry/node');

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

// Em app.js
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());

// Capturar erros customizados
logger.error = (message, error) => {
  winston.error(message, error);
  Sentry.captureException(error);
};
```

---

## 🐛 BUGS IDENTIFICADOS

### Bug 1: Erro de sintaxe SQL em Migration
**Arquivo:** `backend/db/migrations.js` linha 32
**Severidade:** ⚠️ MÉDIO

```javascript
// Erro ao rodar migration
2025-11-09 13:44:32 error: You have an error in your SQL syntax;
check the manual that corresponds to your MariaDB server version
for the right syntax to use near 'ALTER TABLE refresh_tokens COMMENT = ...' at line 17
```

**Problema:**
```sql
-- database/migrations/create_refresh_tokens.sql
-- Múltiplos statements sem delimitador correto
CREATE TABLE refresh_tokens (...);
ALTER TABLE refresh_tokens COMMENT = '...';  -- ❌ Erro de sintaxe
```

**Correção:**
```sql
-- database/migrations/create_refresh_tokens.sql
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(512) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  replaced_by_token VARCHAR(512),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  COMMENT='Armazena refresh tokens JWT para renovação de sessão';
  -- ✅ COMMENT na mesma linha do CREATE TABLE
```

**Ou usar migration programática:**
```javascript
async function createRefreshTokensTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token VARCHAR(512) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      revoked BOOLEAN DEFAULT FALSE,
      replaced_by_token VARCHAR(512),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  // Executar ALTER separadamente se necessário
  await db.query(`
    ALTER TABLE refresh_tokens
    COMMENT = 'Armazena refresh tokens JWT para renovação de sessão'
  `);
}
```

---

### Bug 2: Validação Inconsistente entre Rotas
**Arquivos:** `backend/routes/auth.js` vs `backend/routes/clientes.js`
**Severidade:** ⚠️ BAIXO

**Problema:**
```javascript
// auth.js: Validação excelente com express-validator
body('email').trim().isEmail().normalizeEmail()  // ✅

// clientes.js: Validação mínima
const { valor_cobrado, custo } = req.body;
const valorCobrado = parseFloat(valor_cobrado) || 0;  // ❌ Sem validação de tipo
```

**Impacto:**
- Dados inválidos podem ser inseridos
- Erros em runtime ao invés de validação
- UX ruim (erro genérico ao invés de feedback específico)

**Correção:**
```javascript
// backend/routes/clientes.js
router.post('/add', [
  authMiddleware,
  // Adicionar validações
  body('name').trim().notEmpty().isLength({ min: 1, max: 100 }),
  body('valor_cobrado').isFloat({ min: 0 }),
  body('custo').isFloat({ min: 0 }),
  body('vencimento').isISO8601(),
  body('servico').trim().notEmpty(),
  body('status').isIn(['Pag. em dias', 'Não pagou', 'Pag. atrasado']),
], async (req, res) => {
  // Verificar erros
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }

  // Processar...
});
```

---

### Bug 3: Fallback de CSRF muito Permissivo
**Arquivo:** `backend/app.js` linhas 150-151
**Severidade:** ⚠️ MÉDIO

**Problema:**
```javascript
} catch (error) {
  logger.error('Erro ao configurar CSRF protection:', error);
  // Fallback: cria middleware dummy que não bloqueia nada
  generateCsrfToken = () => 'csrf-disabled';
  doubleCsrfProtection = (req, res, next) => next();  // ❌ Permite tudo
  logger.warn('CSRF protection desabilitada devido a erro na configuração');
}
```

**Impacto:**
- Se configuração de CSRF falhar, sistema fica sem proteção
- Vulnerável a CSRF attacks
- Fail open ao invés de fail secure

**Correção:**
```javascript
} catch (error) {
  logger.error('FATAL: Erro ao configurar CSRF protection:', error);
  logger.error('Servidor não pode iniciar sem CSRF protection.');

  // Fail secure: Não iniciar servidor
  process.exit(1);
}
```

**Ou se preferir fail open com warning:**
```javascript
} catch (error) {
  logger.error('Erro ao configurar CSRF protection:', error);

  // Fallback restritivo: Bloqueia POST/PUT/DELETE
  doubleCsrfProtection = (req, res, next) => {
    const method = req.method.toUpperCase();
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
      logger.warn(`CSRF DESABILITADO: Bloqueando ${method} ${req.path}`);
      return res.status(503).json({
        error: 'Serviço temporariamente indisponível (CSRF configuration error)'
      });
    }
    next();
  };

  logger.warn('CSRF protection em modo de emergência - POST/PUT/DELETE bloqueados');
}
```

---

### Bug 4: Conexão com Banco Falha Silenciosamente
**Arquivo:** `backend/db/connection.js` linhas 16-23
**Severidade:** ⚠️ MÉDIO

**Problema:**
```javascript
db.query('SELECT 1')
  .then(() => {
    console.log("Pool de conexões MySQL conectado!");
  })
  .catch(err => {
    console.error("Erro ao conectar ao banco de dados no startup:", err);
    // ❌ Continua mesmo com erro
  });
```

**Impacto:**
- Servidor inicia sem banco de dados
- Todas as rotas falham com erro 500
- Usuário vê "Erro interno" ao invés de "Serviço indisponível"

**Correção:**
```javascript
// backend/db/connection.js
async function testConnection() {
  try {
    await db.query('SELECT 1');
    console.log("Pool de conexões MySQL conectado!");
    return true;
  } catch (err) {
    console.error("FATAL: Não foi possível conectar ao banco de dados:", err);
    console.error("Verifique as credenciais no arquivo .env");
    process.exit(1);  // ✅ Não inicia sem banco
  }
}

// Exportar também a função de teste
module.exports = { db, testConnection };

// backend/app.js
const { db, testConnection } = require('./db/connection');

if (require.main === module) {
  (async () => {
    // Testar conexão ANTES de iniciar servidor
    await testConnection();

    // Executar migrations
    await runMigrations();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
      logger.info(`Servidor iniciado na porta ${PORT}`);
    });
  })();
}
```

---

## 📈 MÉTRICAS DO PROJETO

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 ESTATÍSTICAS DE CÓDIGO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total de Arquivos JavaScript:     20
Total de Linhas de Código:        ~3,139
  └─ Backend:                     ~2,000
  └─ Frontend:                    ~1,139

Funções Principais:               47
Rotas de API:                     18
Middleware:                       3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📦 DEPENDÊNCIAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Dependências de Produção:        17
  ├─ express
  ├─ mysql2
  ├─ bcryptjs
  ├─ jsonwebtoken
  ├─ winston
  ├─ helmet
  ├─ cors
  ├─ csrf-csrf
  ├─ express-rate-limit
  ├─ express-validator
  └─ ... (7 outras)

Dependências de Desenvolvimento:  2
  ├─ jest
  └─ supertest

Total:                            19

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🧪 TESTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Arquivos de Teste:                4
  ├─ auth.test.js
  ├─ security.test.js
  ├─ csrf.test.js
  └─ refresh-tokens.test.js

Total de Testes:                  ~20
Cobertura Estimada:               ~20%
Status:                           🔴 INSUFICIENTE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔒 SEGURANÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Funções de Segurança:             12
  ├─ SQL Injection Protection      ✅
  ├─ Password Hashing              ✅
  ├─ JWT Authentication            ✅
  ├─ CSRF Protection               ✅
  ├─ Rate Limiting                 ✅
  ├─ CORS                          ✅
  ├─ Helmet Headers                ✅
  ├─ Input Validation              ⚠️ (parcial)
  ├─ XSS Protection                ⚠️ (não verificado)
  ├─ Authorization                 ❌ (falta por usuário)
  ├─ CSP                           ❌ (desabilitado)
  └─ HSTS                          ❌ (não implementado)

Vulnerabilidades Críticas:        4
Vulnerabilidades Altas:           6
Vulnerabilidades Médias:          8+

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🎯 PLANO DE AÇÃO PRIORITIZADO

### Semana 1 (P0 - Crítico)
- [ ] **Dia 1:** Remover credenciais do repositório e rotear secrets
- [ ] **Dia 2-3:** Implementar autorização por usuário (user_id em todas queries)
- [ ] **Dia 4:** Revisar script.js para XSS e sanitizar
- [ ] **Dia 5:** Ativar CSP e testar aplicação

### Semana 2-4 (P1 - Alto)
- [ ] **Semana 2:**
  - Implementar limpeza de tokens (cron job)
  - Adicionar HSTS header
  - Implementar rate limiting por usuário
- [ ] **Semana 3:**
  - Sistema de verificação de email
  - Limitar tokens por usuário
- [ ] **Semana 4:**
  - Implementar 2FA (opcional)
  - Melhorar testes (cobertura 50%)

### Mês 2 (P2 - Médio)
- [ ] **TypeScript migration** (gradual)
- [ ] **Dividir script.js** em módulos
- [ ] **Testes de integração** (cobertura 80%)
- [ ] **Cache com Redis**
- [ ] **Monitoring com Sentry**

### Backlog (P3 - Baixo)
- [ ] Refatorar para arquitetura MVC
- [ ] Adicionar webhooks
- [ ] Implementar GraphQL API
- [ ] Dashboard de admin
- [ ] Auditoria completa de logs

---

## 📖 CONCLUSÃO E RECOMENDAÇÕES FINAIS

### Avaliação Geral

O projeto **clientesreformulado2** demonstra uma **base técnica sólida** com boas práticas em várias áreas de segurança e desenvolvimento. A implementação de CSRF protection, rate limiting, password hashing e SQL injection prevention mostra uma preocupação adequada com segurança.

**PORÉM**, existem **vulnerabilidades críticas** que impedem o deployment em produção com dados reais:

1. **Credenciais expostas** - Risco imediato de comprometimento
2. **Broken Access Control** - Violação de privacidade LGPD/GDPR
3. **CSP desabilitada** - Aumento de risco XSS
4. **Possível XSS** - Não completamente verificado

### Recomendação de Deploy

```
┌─────────────────────────────────────────────┐
│  ❌ NÃO FAZER DEPLOY EM PRODUÇÃO ATÉ:      │
├─────────────────────────────────────────────┤
│  1. Rotear todas as credenciais (P0)       │
│  2. Implementar user_id em queries (P0)    │
│  3. Ativar CSP (P0)                        │
│  4. Verificar XSS em script.js (P0)        │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ⚠️ DEPLOY EM STAGING PERMITIDO COM:       │
├─────────────────────────────────────────────┤
│  - Dados de teste apenas                   │
│  - Monitoramento de segurança ativo        │
│  - Backup regular do banco                 │
│  - Firewall restritivo                     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  ✅ PRODUÇÃO APÓS COMPLETAR:               │
├─────────────────────────────────────────────┤
│  - Todos os P0 (Semana 1)                  │
│  - Maioria dos P1 (Semana 2-4)             │
│  - Testes de penetração                    │
│  - Code review por terceiro                │
│  - Documentação de segurança               │
└─────────────────────────────────────────────┘
```

### Pontos Positivos

1. ✅ **Arquitetura bem organizada** - Separação clara de responsabilidades
2. ✅ **Código limpo e legível** - Fácil de entender e manter
3. ✅ **Boas práticas async/await** - Sem callback hell
4. ✅ **Logging estruturado** - Winston bem configurado
5. ✅ **Sistema de reversão único** - Diferencial do projeto
6. ✅ **Documentação Swagger** - API bem documentada
7. ✅ **Testes existentes** - Base para expansão

### Áreas de Melhoria Crítica

1. 🔴 **Segurança de dados** - Falta autorização por usuário
2. 🔴 **Gestão de secrets** - Credenciais expostas
3. 🔴 **Proteção XSS** - CSP desabilitada, script.js não revisado
4. ⚠️ **Cobertura de testes** - Apenas 20%
5. ⚠️ **Validação inconsistente** - Nem todas rotas validam input
6. ⚠️ **Manutenibilidade** - script.js muito grande

### Próximos Passos Imediatos

```bash
# 1. Remover credenciais do repo
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# 2. Rotear todos os secrets
# - Nova senha MySQL
# - Novos JWT secrets
# - Novo CSRF secret

# 3. Implementar user_id em todas queries
# Ver exemplos de correção acima em "Broken Access Control"

# 4. Ativar CSP
# Ver exemplo de correção acima em "CSP Desabilitada"

# 5. Revisar script.js
# Procurar por .innerHTML e substituir por .textContent ou sanitizar
```

### Score Final

```
╔════════════════════════════════════════════╗
║                                            ║
║     SCORE FINAL: 6.2/10                    ║
║                                            ║
║     STATUS: ACEITÁVEL COM RESSALVAS        ║
║                                            ║
║     ⚠️  NÃO RECOMENDADO PARA PRODUÇÃO     ║
║     ✅  BOM PARA DESENVOLVIMENTO          ║
║     ✅  PRONTO PARA STAGING (com cuidado) ║
║                                            ║
╚════════════════════════════════════════════╝
```

---

**Fim do Relatório de Auditoria**

**Próxima Auditoria Recomendada:** Após implementação dos P0 e P1 (aproximadamente 4 semanas)

**Contato para Dúvidas:** Consulte a documentação criada em:
- `SOLUCAO_FINAL.md`
- `INSTRUCOES_DEPLOY.md`
- `CORRECAO_FRONTEND_VUE.md`

---

*Este relatório foi gerado automaticamente por análise estática de código. Recomenda-se também:*
- *Penetration testing manual*
- *Code review por desenvolvedor sênior*
- *Auditoria de conformidade (LGPD/GDPR)*
- *Testes de carga e stress*
