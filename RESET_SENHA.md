# 🔐 GUIA: Como Resetar Senha de Usuário

Este guia mostra **3 formas** de resetar a senha de um usuário quando ele esqueceu a senha atual.

---

## 📋 CENÁRIOS

| Cenário | Solução Recomendada |
|---------|---------------------|
| 🚨 **Emergência - Usuário esqueceu senha** | Opção 1: Script automático |
| 🔧 **Admin precisa resetar senha de usuário** | Opção 1: Script automático |
| 💻 **Desenvolvimento/Teste - Gerar hash rápido** | Opção 2: Script de hash |
| 🗄️ **Acesso direto ao banco de dados** | Opção 3: SQL manual |

---

## ✅ OPÇÃO 1: Script Automático (RECOMENDADO)

### 🎯 Use quando:
- Precisa resetar senha rapidamente
- Quer garantir segurança (revoga tokens automaticamente)
- Não quer lidar com SQL manual

### 📝 Como usar:

```bash
# Sintaxe
node backend/scripts/resetPassword.js <email> <nova-senha>

# Exemplo
node backend/scripts/resetPassword.js usuario@exemplo.com NovaSenha123!
```

### ✨ O que o script faz:

1. ✅ Verifica se o usuário existe no banco
2. ✅ Gera hash bcrypt da nova senha (10 rounds)
3. ✅ Atualiza a senha no banco de dados
4. ✅ **Revoga TODOS os tokens de acesso** (força re-login)
5. ✅ Mostra confirmação de sucesso

### 📤 Saída esperada:

```
🔐 Iniciando reset de senha...

📧 Email: usuario@exemplo.com
🔑 Nova senha: **************

✅ Usuário encontrado: ID 5

🔄 Gerando hash da nova senha...
✅ Hash gerado: $2a$10$abc123...

💾 Atualizando senha no banco de dados...
✅ Senha atualizada no banco!

🔒 Revogando todos os tokens de acesso...
✅ Tokens revogados!

════════════════════════════════════════
✅ SENHA RESETADA COM SUCESSO!
════════════════════════════════════════

📧 Email: usuario@exemplo.com
🔑 Nova senha: NovaSenha123!

⚠️  IMPORTANTE:
   - O usuário foi desconectado de todos os dispositivos
   - Ele precisará fazer login novamente
   - Recomende que ele altere a senha após o primeiro login
```

---

## 🔨 OPÇÃO 2: Gerar Hash Manualmente

### 🎯 Use quando:
- Quer apenas gerar o hash
- Vai executar SQL manualmente depois
- Precisa do hash para documentação/testes

### 📝 Como usar:

```bash
# Sintaxe
node backend/scripts/generateHash.js <senha>

# Exemplo
node backend/scripts/generateHash.js MinhaSenh@123
```

### 📤 Saída esperada:

```
🔐 Gerando hash bcrypt...

📝 Senha: **************

✅ Hash gerado com sucesso!

═══════════════════════════════════════════════════════════
$2a$10$Xc3fP9vQm8Zr1Y2x3X4t5u6vW7xY8zA9bC0dE1fG2hI3jK4lM5nO6
═══════════════════════════════════════════════════════════

📋 Agora você pode usar este hash no banco de dados:

UPDATE users SET password = '$2a$10$Xc3fP9vQm8Zr1Y2x3X4t5u6vW7xY8zA9bC0dE1fG2hI3jK4lM5nO6' WHERE email = 'usuario@exemplo.com';
```

### 🗄️ Depois, execute no banco:

```sql
-- 1. Atualizar senha
UPDATE users
SET password = '<hash-gerado>'
WHERE email = 'usuario@exemplo.com';

-- 2. (Opcional mas recomendado) Revogar tokens de acesso
DELETE FROM refresh_tokens
WHERE user_id = (SELECT id FROM users WHERE email = 'usuario@exemplo.com');
```

---

## 💾 OPÇÃO 3: SQL Direto no Banco (Manual)

### 🎯 Use quando:
- Tem acesso direto ao banco de dados
- Prefere fazer tudo via SQL
- É uma emergência e não pode executar scripts Node.js

### 📝 Passos:

#### 1. Gere o hash primeiro (use Opção 2 ou ferramenta online)

```bash
node backend/scripts/generateHash.js MinhaSenh@123
```

#### 2. Conecte ao MySQL

```bash
mysql -u seu_usuario -p nome_do_banco
```

#### 3. Execute os comandos SQL

```sql
-- Verificar se usuário existe
SELECT id, email FROM users WHERE email = 'usuario@exemplo.com';

-- Atualizar senha (substitua o hash)
UPDATE users
SET password = '$2a$10$Xc3fP9vQm8Zr1Y2x3X4t5u6vW7xY8zA9bC0dE1fG2hI3jK4lM5nO6'
WHERE email = 'usuario@exemplo.com';

-- Verificar se atualizou
SELECT id, email, LEFT(password, 20) as password_hash
FROM users
WHERE email = 'usuario@exemplo.com';

-- (IMPORTANTE) Revogar tokens antigos
DELETE FROM refresh_tokens
WHERE user_id = (SELECT id FROM users WHERE email = 'usuario@exemplo.com');
```

---

## ⚠️ IMPORTANTE: Sobre Hash Bcrypt

### 🔐 O que é bcrypt?

- Algoritmo de criptografia **unidirecional** (não pode ser revertido)
- Gera hash diferente mesmo para senhas iguais (salt aleatório)
- 10 rounds = nível de dificuldade (quanto maior, mais seguro e lento)

### 📊 Exemplo de hash:

```
Senha original: MinhaSenh@123
Hash bcrypt:    $2a$10$Xc3fP9vQm8Zr1Y2x3X4t5u6vW7xY8zA9bC0dE1fG2hI3jK4lM5nO6

Estrutura:
$2a     = Algoritmo bcrypt
$10     = Número de rounds (custo)
$...    = Salt (aleatório)
...     = Hash da senha
```

### ❌ NÃO FAÇA:

```sql
-- ❌ ERRADO - Senha em texto puro
UPDATE users SET password = 'MinhaSenh@123' WHERE email = 'user@exemplo.com';

-- ❌ ERRADO - Hash MD5 (inseguro)
UPDATE users SET password = MD5('MinhaSenh@123') WHERE email = 'user@exemplo.com';
```

### ✅ FAÇA:

```bash
# ✅ CORRETO - Use o script
node backend/scripts/resetPassword.js user@exemplo.com MinhaSenh@123

# ✅ CORRETO - Ou gere hash bcrypt primeiro
node backend/scripts/generateHash.js MinhaSenh@123
```

---

## 🔒 SEGURANÇA: Por que revogar tokens?

Quando você reseta a senha de um usuário:

1. **Sem revogar tokens**:
   - ❌ Usuário pode estar comprometido
   - ❌ Token antigo ainda funciona
   - ❌ Invasor continua com acesso

2. **Revogando tokens**:
   - ✅ Força re-login imediato
   - ✅ Invalida todos os acessos antigos
   - ✅ Garante que só o dono da nova senha tem acesso

### 🗄️ Query para revogar tokens:

```sql
DELETE FROM refresh_tokens WHERE user_id = ?;
```

---

## 📋 CHECKLIST PÓS-RESET

Após resetar a senha de um usuário:

- [ ] ✅ Senha foi atualizada no banco
- [ ] ✅ Hash bcrypt foi usado (começa com `$2a$10$`)
- [ ] ✅ Tokens foram revogados (se aplicável)
- [ ] ✅ Usuário foi notificado da nova senha
- [ ] ⚠️ Recomendou que ele altere a senha no primeiro login
- [ ] 📝 Documentou o reset (quem, quando, por quê)

---

## 🆘 TROUBLESHOOTING

### ❌ "Usuário não encontrado"

```bash
# Verifique se o email está correto
mysql> SELECT id, email FROM users WHERE email LIKE '%parte_do_email%';
```

### ❌ "Erro ao conectar ao banco"

1. Verifique se o arquivo `.env` existe e está configurado
2. Verifique se o banco de dados está rodando
3. Teste a conexão:

```bash
mysql -u seu_usuario -p -h localhost nome_do_banco
```

### ❌ "bcrypt não encontrado"

```bash
# Instale as dependências
cd clientesreformulado2
npm install
```

### ❌ Senha não funciona após reset

1. Verifique se o hash foi salvo corretamente:
   ```sql
   SELECT LEFT(password, 20) FROM users WHERE email = 'usuario@exemplo.com';
   ```
   - Deve começar com `$2a$10$`

2. Teste a senha em outro usuário de teste

3. Verifique logs do servidor ao tentar login

---

## 📚 RECURSOS ADICIONAIS

### Scripts disponíveis:

- [`backend/scripts/resetPassword.js`](backend/scripts/resetPassword.js) - Reset completo
- [`backend/scripts/generateHash.js`](backend/scripts/generateHash.js) - Gerar hash apenas

### Endpoints relacionados:

- `POST /auth/login` - Login normal
- `PUT /auth/change-password` - Alterar senha (requer senha atual)
- `POST /auth/logout` - Logout e revogação de token

### Documentação:

- [MELHORIAS_IMPLEMENTADAS.md](MELHORIAS_IMPLEMENTADAS.md) - Histórico de melhorias
- API Docs: http://localhost:3000/api-docs

---

## 📞 SUPORTE

Se precisar de ajuda:

1. Verifique os logs em `backend/logs/`
2. Execute o script com `--verbose` (se disponível)
3. Consulte a documentação do bcrypt: https://www.npmjs.com/package/bcryptjs

---

*Última atualização: 24/11/2025*
*Versão: 1.0*
