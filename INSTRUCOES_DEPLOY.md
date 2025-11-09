# 🚀 Instruções para Deploy em Produção

## ⚠️ PROBLEMA ATUAL

O erro 403 no login ocorre porque **o arquivo `.env` não existe no servidor de produção**.

## 📋 Como Corrigir

### Opção 1: Executar Script Automático (Recomendado)

1. **Conecte no servidor de produção via SSH**
   ```bash
   ssh clientes@sao.domcloud.co
   ```

2. **Navegue até o diretório do projeto**
   ```bash
   cd /home/clientes/public_html
   ```

3. **Execute o script de configuração**
   ```bash
   bash setup-production-env.sh
   ```

4. **Reinicie o servidor**
   ```bash
   pm2 restart all
   # ou
   npm start
   ```

### Opção 2: Criar .env Manualmente

1. **Conecte no servidor via SSH**

2. **Navegue até o diretório do projeto**
   ```bash
   cd /home/clientes/public_html
   ```

3. **Crie o arquivo .env**
   ```bash
   nano .env
   ```

4. **Cole o seguinte conteúdo** (gere seus próprios secrets):
   ```bash
   # Configuração do Banco de Dados
   DB_HOST=sao.domcloud.co
   DB_USER=feriasdriguatu2
   DB_PASS=gi7287+_XTLNc7_cXy
   DB_NAME=feriasdriguatu2_db
   DB_PORT=3306
   DB_DIALECT=mysql

   # Segurança - JWT (GERE NOVOS SECRETS!)
   JWT_SECRET=USE_O_COMANDO_ABAIXO_PARA_GERAR
   JWT_REFRESH_SECRET=USE_O_COMANDO_ABAIXO_PARA_GERAR

   # Segurança - CSRF (GERE UM NOVO SECRET!)
   CSRF_SECRET=USE_O_COMANDO_ABAIXO_PARA_GERAR

   # Configuração do Servidor
   PORT=3000
   NODE_ENV=production

   # Frontend URL (para CORS)
   FRONTEND_URL=https://clientes.domcloud.dev
   ```

5. **Para gerar secrets seguros**, execute:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
   Execute 3 vezes para gerar JWT_SECRET, JWT_REFRESH_SECRET e CSRF_SECRET.

6. **Salve o arquivo** (Ctrl+O, Enter, Ctrl+X no nano)

7. **Reinicie o servidor**
   ```bash
   pm2 restart all
   ```

### Opção 3: Via Painel de Controle do DomCloud

1. Acesse o painel do DomCloud
2. Vá em "Variables" ou "Environment Variables"
3. Adicione as variáveis:
   - `DB_HOST=sao.domcloud.co`
   - `DB_USER=feriasdriguatu2`
   - `DB_PASS=gi7287+_XTLNc7_cXy`
   - `DB_NAME=feriasdriguatu2_db`
   - `JWT_SECRET=` (gere um secret de 128 caracteres)
   - `JWT_REFRESH_SECRET=` (gere outro secret de 128 caracteres)
   - `CSRF_SECRET=` (gere outro secret de 128 caracteres)
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://clientes.domcloud.dev`

## ✅ Verificar se Funcionou

Após reiniciar o servidor, verifique os logs:

```bash
pm2 logs
```

Você deve ver:
```
[CSRF] CSRF_SECRET definido: SIM (comprimento: 128)
[CSRF] JWT_SECRET definido: SIM
[CSRF] NODE_ENV: production
[CSRF] CSRF protection configurada com sucesso
```

Se ver essas mensagens, o `.env` foi carregado corretamente! 🎉

## 🔒 Segurança

- ⚠️ **NUNCA** commite o arquivo `.env` no git
- ⚠️ **NUNCA** compartilhe seus secrets
- ✅ O `.env` já está no `.gitignore`
- ✅ Use secrets diferentes para cada ambiente (dev, staging, prod)

## 📞 Suporte

Se continuar com problemas, verifique:
1. O arquivo `.env` existe no servidor? `ls -la .env`
2. O servidor foi reiniciado? `pm2 status`
3. Os logs mostram as variáveis carregadas? `pm2 logs | grep CSRF`
