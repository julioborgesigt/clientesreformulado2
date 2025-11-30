# 🔒 RELATÓRIO DE AUDITORIA DE SEGURANÇA
## Sistema de Gestão de Clientes - Clientesreformulado2

**Data da Auditoria:** 30 de Novembro de 2025
**Auditor:** Claude Code Security Agent
**Versão do Sistema:** 1.0.0
**Escopo:** Auditoria completa de segurança, código desatualizado, vulnerabilidades e boas práticas

---

## 📊 RESUMO EXECUTIVO

### Estatísticas Gerais
- **Total de Vulnerabilidades Encontradas:** 8
- **Críticas:** 2
- **Altas:** 3
- **Médias:** 2
- **Baixas:** 1
- **Dependências Auditadas:** 713 pacotes
- **Vulnerabilidades em Dependências:** 0 (✅ Todas atualizadas)

### Status Geral
🔴 **CRÍTICO** - Requer ação imediata

---

## 🔴 VULNERABILIDADES CRÍTICAS

### 1. Credenciais Expostas em Arquivo de Deploy (.domcloud.yml)

**Severidade:** 🔴 CRÍTICA
**Arquivo:** `.domcloud.yml:16-24`
**Tipo:** Exposição de Credenciais / Hardcoded Secrets

**Descrição:**
Credenciais sensíveis do banco de dados e JWT secrets estão hardcoded no arquivo de deploy `.domcloud.yml`:

```yaml
DB_HOST=sao.domcloud.co
DB_USER=clientes
DB_PASS=WhmB_)b236_LZ1t7mU
DB_NAME=clientes_clientes
JWT_SECRET=d523fcd978702889c5ae06c8393483eeae6529166ef58ffe9abebcb73fb5f5f3e76a7f8e80facb41704753cc34d3d94a0d2dd4e9c45bf2a7f20d2790c5e1007f
```

**Impacto:**
- ✅ Qualquer pessoa com acesso ao repositório pode acessar o banco de dados
- ✅ JWT secrets comprometidos permitem forjar tokens de autenticação
- ✅ Acesso completo aos dados de todos os usuários
- ✅ Possibilidade de escalação de privilégios

**Recomendação:**
1. **IMEDIATO:** Trocar todas as credenciais (senha do banco de dados e JWT secrets)
2. Remover credenciais do arquivo `.domcloud.yml`
3. Usar variáveis de ambiente do servidor/painel de controle do DomCloud
4. Adicionar `.domcloud.yml` ao `.gitignore` se contiver secrets
5. Fazer auditoria do histórico do Git para verificar se essas credenciais estão em commits antigos
6. Se estiverem no histórico, considerar trocar as credenciais e fazer um `git filter-branch` ou similar

**Evidências no Git:**
```bash
# Verificar se há credenciais no histórico
git log -p .domcloud.yml | grep -E "(DB_PASS|JWT_SECRET)"
```

---

### 2. Configurações Globais sem Isolamento de Usuário

**Severidade:** 🔴 CRÍTICA
**Arquivo:** `backend/routes/clientes.js:330-367`
**Tipo:** Vulnerabilidade de Controle de Acesso

**Descrição:**
As rotas `/save-message` e `/save-message-vencido` atualizam configurações na tabela `config` de forma global (WHERE id = 1), sem isolamento por usuário:

```javascript
// ⚠️ ATENÇÃO: Config ainda é global (precisa migração para user_id)
await db.query('UPDATE config SET whatsapp_message = ? WHERE id = 1', [message]);
```

**Impacto:**
- Qualquer usuário autenticado pode sobrescrever as mensagens de WhatsApp de TODOS os usuários
- Sem auditoria adequada de quem alterou a configuração global
- Quebra do princípio de isolamento de multi-tenancy

**Recomendação:**
1. Migrar tabela `config` para incluir coluna `user_id`
2. Adicionar filtro `WHERE id = 1 AND user_id = ?` nas queries
3. Criar configuração padrão para cada usuário no registro
4. Implementar validação de autorização

**Código Sugerido:**
```javascript
// CORRETO: Configuração por usuário
await db.query(
  'UPDATE config SET whatsapp_message = ? WHERE user_id = ?',
  [message, userId]
);
```

---

## 🟠 VULNERABILIDADES ALTAS

### 3. Uso de console.log em Código de Produção

**Severidade:** 🟠 ALTA
**Arquivos Afetados:** 7 arquivos
- `backend/routes/clientes.js`
- `backend/app.js`
- `backend/routes/servicos.js`
- `backend/swagger.js`
- `backend/utils/actionLog.js`

**Descrição:**
Múltiplos arquivos usam `console.log`, `console.error` e `console.warn` em vez do logger Winston configurado.

**Impacto:**
- Logs não são persistidos com rotação adequada
- Informações sensíveis podem ser expostas no console
- Falta de rastreabilidade e auditoria
- Performance degradada em produção

**Recomendação:**
Substituir todos os `console.*` por `logger.*`:

```javascript
// ❌ INCORRETO
console.error('Erro ao adicionar cliente:', err);
console.log(`Cliente ID ${id} arquivado com sucesso.`);

// ✅ CORRETO
logger.error('Erro ao adicionar cliente:', err);
logger.info(`Cliente ID ${id} arquivado com sucesso.`);
```

---

### 4. Branch Hardcoded em Arquivo de Deploy

**Severidade:** 🟠 ALTA
**Arquivo:** `.domcloud.yml:12`
**Tipo:** Configuração Inadequada

**Descrição:**
```yaml
- git pull origin claude/code-review-audit-011CUvzKWQsD8TKUxJ2o5iZf
```

Branch específica está hardcoded no deploy, impedindo deploys corretos de outras branches.

**Impacto:**
- Deploy sempre puxa código da branch errada
- Impossível fazer deploy de correções urgentes de outras branches
- Configuração não escalável

**Recomendação:**
Usar variáveis de ambiente ou sistema de CI/CD apropriado:
```yaml
- git pull origin ${DEPLOY_BRANCH:-main}
```

---

### 5. Código TypeScript em Desuso (Duplicação)

**Severidade:** 🟠 ALTA
**Localização:** `backend/src/**/*.ts` (27 arquivos TypeScript)
**Tipo:** Código Duplicado / Manutenção

**Descrição:**
Existe uma versão completa do backend em TypeScript (`backend/src/`) que aparenta estar em desenvolvimento, mas a aplicação em produção usa a versão JavaScript (`backend/`).

**Impacto:**
- Duplicação de lógica de negócio
- Confusão sobre qual versão está em produção
- Risco de bugs ao manter duas versões
- Aumento da superfície de ataque

**Recomendação:**
1. **Definir qual versão é oficial** (JavaScript ou TypeScript)
2. Se TypeScript:
   - Migrar completamente para TypeScript
   - Remover código JavaScript antigo
   - Atualizar scripts de build e deploy
3. Se JavaScript:
   - Remover diretório `backend/src/`
   - Documentar que a migração foi descartada

---

## 🟡 VULNERABILIDADES MÉDIAS

### 6. Falta de Sanitização de Input em Queries SQL

**Severidade:** 🟡 MÉDIA
**Arquivo:** `backend/routes/clientes.js:401`
**Tipo:** Potencial SQL Injection via LIKE

**Descrição:**
Uso de concatenação de string em queries LIKE sem sanitização adequada:

```javascript
if (search) {
  whereClauses.push('name LIKE ?');
  params.push(`%${search}%`);
}
```

Embora use prepared statements, caracteres especiais LIKE (`%`, `_`) não são escapados.

**Impacto:**
- Busca pode retornar resultados incorretos
- Possível DoS com queries complexas
- Vazamento de informações via enumeração

**Recomendação:**
Sanitizar caracteres especiais do LIKE:

```javascript
function escapeLike(str) {
  return str.replace(/[%_\\]/g, '\\$&');
}

if (search) {
  const escapedSearch = escapeLike(search);
  whereClauses.push('name LIKE ?');
  params.push(`%${escapedSearch}%`);
}
```

---

### 7. Exposição de Informações Detalhadas em Erros

**Severidade:** 🟡 MÉDIA
**Arquivo:** `backend/middleware/errorHandler.js:119-127`
**Tipo:** Information Disclosure

**Descrição:**
Em ambiente de desenvolvimento, o stack trace completo e objeto de erro são retornados ao cliente:

```javascript
// Desenvolvimento: retorna stack trace para debug
res.status(statusCode).json({
    status: error.status || 'error',
    message: message,
    stack: error.stack,  // ⚠️ Expõe estrutura interna
    error: error,         // ⚠️ Pode conter dados sensíveis
    ...(error.errors && { errors: error.errors })
});
```

**Impacto:**
- Vazamento de estrutura do código
- Exposição de caminhos de arquivos
- Informações úteis para atacantes

**Recomendação:**
Usar variável de ambiente específica para debug:

```javascript
if (process.env.DEBUG_MODE === 'true' && process.env.NODE_ENV !== 'production') {
    res.status(statusCode).json({
        status: error.status || 'error',
        message: message,
        stack: error.stack,
        error: error
    });
} else {
    // Ambiente de produção ou sem debug
    res.status(statusCode).json({
        status: error.status || 'error',
        message: message
    });
}
```

---

## 🟢 VULNERABILIDADES BAIXAS

### 8. CORS com SameSite=None Permite Cross-Site Requests

**Severidade:** 🟢 BAIXA (Necessário para arquitetura atual)
**Arquivo:** `backend/app.js:222`
**Tipo:** Configuração de Segurança Permissiva

**Descrição:**
```javascript
sameSite: 'none',  // Permite cross-site
secure: true,
```

**Impacto:**
- Permite requisições cross-site com credenciais
- Aumenta superfície de ataque CSRF (mitigado por proteção CSRF implementada)

**Recomendação:**
- ✅ **Manter** se frontend e backend estão em domínios diferentes
- ✅ Proteção CSRF já está implementada (csrf-csrf)
- Considerar mudar para `sameSite: 'strict'` se frontend e backend forem migrados para o mesmo domínio

---

## ✅ PONTOS FORTES IDENTIFICADOS

### Segurança Bem Implementada

1. **✅ Autenticação Robusta**
   - JWT com access e refresh tokens
   - Token rotation implementado
   - Refresh tokens hasheados com SHA-256
   - Limite de 5 tokens por usuário
   - Cleanup automático de tokens expirados

2. **✅ Proteção Contra Ataques Comuns**
   - CSRF Protection (csrf-csrf com double-submit)
   - Rate Limiting (5 tentativas de login/15min, 500 req/15min global)
   - Helmet.js com CSP e HSTS
   - SQL Injection prevention (prepared statements)
   - Password hashing com bcrypt (10 salt rounds)

3. **✅ Validação de Input**
   - express-validator em todas as rotas
   - Validação de formato de email, senha forte (12+ chars)
   - Sanitização com trim() e normalizeEmail()

4. **✅ Auditoria e Logging**
   - Winston com rotação diária de logs
   - Action log completo com capacidade de reversão
   - User isolation (user_id em todas as queries)

5. **✅ Boas Práticas**
   - Soft delete implementado
   - Environment validation na inicialização
   - Fail-fast se configuração inválida
   - Separação de concerns (routes, controllers, services)

6. **✅ Dependências Atualizadas**
   - 0 vulnerabilidades conhecidas em 713 pacotes
   - Uso de versões modernas (Express 5, Node LTS)

---

## 📋 PLANO DE AÇÃO RECOMENDADO

### Prioridade 1 - CRÍTICA (Ação Imediata - Dentro de 24h)

1. **Remover credenciais do .domcloud.yml**
   ```bash
   # 1. Trocar senha do banco de dados no painel DomCloud
   # 2. Gerar novos JWT secrets
   # 3. Remover credenciais do arquivo
   # 4. Configurar via variáveis de ambiente do servidor
   # 5. Adicionar .domcloud.yml ao .gitignore (se contiver secrets)
   ```

2. **Trocar todas as credenciais comprometidas**
   - Nova senha do banco de dados
   - Novo JWT_SECRET (gerar com: `openssl rand -hex 64`)
   - Novo JWT_REFRESH_SECRET
   - Novo CSRF_SECRET

3. **Migrar tabela config para isolamento por usuário**
   ```sql
   ALTER TABLE config ADD COLUMN user_id INT NOT NULL;
   ALTER TABLE config ADD FOREIGN KEY (user_id) REFERENCES users(id);
   ALTER TABLE config DROP PRIMARY KEY;
   ALTER TABLE config ADD PRIMARY KEY (id, user_id);
   ```

### Prioridade 2 - ALTA (Dentro de 1 semana)

4. **Substituir console.log por logger em todos os arquivos**
   - `backend/routes/clientes.js`
   - `backend/app.js`
   - `backend/routes/servicos.js`
   - `backend/swagger.js`
   - `backend/utils/actionLog.js`

5. **Decidir sobre código TypeScript**
   - Escolher entre JavaScript ou TypeScript
   - Remover código duplicado
   - Atualizar documentação

6. **Corrigir branch hardcoded no deploy**

### Prioridade 3 - MÉDIA (Dentro de 2 semanas)

7. **Implementar sanitização de LIKE queries**
8. **Melhorar tratamento de erros em desenvolvimento**
9. **Revisar e documentar configuração CORS**

### Prioridade 4 - BAIXA (Backlog)

10. **Revisão de arquitetura**
    - Considerar migração completa para TypeScript
    - Implementar testes de segurança automatizados
    - Adicionar scan de secrets no CI/CD

---

## 🔧 RECOMENDAÇÕES GERAIS

### Segurança Contínua

1. **Implementar CI/CD com Scans de Segurança**
   ```yaml
   # GitHub Actions exemplo
   - name: Security Scan
     run: |
       npm audit
       npx snyk test
       git secrets --scan
   ```

2. **Rotação Regular de Secrets**
   - JWT secrets: a cada 90 dias
   - Senhas de banco: a cada 180 dias
   - Documentar processo de rotação

3. **Monitoramento de Segurança**
   - Alertas para tentativas de login falhadas
   - Monitoramento de queries suspeitas
   - Análise de logs de auditoria

4. **Treinamento de Equipe**
   - OWASP Top 10
   - Secure coding practices
   - Incident response plan

### Melhorias de Código

1. **Migração para TypeScript**
   - Maior type safety
   - Melhor manutenibilidade
   - Menos bugs em runtime

2. **Testes de Segurança**
   ```javascript
   describe('Security Tests', () => {
     it('should prevent SQL injection', async () => { /* ... */ });
     it('should validate JWT properly', async () => { /* ... */ });
     it('should enforce rate limiting', async () => { /* ... */ });
   });
   ```

3. **Documentação**
   - Atualizar README com security guidelines
   - Documentar processo de deploy seguro
   - Criar runbook para incidentes de segurança

---

## 📊 MÉTRICAS DE CONFORMIDADE

| Categoria | Status | Notas |
|-----------|--------|-------|
| **Autenticação** | 🟢 Excelente | JWT + refresh tokens bem implementados |
| **Autorização** | 🟡 Bom | User isolation OK, mas config global é problema |
| **Proteção de Dados** | 🟠 Necessita Atenção | Credenciais expostas no .domcloud.yml |
| **Validação de Input** | 🟢 Excelente | express-validator em todas as rotas |
| **Proteção CSRF** | 🟢 Excelente | csrf-csrf implementado corretamente |
| **Rate Limiting** | 🟢 Excelente | Múltiplos níveis de proteção |
| **Logging & Auditoria** | 🟡 Bom | Winston OK, mas console.log em produção |
| **Gestão de Secrets** | 🔴 Crítico | Secrets hardcoded no deploy |
| **Dependências** | 🟢 Excelente | 0 vulnerabilidades conhecidas |

**Score Geral:** 7.2/10 (Bom, mas requer ação imediata em itens críticos)

---

## 📝 CHECKLIST DE REMEDIAÇÃO

### Antes de Deploy em Produção

- [ ] Remover credenciais do .domcloud.yml
- [ ] Trocar todas as senhas e secrets
- [ ] Migrar config para isolamento por usuário
- [ ] Substituir console.log por logger
- [ ] Adicionar .env.example sem valores reais
- [ ] Verificar .gitignore para arquivos sensíveis
- [ ] Fazer scan de secrets no Git history
- [ ] Testar todas as rotas após mudanças
- [ ] Atualizar documentação
- [ ] Treinar equipe sobre mudanças de segurança

### Monitoramento Pós-Deploy

- [ ] Configurar alertas para erros 500
- [ ] Monitorar logs de autenticação
- [ ] Acompanhar tentativas de acesso negado
- [ ] Revisar logs de auditoria semanalmente
- [ ] Executar npm audit mensalmente

---

## 📞 CONTATO E SUPORTE

Para questões sobre este relatório:
- **Auditor:** Claude Code Security Agent
- **Data:** 30/11/2025
- **Versão do Relatório:** 1.0

---

## 🔐 ANEXOS

### A. Comandos Úteis para Remediação

```bash
# Gerar novos secrets
openssl rand -hex 64  # Para JWT_SECRET
openssl rand -hex 64  # Para JWT_REFRESH_SECRET
openssl rand -hex 64  # Para CSRF_SECRET

# Verificar secrets no Git
git log -p | grep -E "(password|secret|key)" --color

# Scan de dependências
npm audit
npm audit fix

# Verificar console.log no código
grep -r "console\." backend/ --exclude-dir=node_modules

# Testar autenticação
npm test -- --grep "auth"
```

### B. Exemplo de .env Seguro

```bash
# Database
DB_HOST=seu_host_aqui
DB_USER=seu_usuario_aqui
DB_PASS=sua_senha_segura_aqui
DB_NAME=seu_banco_aqui
DB_CONNECTION_LIMIT=10

# JWT
JWT_SECRET=gere_com_openssl_rand_hex_64
JWT_REFRESH_SECRET=gere_com_openssl_rand_hex_64

# CSRF
CSRF_SECRET=gere_com_openssl_rand_hex_64

# Environment
NODE_ENV=production
PORT=3000
FRONTEND_URL=https://seu-frontend.com

# Admin
ADMIN_EMAIL=admin@seu-dominio.com

# Backup (opcional)
BACKUP_ENABLED=true
BACKUP_MAX_FILES=7
BACKUP_INTERVAL_HOURS=24
```

### C. Migration SQL para Config Multi-tenant

```sql
-- 1. Adicionar coluna user_id à tabela config
ALTER TABLE config ADD COLUMN user_id INT NULL;

-- 2. Popular user_id para registros existentes (temporariamente NULL)
-- Nota: Definir manualmente qual usuário deve ter acesso à config global

-- 3. Criar configs individuais para cada usuário
INSERT INTO config (whatsapp_message, whatsapp_message_vencido, user_id)
SELECT
  (SELECT whatsapp_message FROM config WHERE id = 1),
  (SELECT whatsapp_message_vencido FROM config WHERE id = 1),
  id
FROM users;

-- 4. Remover config global antiga
DELETE FROM config WHERE user_id IS NULL;

-- 5. Tornar user_id obrigatório
ALTER TABLE config MODIFY COLUMN user_id INT NOT NULL;

-- 6. Adicionar foreign key
ALTER TABLE config ADD FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- 7. Adicionar índice
ALTER TABLE config ADD INDEX idx_user_config (user_id);
```

---

**FIM DO RELATÓRIO**

Este documento é confidencial e deve ser tratado com máxima segurança.
