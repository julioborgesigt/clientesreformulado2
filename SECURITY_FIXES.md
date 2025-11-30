# 🔧 GUIA DE CORREÇÕES DE SEGURANÇA

Este documento contém as correções detalhadas para os problemas identificados na auditoria de segurança.

---

## 🔴 CORREÇÃO 1: Remover Credenciais do .domcloud.yml

### Problema
Credenciais hardcoded no arquivo de deploy expõem banco de dados e secrets.

### Solução

**Passo 1:** Trocar TODAS as credenciais imediatamente

```bash
# Gerar novos secrets
NEW_JWT_SECRET=$(openssl rand -hex 64)
NEW_JWT_REFRESH_SECRET=$(openssl rand -hex 64)
NEW_CSRF_SECRET=$(openssl rand -hex 64)

echo "Novos secrets gerados:"
echo "JWT_SECRET=$NEW_JWT_SECRET"
echo "JWT_REFRESH_SECRET=$NEW_JWT_REFRESH_SECRET"
echo "CSRF_SECRET=$NEW_CSRF_SECRET"
```

**Passo 2:** Atualizar .domcloud.yml (remover credenciais)

```yaml
# .domcloud.yml - VERSÃO SEGURA
source: https://github.com/julioborgesigt/clientesreformulado2
features:
  - node lts

nginx:
  root: public_html/public
  passenger:
    enabled: "on"
    app_start_command: env PORT=$PORT npm start

commands:
  - git pull origin main  # Usar branch principal
  - npm install
  # NÃO criar .env aqui - usar variáveis do painel DomCloud
  - mkdir -p tmp
  - touch tmp/restart.txt
```

**Passo 3:** Configurar variáveis de ambiente no painel DomCloud

No painel de controle do DomCloud, adicione as variáveis:
- `DB_HOST`: sao.domcloud.co
- `DB_USER`: clientes
- `DB_PASS`: **[TROCAR POR NOVA SENHA]**
- `DB_NAME`: clientes_clientes
- `JWT_SECRET`: **[USAR NOVO SECRET GERADO]**
- `JWT_REFRESH_SECRET`: **[USAR NOVO SECRET GERADO]**
- `CSRF_SECRET`: **[USAR NOVO SECRET GERADO]**
- `NODE_ENV`: production
- `FRONTEND_URL`: https://clientes.domcloud.dev
- `ADMIN_EMAIL`: seu-email@dominio.com

**Passo 4:** Adicionar .domcloud.yml ao .gitignore (se contiver secrets)

```bash
# .gitignore
.env
.env.local
.env.production
.domcloud.yml  # Se contiver informações sensíveis
```

---

## 🔴 CORREÇÃO 2: Migrar Config para Multi-tenant

### Problema
Configurações de WhatsApp são globais, permitindo que qualquer usuário sobrescreva mensagens de todos.

### Solução

**Migration SQL:**

```sql
-- database/migrations/migrate_config_multitenant.sql

-- 1. Criar backup da tabela config
CREATE TABLE config_backup AS SELECT * FROM config;

-- 2. Adicionar coluna user_id
ALTER TABLE config ADD COLUMN user_id INT NULL AFTER id;

-- 3. Criar configuração para cada usuário existente
INSERT INTO config (whatsapp_message, whatsapp_message_vencido, user_id)
SELECT
  (SELECT whatsapp_message FROM config_backup WHERE id = 1),
  (SELECT whatsapp_message_vencido FROM config_backup WHERE id = 1),
  u.id
FROM users u;

-- 4. Remover config global antiga
DELETE FROM config WHERE user_id IS NULL;

-- 5. Tornar user_id obrigatório
ALTER TABLE config MODIFY COLUMN user_id INT NOT NULL;

-- 6. Remover ID auto increment e usar user_id como PK
ALTER TABLE config DROP PRIMARY KEY;
ALTER TABLE config DROP COLUMN id;
ALTER TABLE config ADD PRIMARY KEY (user_id);

-- 7. Adicionar foreign key com CASCADE
ALTER TABLE config ADD CONSTRAINT fk_config_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE;

-- 8. Limpar backup
DROP TABLE config_backup;
```

**Código Corrigido em backend/routes/clientes.js:**

```javascript
// ANTES (INSEGURO):
router.post('/save-message', async (req, res) => {
    const userId = req.userData.id;
    const { message } = req.body;
    if (!message || message.trim() === '') {
        return res.status(400).json({ error: 'A mensagem não pode estar vazia.' });
    }
    try {
        // ⚠️ ATENÇÃO: Config ainda é global (precisa migração para user_id)
        await db.query('UPDATE config SET whatsapp_message = ? WHERE id = 1', [message]);
        await logAction('UPDATE_CONFIG', null, 'Mensagem padrão atualizada.', userId);
        res.status(200).json({ message: 'Mensagem padrão salva com sucesso!' });
    } catch (err) {
        console.error('Erro ao salvar mensagem padrão no banco:', err);
        return res.status(500).json({ error: 'Erro ao salvar mensagem padrão.' });
    }
});

// DEPOIS (SEGURO):
router.post('/save-message', [
    body('message')
        .trim()
        .notEmpty()
        .withMessage('A mensagem não pode estar vazia.')
        .isLength({ max: 5000 })
        .withMessage('Mensagem muito longa (máximo 5000 caracteres)')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }

    const userId = req.userData.id;
    const { message } = req.body;

    try {
        // 🔒 SEGURANÇA: Atualiza apenas config do usuário autenticado
        const [result] = await db.query(
            'UPDATE config SET whatsapp_message = ? WHERE user_id = ?',
            [message, userId]
        );

        // Se nenhuma linha foi afetada, cria config para o usuário
        if (result.affectedRows === 0) {
            await db.query(
                'INSERT INTO config (user_id, whatsapp_message) VALUES (?, ?)',
                [userId, message]
            );
        }

        await logAction('UPDATE_CONFIG', null, 'Mensagem padrão atualizada.', userId);
        logger.info(`Mensagem WhatsApp atualizada para usuário ${userId}`);

        res.status(200).json({ message: 'Mensagem padrão salva com sucesso!' });
    } catch (err) {
        logger.error('Erro ao salvar mensagem padrão no banco:', err);
        return res.status(500).json({ error: 'Erro ao salvar mensagem padrão.' });
    }
});

// Aplicar mesma correção para /save-message-vencido
router.post('/save-message-vencido', [
    body('message')
        .trim()
        .notEmpty()
        .withMessage('A mensagem não pode estar vazia.')
        .isLength({ max: 5000 })
        .withMessage('Mensagem muito longa (máximo 5000 caracteres)')
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }

    const userId = req.userData.id;
    const { message } = req.body;

    try {
        // 🔒 SEGURANÇA: Atualiza apenas config do usuário autenticado
        const [result] = await db.query(
            'UPDATE config SET whatsapp_message_vencido = ? WHERE user_id = ?',
            [message, userId]
        );

        // Se nenhuma linha foi afetada, cria config para o usuário
        if (result.affectedRows === 0) {
            await db.query(
                'INSERT INTO config (user_id, whatsapp_message_vencido) VALUES (?, ?)',
                [userId, message]
            );
        }

        await logAction('UPDATE_CONFIG', null, 'Mensagem de vencido atualizada.', userId);
        logger.info(`Mensagem vencido atualizada para usuário ${userId}`);

        res.status(200).json({ message: 'Mensagem (Vencido) salva com sucesso!' });
    } catch (err) {
        logger.error('Erro ao salvar mensagem (vencido):', err);
        return res.status(500).json({ error: 'Erro ao salvar mensagem (vencido).' });
    }
});

// Corrigir também as rotas GET
router.get('/get-message', async (req, res) => {
    const userId = req.userData.id;
    try {
        const [results] = await db.query(
            'SELECT whatsapp_message FROM config WHERE user_id = ?',
            [userId]
        );

        // Se não existe config, retorna vazio
        const message = results.length > 0 ? results[0].whatsapp_message : '';

        res.status(200).json({ message: message || '' });
    } catch (err) {
        logger.error('Erro ao buscar mensagem padrão:', err);
        return res.status(500).json({ error: 'Erro ao buscar mensagem padrão.' });
    }
});

router.get('/get-message-vencido', async (req, res) => {
    const userId = req.userData.id;
    try {
        const [results] = await db.query(
            'SELECT whatsapp_message_vencido FROM config WHERE user_id = ?',
            [userId]
        );

        const message = results.length > 0 ? results[0].whatsapp_message_vencido : '';

        res.status(200).json({ message: message || '' });
    } catch (err) {
        logger.error('Erro ao buscar mensagem (vencido):', err);
        return res.status(500).json({ error: 'Erro ao buscar mensagem (vencido).' });
    }
});
```

**Criar config inicial no registro de usuário:**

```javascript
// backend/routes/auth.js - adicionar após registro
async function createDefaultConfig(userId) {
    try {
        await db.query(
            'INSERT INTO config (user_id, whatsapp_message, whatsapp_message_vencido) VALUES (?, ?, ?)',
            [
                userId,
                'Olá! Seu pagamento vence em breve.',
                'Olá! Seu pagamento está vencido.'
            ]
        );
        logger.info(`Configuração padrão criada para usuário ${userId}`);
    } catch (err) {
        logger.error('Erro ao criar configuração padrão:', err);
    }
}

// No endpoint /register, após criar usuário:
await db.query(
    'INSERT INTO users (name, email, password, recovery_code, recovery_code_created_at, first_login_completed) VALUES (?, ?, ?, ?, NOW(), FALSE)',
    [name, email, hashedPassword, hashedRecoveryCode]
);

const userId = results.insertId;

// Criar config padrão
await createDefaultConfig(userId);
```

---

## 🟠 CORREÇÃO 3: Substituir console.log por logger

### Problema
Uso de console.log em produção impede logging adequado e auditoria.

### Solução

**Script de correção automática:**

```bash
#!/bin/bash
# scripts/fix-console-logs.sh

# Arquivos a corrigir
FILES=(
    "backend/routes/clientes.js"
    "backend/routes/servicos.js"
    "backend/utils/actionLog.js"
    "backend/swagger.js"
)

for file in "${FILES[@]}"; do
    echo "Corrigindo $file..."

    # Substituir console.log por logger.info
    sed -i "s/console\.log(/logger.info(/g" "$file"

    # Substituir console.error por logger.error
    sed -i "s/console\.error(/logger.error(/g" "$file"

    # Substituir console.warn por logger.warn
    sed -i "s/console\.warn(/logger.warn(/g" "$file"

    echo "✅ $file corrigido"
done

echo "Concluído! Verifique os arquivos e teste."
```

**Correções manuais necessárias em backend/routes/clientes.js:**

```javascript
// Adicionar no topo do arquivo se não existir:
const logger = require('../utils/logger');

// ANTES:
console.error('Erro ao adicionar cliente:', err);
console.log(`Cliente ID ${id} arquivado com sucesso.`);

// DEPOIS:
logger.error('Erro ao adicionar cliente:', err);
logger.info(`Cliente ID ${id} arquivado com sucesso.`);
```

---

## 🟠 CORREÇÃO 4: Sanitização de LIKE Queries

### Problema
Caracteres especiais em queries LIKE podem causar resultados incorretos.

### Solução

**Criar função utilitária:**

```javascript
// backend/utils/sanitize.js
/**
 * Escapa caracteres especiais do LIKE SQL
 * Previne que %, _ e \ sejam interpretados como wildcards
 *
 * @param {string} str - String a ser escapada
 * @returns {string} String escapada
 */
function escapeLike(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }

    // Escapa backslash primeiro, depois % e _
    return str
        .replace(/\\/g, '\\\\')  // \ -> \\
        .replace(/%/g, '\\%')     // % -> \%
        .replace(/_/g, '\\_');    // _ -> \_
}

/**
 * Sanitiza input geral removendo caracteres perigosos
 * Mantém apenas alfanuméricos, espaços e pontuação básica
 *
 * @param {string} str - String a ser sanitizada
 * @returns {string} String sanitizada
 */
function sanitizeInput(str) {
    if (!str || typeof str !== 'string') {
        return '';
    }

    // Remove caracteres de controle e mantém apenas caracteres seguros
    return str.replace(/[\x00-\x1F\x7F]/g, '');
}

module.exports = {
    escapeLike,
    sanitizeInput
};
```

**Usar em backend/routes/clientes.js:**

```javascript
const { escapeLike } = require('../utils/sanitize');

// Na rota GET /list:
router.get('/list', async (req, res) => {
    const userId = req.userData.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit);
    const effectiveLimit = (!limit || limit === -1 || isNaN(limit)) ? 999999 : limit;
    const status = req.query.status || '';
    const search = req.query.search || '';
    const showArchived = req.query.showArchived === 'true';
    const offset = (page - 1) * effectiveLimit;

    // ... resto do código

    // ANTES:
    if (search) {
        whereClauses.push('name LIKE ?');
        params.push(`%${search}%`);
    }

    // DEPOIS (SEGURO):
    if (search) {
        const escapedSearch = escapeLike(search);
        whereClauses.push('name LIKE ?');
        params.push(`%${escapedSearch}%`);
    }

    // ... resto do código
});
```

---

## 🟡 CORREÇÃO 5: Melhorar Tratamento de Erros

### Problema
Stack traces são expostos em ambiente de desenvolvimento, vazando estrutura do código.

### Solução

**Atualizar backend/middleware/errorHandler.js:**

```javascript
// Resposta baseada em NODE_ENV e DEBUG_MODE
const isDevelopment = process.env.NODE_ENV === 'development';
const isDebugMode = process.env.DEBUG_MODE === 'true';
const isProduction = process.env.NODE_ENV === 'production';

if (isProduction) {
    // Produção: nunca expõe detalhes internos
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
            message: 'Algo deu errado. Por favor, tente novamente mais tarde.',
            requestId: req.id // Se tiver request ID tracking
        });
    }
} else if (isDevelopment && isDebugMode) {
    // Debug mode: retorna tudo para facilitar desenvolvimento
    res.status(statusCode).json({
        status: error.status || 'error',
        message: message,
        stack: error.stack,
        error: error,
        ...(error.errors && { errors: error.errors })
    });
} else {
    // Desenvolvimento sem debug: retorna mensagem mas não stack
    res.status(statusCode).json({
        status: error.status || 'error',
        message: message,
        ...(error.errors && { errors: error.errors })
    });
}
```

**Atualizar .env.example:**

```bash
# Environment
NODE_ENV=development
DEBUG_MODE=false  # Set to 'true' only for debugging (exposes stack traces)
```

---

## 🟢 CORREÇÃO 6: Remover Código TypeScript Duplicado

### Problema
27 arquivos TypeScript duplicam lógica, causando confusão.

### Opção A: Manter TypeScript (Recomendado)

```bash
#!/bin/bash
# scripts/migrate-to-typescript.sh

echo "🔄 Migrando para TypeScript..."

# 1. Verificar se build funciona
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build TypeScript falhou. Corrija erros antes de continuar."
    exit 1
fi

# 2. Fazer backup do código JavaScript
mkdir -p backup/$(date +%Y%m%d)
cp -r backend/*.js backend/routes backend/middleware backend/utils backup/$(date +%Y%m%d)/

# 3. Atualizar package.json
cat > package.json.new << 'EOF'
{
  "scripts": {
    "start": "node backend/dist/app.js",
    "dev": "ts-node-dev --respawn backend/src/app.ts",
    "build": "tsc",
    "test": "jest --coverage"
  }
}
EOF

# 4. Atualizar .domcloud.yml
cat > .domcloud.yml.new << 'EOF'
commands:
  - npm install
  - npm run build  # Build TypeScript
  - touch tmp/restart.txt
EOF

echo "✅ Migração preparada. Revise os arquivos .new antes de aplicar."
```

### Opção B: Remover TypeScript

```bash
#!/bin/bash
# scripts/remove-typescript.sh

echo "🗑️  Removendo código TypeScript duplicado..."

# Fazer backup antes de remover
mkdir -p backup/typescript-$(date +%Y%m%d)
cp -r backend/src backup/typescript-$(date +%Y%m%d)/

# Remover diretório TypeScript
rm -rf backend/src/

# Remover dependências TS do package.json
npm uninstall typescript ts-node ts-node-dev @types/*

# Remover scripts TypeScript
# (editar manualmente package.json para remover scripts TS)

echo "✅ TypeScript removido. Documentação atualizada necessária."
```

---

## 📋 CHECKLIST DE APLICAÇÃO

Execute na seguinte ordem:

### Fase 1: Segurança Crítica (Imediato)
- [ ] Gerar novos secrets (JWT, CSRF)
- [ ] Atualizar senha do banco de dados
- [ ] Configurar variáveis no painel DomCloud
- [ ] Remover credenciais do .domcloud.yml
- [ ] Commit e push das mudanças
- [ ] Testar deploy

### Fase 2: Migração de Config (Urgente)
- [ ] Fazer backup do banco de dados
- [ ] Executar migration SQL de config
- [ ] Atualizar código das rotas de config
- [ ] Adicionar criação de config no registro
- [ ] Testar CRUD de mensagens WhatsApp
- [ ] Deploy e verificação

### Fase 3: Logging (Alta Prioridade)
- [ ] Executar script fix-console-logs.sh
- [ ] Revisar manualmente os arquivos
- [ ] Testar logging em dev e prod
- [ ] Commit e push

### Fase 4: Sanitização (Média Prioridade)
- [ ] Criar arquivo utils/sanitize.js
- [ ] Aplicar escapeLike em queries LIKE
- [ ] Testar busca com caracteres especiais
- [ ] Commit e push

### Fase 5: Erros e Code Cleanup (Baixa Prioridade)
- [ ] Atualizar errorHandler.js
- [ ] Adicionar DEBUG_MODE ao .env
- [ ] Decidir sobre TypeScript (A ou B)
- [ ] Executar script escolhido
- [ ] Atualizar documentação
- [ ] Commit e push

---

## 🧪 TESTES DE VALIDAÇÃO

Após aplicar cada correção, execute:

```bash
# 1. Testes unitários
npm test

# 2. Teste de segurança
npm audit

# 3. Teste de autenticação
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@teste.com","password":"SenhaSegura123!"}'

# 4. Teste de isolamento de config
# Criar 2 usuários e verificar que mensagens são independentes

# 5. Teste de logging
tail -f logs/combined-*.log
# Deve mostrar logs formatados do Winston, não console.log

# 6. Teste de LIKE query
# Buscar por "test%_" e verificar que não retorna todos os resultados
```

---

**Dúvidas?** Consulte o SECURITY_AUDIT_REPORT.md para mais detalhes.
