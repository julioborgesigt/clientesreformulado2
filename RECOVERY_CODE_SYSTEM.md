# 🔐 SISTEMA DE CÓDIGO DE RECUPERAÇÃO

Sistema de autenticação segura com código de recuperação que elimina a necessidade de reset de senha por email.

---

## 📋 ÍNDICE

1. [Visão Geral](#visão-geral)
2. [Como Funciona](#como-funciona)
3. [Fluxo Completo](#fluxo-completo)
4. [Endpoints da API](#endpoints-da-api)
5. [Exemplos de Uso](#exemplos-de-uso)
6. [Segurança](#segurança)
7. [Migration do Banco de Dados](#migration-do-banco-de-dados)
8. [Frontend - Integração](#frontend---integração)

---

## 🎯 VISÃO GERAL

### O que é o Código de Recuperação?

O código de recuperação é um código alfanumérico único gerado no momento do registro que permite ao usuário:

1. ✅ Completar o primeiro login (verificação)
2. ✅ Resetar a senha sem precisar de email
3. ✅ Recuperar acesso à conta de forma segura

**Formato:** `XXXX-XXXX-XXXX-XXXX` (16 caracteres alfanuméricos)
**Exemplo:** `A1B2-C3D4-E5F6-G7H8`

### Por que usar Recovery Code?

| Método Tradicional (Email) | Recovery Code (Este Sistema) |
|----------------------------|------------------------------|
| ❌ Depende de email funcional | ✅ Independente de email |
| ❌ Pode demorar minutos/horas | ✅ Reset instantâneo |
| ❌ Link expira | ✅ Código não expira |
| ❌ Phishing via email | ✅ Usuário guarda offline |
| ❌ Email pode ser hackeado | ✅ Código offline seguro |

---

## 🔄 COMO FUNCIONA

### 1. **REGISTRO** 📝
```
Usuário preenche: Nome, Email, Senha
         ↓
Sistema gera: Recovery Code único
         ↓
Sistema mostra: CÓDIGO UMA ÚNICA VEZ
         ↓
Usuário guarda: Em local seguro
```

### 2. **PRIMEIRO LOGIN** 🔑
```
Usuário tenta: Login normal
         ↓
Sistema pede: Recovery Code
         ↓
Usuário fornece: Código guardado
         ↓
Sistema valida: Marca conta como ativa
         ↓
Login permitido: Tokens JWT gerados
```

### 3. **ESQUECEU A SENHA** 🔓
```
Usuário esqueceu: Senha atual
         ↓
Usuário acessa: /auth/reset-password-with-code
         ↓
Usuário fornece: Email + Recovery Code + Nova Senha
         ↓
Sistema valida: Código e reseta senha
         ↓
Senha alterada: Todos os tokens revogados
```

---

## 🔀 FLUXO COMPLETO

### Diagrama do Fluxo

```
┌─────────────────────────────────────────────────────────────┐
│                      REGISTRO                                │
│  POST /auth/register                                         │
│  { name, email, password }                                   │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Sistema Gera Código  │
          │ A1B2-C3D4-E5F6-G7H8  │
          └──────────┬───────────┘
                     │
                     ▼
          ┌─────────────────────────────┐
          │ ⚠️ AVISO AO USUÁRIO         │
          │ "Guarde este código em      │
          │  local seguro! Não será     │
          │  mostrado novamente!"       │
          └──────────┬──────────────────┘
                     │
                     ▼
┌────────────────────────────────────────────────────────────┐
│               PRIMEIRO LOGIN (Obrigatório)                  │
│  POST /auth/first-login                                    │
│  { email, password, recoveryCode }                         │
└────────────────────┬───────────────────────────────────────┘
                     │
                     ▼
          ┌──────────────────────┐
          │ Valida Código        │
          │ Marca: first_login   │
          │        = TRUE        │
          └──────────┬───────────┘
                     │
                     ├─────────────┬────────────────┐
                     ▼             ▼                ▼
        ┌──────────────┐  ┌────────────┐  ┌────────────────┐
        │ LOGIN NORMAL │  │ ALTERAÇÃO  │  │ RESET COM      │
        │              │  │ DE SENHA   │  │ CÓDIGO         │
        │ POST /login  │  │ (com senha │  │ (sem senha     │
        │              │  │ atual)     │  │ atual)         │
        └──────────────┘  └────────────┘  └────────────────┘
```

---

## 🌐 ENDPOINTS DA API

### 1. `POST /auth/register` - Registro

**Entrada:**
```json
{
  "name": "João Silva",
  "email": "joao@exemplo.com",
  "password": "SenhaSegura123!@#"
}
```

**Saída (SUCESSO):**
```json
{
  "message": "Usuário registrado com sucesso!",
  "recoveryCode": "A1B2-C3D4-E5F6-G7H8",
  "warning": {
    "title": "⚠️ IMPORTANTE: Guarde este código em local seguro!",
    "message": "Este código de recuperação será solicitado no primeiro login e para resetar sua senha. Ele NÃO será mostrado novamente!",
    "code": "A1B2-C3D4-E5F6-G7H8",
    "instructions": [
      "1. Anote este código em um local seguro",
      "2. NÃO compartilhe com ninguém",
      "3. Você precisará dele no primeiro login",
      "4. Este código é necessário para recuperar sua conta"
    ]
  }
}
```

---

### 2. `POST /auth/login` - Login Normal

**Entrada:**
```json
{
  "email": "joao@exemplo.com",
  "password": "SenhaSegura123!@#"
}
```

**Saída (Primeiro login NÃO concluído):**
```json
{
  "error": "Primeiro login não concluído",
  "requiresRecoveryCode": true,
  "message": "Este é seu primeiro login. Você precisa fornecer o código de recuperação que foi mostrado no registro.",
  "nextStep": "Use o endpoint POST /auth/first-login com email, senha e recovery code"
}
```

**Saída (Login normal - após primeiro login):**
```json
{
  "message": "Login bem-sucedido!",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

---

### 3. `POST /auth/first-login` - Primeiro Login

**Entrada:**
```json
{
  "email": "joao@exemplo.com",
  "password": "SenhaSegura123!@#",
  "recoveryCode": "A1B2-C3D4-E5F6-G7H8"
}
```

**Saída:**
```json
{
  "message": "Primeiro login concluído com sucesso!",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

---

### 4. `POST /auth/reset-password-with-code` - Reset com Código

**Entrada:**
```json
{
  "email": "joao@exemplo.com",
  "recoveryCode": "A1B2-C3D4-E5F6-G7H8",
  "newPassword": "NovaSenhaSegura456!@#"
}
```

**Saída:**
```json
{
  "message": "Senha resetada com sucesso! Faça login com a nova senha.",
  "info": "Por segurança, você foi desconectado de todos os dispositivos."
}
```

---

### 5. `PUT /auth/change-password` - Alterar Senha (com senha atual)

**Requer autenticação (Bearer token)**

**Entrada:**
```json
{
  "currentPassword": "SenhaAntiga123!",
  "newPassword": "SenhaNova456!@#"
}
```

**Saída:**
```json
{
  "message": "Senha alterada com sucesso! Por segurança, faça login novamente."
}
```

---

## 💡 EXEMPLOS DE USO

### Exemplo 1: Fluxo Completo de Registro e Primeiro Login

```bash
# 1. REGISTRO
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Maria Santos",
    "email": "maria@exemplo.com",
    "password": "MinhaSenh@123"
  }'

# Resposta: { ..., "recoveryCode": "F1G2-H3I4-J5K6-L7M8", ... }
# ⚠️ ANOTAR O CÓDIGO!

# 2. TENTATIVA DE LOGIN (vai falhar)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@exemplo.com",
    "password": "MinhaSenh@123"
  }'

# Resposta: { "error": "Primeiro login não concluído", ... }

# 3. PRIMEIRO LOGIN (com código)
curl -X POST http://localhost:3000/auth/first-login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@exemplo.com",
    "password": "MinhaSenh@123",
    "recoveryCode": "F1G2-H3I4-J5K6-L7M8"
  }'

# Resposta: { "message": "Primeiro login concluído!", "accessToken": "...", ... }

# 4. AGORA LOGIN FUNCIONA NORMALMENTE
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@exemplo.com",
    "password": "MinhaSenh@123"
  }'

# Resposta: { "accessToken": "...", "refreshToken": "..." }
```

---

### Exemplo 2: Esqueceu a Senha

```bash
# Usuário esqueceu a senha, mas tem o recovery code
curl -X POST http://localhost:3000/auth/reset-password-with-code \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@exemplo.com",
    "recoveryCode": "F1G2-H3I4-J5K6-L7M8",
    "newPassword": "NovaSenha456!@#"
  }'

# Resposta: { "message": "Senha resetada com sucesso! Faça login com a nova senha." }

# Agora pode fazer login com a nova senha
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "maria@exemplo.com",
    "password": "NovaSenha456!@#"
  }'
```

---

## 🔒 SEGURANÇA

### Como o Código é Armazenado?

1. **No Registro:**
   - Código gerado: `A1B2-C3D4-E5F6-G7H8` (texto plano)
   - Hash bcrypt: `$2a$10$Xc3fP9vQm8Zr1Y2x3X4t5u...` (banco de dados)

2. **Na Validação:**
   - Usuário fornece: `A1B2-C3D4-E5F6-G7H8`
   - Sistema compara: `bcrypt.compare(codigo, hash_banco)`
   - Resultado: `true` ou `false`

### Medidas de Segurança

| Medida | Descrição |
|--------|-----------|
| ✅ **Hash bcrypt** | Código nunca armazenado em texto plano |
| ✅ **10 rounds** | Alto custo computacional contra brute force |
| ✅ **Única exibição** | Código mostrado UMA vez no registro |
| ✅ **Rate limiting** | Proteção contra tentativas em massa |
| ✅ **Token revocation** | Todos os tokens revogados no reset |
| ✅ **Logging** | Todas as tentativas são registradas |
| ✅ **Validação de formato** | Rejeita códigos mal formatados |

### Comparação com Senhas

| Aspecto | Senha | Recovery Code |
|---------|-------|---------------|
| Frequência de uso | Diária | Rara (primeiro login + reset) |
| Pode ser memorizada | Sim | Não (deve ser guardado) |
| Complexidade | Alta | Muito alta (16 chars) |
| Armazenamento | Hash bcrypt | Hash bcrypt |
| Usuário pode perder | Esquece | Perde papel/arquivo |

---

## 🗄️ MIGRATION DO BANCO DE DADOS

### Aplicar a Migration

```bash
# Conectar ao MySQL
mysql -u seu_usuario -p nome_do_banco

# Executar migration
source backend/migrations/004_add_recovery_code.sql
```

### Ou via Node.js

```bash
# Usar script de reset de senha (já usa os novos campos)
node backend/scripts/resetPassword.js usuario@exemplo.com NovaSenha123!
```

### Estrutura dos Campos Adicionados

```sql
ALTER TABLE users
ADD COLUMN recovery_code VARCHAR(255) NULL,
ADD COLUMN first_login_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN recovery_code_created_at DATETIME NULL;
```

**Campos:**
- `recovery_code`: Hash bcrypt do código (não o código em si!)
- `first_login_completed`: Boolean - se o usuário completou primeiro login
- `recovery_code_created_at`: Data de criação do código

---

## 🎨 FRONTEND - INTEGRAÇÃO

### 1. Página de Registro

```javascript
// components/RegisterForm.vue
<template>
  <div>
    <form @submit.prevent="register">
      <input v-model="name" placeholder="Nome" required />
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Senha" required />
      <button type="submit">Registrar</button>
    </form>

    <!-- Modal com Recovery Code -->
    <div v-if="recoveryCode" class="recovery-code-modal">
      <h2>⚠️ IMPORTANTE: Guarde este código!</h2>
      <div class="code-display">{{ recoveryCode }}</div>
      <p>Este código será necessário no primeiro login e para recuperar sua conta.</p>
      <button @click="downloadCode">📥 Baixar como TXT</button>
      <button @click="copyCode">📋 Copiar</button>
      <button @click="confirmedCode">✅ Guardei o código</button>
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      name: '',
      email: '',
      password: '',
      recoveryCode: null
    }
  },
  methods: {
    async register() {
      const response = await fetch('http://localhost:3000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.name,
          email: this.email,
          password: this.password
        })
      });

      const data = await response.json();

      if (response.ok) {
        this.recoveryCode = data.recoveryCode;
        // NÃO navegar ainda! Esperar confirmação do usuário
      }
    },
    downloadCode() {
      const blob = new Blob([`Recovery Code: ${this.recoveryCode}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'recovery-code.txt';
      a.click();
    },
    copyCode() {
      navigator.clipboard.writeText(this.recoveryCode);
      alert('Código copiado!');
    },
    confirmedCode() {
      // Salva email para usar no primeiro login
      localStorage.setItem('pendingFirstLogin', this.email);
      this.$router.push('/first-login');
    }
  }
}
</script>
```

---

### 2. Página de Primeiro Login

```javascript
// components/FirstLogin.vue
<template>
  <div>
    <h1>Primeiro Login</h1>
    <form @submit.prevent="firstLogin">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="password" type="password" placeholder="Senha" required />
      <input v-model="recoveryCode" placeholder="XXXX-XXXX-XXXX-XXXX" required />
      <button type="submit">Concluir Primeiro Login</button>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      email: localStorage.getItem('pendingFirstLogin') || '',
      password: '',
      recoveryCode: ''
    }
  },
  methods: {
    async firstLogin() {
      const response = await fetch('http://localhost:3000/auth/first-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
          recoveryCode: this.recoveryCode
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Salva tokens
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);

        // Remove flag de pending
        localStorage.removeItem('pendingFirstLogin');

        // Redireciona
        this.$router.push('/dashboard');
      } else {
        alert(data.message || 'Erro no primeiro login');
      }
    }
  }
}
</script>
```

---

### 3. Página de Login (detecta primeiro login)

```javascript
// components/LoginForm.vue
async login() {
  const response = await fetch('http://localhost:3000/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: this.email,
      password: this.password
    })
  });

  const data = await response.json();

  if (response.ok) {
    // Login normal
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    this.$router.push('/dashboard');
  } else if (data.requiresRecoveryCode) {
    // Primeiro login pendente
    alert('Primeiro login não concluído. Você precisa fornecer o código de recuperação.');
    localStorage.setItem('pendingFirstLogin', this.email);
    this.$router.push('/first-login');
  } else {
    alert('Credenciais inválidas');
  }
}
```

---

### 4. Página de Reset de Senha

```javascript
// components/ResetPassword.vue
<template>
  <div>
    <h1>Esqueceu a Senha?</h1>
    <form @submit.prevent="resetPassword">
      <input v-model="email" type="email" placeholder="Email" required />
      <input v-model="recoveryCode" placeholder="Código de Recuperação" required />
      <input v-model="newPassword" type="password" placeholder="Nova Senha" required />
      <button type="submit">Resetar Senha</button>
    </form>
  </div>
</template>

<script>
export default {
  data() {
    return {
      email: '',
      recoveryCode: '',
      newPassword: ''
    }
  },
  methods: {
    async resetPassword() {
      const response = await fetch('http://localhost:3000/auth/reset-password-with-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          recoveryCode: this.recoveryCode,
          newPassword: this.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert('Senha resetada com sucesso! Faça login com a nova senha.');
        this.$router.push('/login');
      } else {
        alert(data.message || 'Erro ao resetar senha');
      }
    }
  }
}
</script>
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### Backend
- [x] Migration SQL aplicada
- [x] Utilitário recoveryCode.js criado
- [x] Endpoint POST /auth/register modificado
- [x] Endpoint POST /auth/login modificado
- [x] Endpoint POST /auth/first-login criado
- [x] Endpoint POST /auth/reset-password-with-code criado
- [x] Documentação Swagger adicionada
- [x] Rate limiting configurado
- [x] Logging implementado

### Frontend (a fazer)
- [ ] Modal de exibição do recovery code no registro
- [ ] Página de primeiro login
- [ ] Detecção de primeiro login no login normal
- [ ] Página de reset de senha com código
- [ ] Função de download/cópia do código
- [ ] Validação de formato do código (XXXX-XXXX-XXXX-XXXX)

---

## 🆘 FAQ

**P: O código de recuperação expira?**
R: Não. O código não expira e pode ser usado a qualquer momento.

**P: Posso gerar um novo código?**
R: Não implementado ainda. Por segurança, o código é gerado uma única vez no registro.

**P: O que fazer se perder o código?**
R: Apenas um administrador pode resetar manualmente usando o script `resetPassword.js`.

**P: Posso usar o código várias vezes?**
R: Sim. O código pode ser usado para primeiro login e reset de senha quantas vezes necessário.

**P: O código é case-sensitive?**
R: Não. O sistema converte para maiúsculas automaticamente.

**P: Preciso dos hífens ao digitar?**
R: Não obrigatório, mas recomendado. O sistema aceita `A1B2C3D4E5F6G7H8` ou `A1B2-C3D4-E5F6-G7H8`.

---

**Documentação criada em:** 24/11/2025
**Versão:** 1.0
**Autor:** Claude Code
