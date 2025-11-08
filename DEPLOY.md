# 🚀 Guia de Deploy - Sistema de Gestão de Clientes

## ⚠️ IMPORTANTE: Configuração Pós-Deploy

Após fazer o deploy do código, você **DEVE** configurar o arquivo `.env` manualmente no servidor.

---

## 📋 Passo a Passo para Deploy

### 1️⃣ Fazer Pull/Clone do Código

```bash
git pull origin claude/code-review-audit-011CUvzKWQsD8TKUxJ2o5iZf
# ou
git clone [seu-repositorio]
cd clientesreformulado2
```

### 2️⃣ Instalar Dependências

```bash
npm install
```

### 3️⃣ **CRÍTICO:** Criar o Arquivo `.env`

O arquivo `.env` **NÃO ESTÁ** no repositório por segurança. Você precisa criá-lo manualmente:

```bash
nano .env
# ou use o editor do painel de controle do DomCloud
```

**Conteúdo do `.env`:**

```env
DB_HOST=sao.domcloud.co
DB_USER=clientes
DB_PASS=WhmB_)b236_LZ1t7mU
DB_NAME=clientes_clientes
JWT_SECRET=d523fcd978702889c5ae06c8393483eeae6529166ef58ffe9abebcb73fb5f5f3e76a7f8e80facb41704753cc34d3d94a0d2dd4e9c45bf2a7f20d2790c5e1007f
PORT=3000
FRONTEND_URL=https://clientes.domcloud.dev
```

⚠️ **ATENÇÃO:**
- Altere `FRONTEND_URL` para a URL real do seu domínio em produção!
- Use `https://clientes.domcloud.dev` ao invés de `http://localhost:3000`

### 4️⃣ Configurar o Servidor (DomCloud)

No painel do DomCloud, você precisa configurar:

#### **Arquivo de Configuração (provavelmente `.domcloud/config.yaml` ou similar):**

```yaml
features:
  - node
node:
  version: 18
  main: backend/app.js
  env:
    NODE_ENV: production
```

#### **Ou via linha de comando SSH no DomCloud:**

```bash
# Parar o servidor atual (se estiver rodando)
pkill -f node

# Instalar dependências
npm install --production

# Iniciar o servidor
NODE_ENV=production node backend/app.js
```

### 5️⃣ Verificar se o Servidor Está Rodando

```bash
# Via SSH
ps aux | grep node

# Ou verificar os logs
tail -f /var/log/domcloud/app.log
# (o caminho do log pode variar)
```

---

## 🔍 Diagnóstico de Problemas

### Erro 502 (Bad Gateway)

**Causa mais comum:** Arquivo `.env` ausente ou servidor não iniciado.

**Soluções:**

1. **Verificar se o `.env` existe:**
   ```bash
   ls -la .env
   cat .env
   ```

2. **Verificar se as variáveis de ambiente estão carregadas:**
   ```bash
   node -e "require('dotenv').config(); console.log(process.env.JWT_SECRET)"
   ```

3. **Testar o servidor localmente no servidor:**
   ```bash
   node backend/app.js
   ```

   Se aparecer erro, leia a mensagem para diagnosticar.

4. **Verificar logs de erro:**
   ```bash
   # No DomCloud, os logs geralmente estão em:
   tail -f ~/logs/app.log
   # ou
   journalctl -u domcloud-app -f
   ```

### Erro: "Cannot find module 'dotenv'"

```bash
npm install
```

### Erro: "Port already in use"

```bash
# Encontrar e matar o processo na porta 3000
lsof -ti:3000 | xargs kill -9
# ou
pkill -f "node backend/app.js"
```

### Usuários Não Conseguem Fazer Login

**Causa:** Novo JWT_SECRET invalidou todos os tokens existentes.

**Solução:** Os usuários precisam fazer login novamente.

---

## 🔒 Checklist de Segurança Pós-Deploy

- [ ] Arquivo `.env` criado e **NÃO** é acessível via web
- [ ] `FRONTEND_URL` está configurado com a URL correta de produção
- [ ] `JWT_SECRET` é forte e diferente do ambiente de desenvolvimento
- [ ] Permissões do arquivo `.env` estão corretas: `chmod 600 .env`
- [ ] Firewall permite acesso apenas às portas necessárias
- [ ] HTTPS está ativado (DomCloud geralmente fornece isso automaticamente)
- [ ] Backup do banco de dados foi feito antes do deploy

---

## 🔄 Processo de Atualização (Deploy de Novas Versões)

```bash
# 1. Fazer pull das últimas mudanças
git pull origin [branch-name]

# 2. Instalar/atualizar dependências
npm install

# 3. Reiniciar o servidor
pkill -f "node backend/app.js"
node backend/app.js &

# ou se usar PM2:
pm2 restart app
```

---

## 🐳 Alternativa: Deploy com PM2 (Recomendado)

PM2 é um gerenciador de processos para Node.js que reinicia automaticamente em caso de crash.

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar o app
pm2 start backend/app.js --name "clientes-app"

# Salvar a configuração para reiniciar após reboot
pm2 save
pm2 startup

# Comandos úteis:
pm2 list          # Listar apps
pm2 logs          # Ver logs
pm2 restart all   # Reiniciar
pm2 stop all      # Parar
pm2 delete all    # Remover
```

---

## 📞 Suporte DomCloud Específico

Para configurar no DomCloud especificamente:

1. Acesse o painel: https://domcloud.co/user/host
2. Selecione seu domínio `clientes.domcloud.dev`
3. Vá em "File Manager" e crie o arquivo `.env`
4. Vá em "App" > "Node.js" e configure:
   - **Node Version:** 18 ou superior
   - **Entry Point:** `backend/app.js`
   - **Environment:** Production

---

## ✅ Verificação Final

Depois de configurar tudo, teste:

1. **Acesse:** https://clientes.domcloud.dev
2. **Deve mostrar:** Página de login
3. **Teste login:** Com credenciais válidas
4. **Verifique:** Se o dashboard carrega corretamente

---

## 🆘 Se o Erro Persistir

Entre em contato fornecendo:
- Mensagem de erro completa dos logs
- Saída de: `node --version` e `npm --version`
- Conteúdo de `ps aux | grep node`
- Últimas 50 linhas dos logs: `tail -50 ~/logs/app.log`

---

## 📝 Notas Importantes

1. **NUNCA** commite o arquivo `.env` no git
2. Cada ambiente (dev/staging/prod) deve ter seu próprio `.env`
3. Sempre faça backup antes de fazer deploy
4. Teste em ambiente de staging antes de produção
