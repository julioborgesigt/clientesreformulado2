# 🔧 Correção do Frontend Vue - Erro de Login

## 🔴 Problema Identificado

O frontend Vue (`https://clientesvue-1.onrender.com`) estava tentando fazer login mas recebia este erro:

```
Failed to execute 'setRequestHeader' on 'XMLHttpRequest': '<!doctype html>...' is not a valid HTTP header field value
```

### Causa Raiz

No arquivo `src/api/axios.js`, linhas 15-17:

```javascript
// CÓDIGO COM ERRO ❌
const baseURL = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev');
const csrfUrl = baseURL ? `${baseURL}/api/csrf-token` : '/api/csrf-token';
```

**Problema:** Como não existe arquivo `.env`, o `getEnv()` retorna string vazia ou `undefined`, fazendo o código usar URL relativa `/api/csrf-token`.

**Resultado:**
- Tentava buscar: `https://clientesvue-1.onrender.com/api/csrf-token` ❌ (próprio frontend)
- Recebia: HTML da página Vue ao invés de JSON da API
- Erro: Tentava usar HTML como header HTTP

---

## ✅ Solução

### Arquivo: `src/api/axios.js`

#### Alteração 1: Função `fetchCsrfToken()` (linha 15-17)

**ANTES (linha 15-17):**
```javascript
const baseURL = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev');
// Em desenvolvimento (VITE_API_URL vazio), usa URL relativa para proxy do Vite
const csrfUrl = baseURL ? `${baseURL}/api/csrf-token` : '/api/csrf-token';
```

**DEPOIS:**
```javascript
// CORREÇÃO: Garante que sempre usa a URL do backend
const baseURL = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev') || 'https://clientes.domcloud.dev';
const csrfUrl = `${baseURL}/api/csrf-token`;
```

#### Alteração 2: Configuração do apiClient (linha 59-61)

**ANTES (linha 59-61):**
```javascript
const baseURLEnv = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev');
const baseURL = baseURLEnv === '' ? '' : baseURLEnv;
```

**DEPOIS:**
```javascript
// CORREÇÃO: Sempre usa a URL do backend, nunca vazio
const baseURLEnv = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev') || 'https://clientes.domcloud.dev';
const baseURL = baseURLEnv;
```

#### Alteração 3: Comentário (linha 58)

**ANTES:**
```javascript
// Em desenvolvimento (VITE_API_URL vazio), usa URLs relativas com proxy do Vite
// Em produção, usa a URL completa do backend
```

**DEPOIS:**
```javascript
// CORREÇÃO: Sempre usa a URL do backend, nunca vazio
```

---

## 📝 Como Aplicar a Correção

### Opção 1: Manual (Recomendado)

1. **Abra o repositório Vue:**
   ```bash
   cd clientesvue
   ```

2. **Edite o arquivo `src/api/axios.js`:**

   Localize a linha 15-17:
   ```javascript
   const baseURL = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev');
   const csrfUrl = baseURL ? `${baseURL}/api/csrf-token` : '/api/csrf-token';
   ```

   Substitua por:
   ```javascript
   const baseURL = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev') || 'https://clientes.domcloud.dev';
   const csrfUrl = `${baseURL}/api/csrf-token`;
   ```

3. **Localize a linha 59-61:**
   ```javascript
   const baseURLEnv = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev');
   const baseURL = baseURLEnv === '' ? '' : baseURLEnv;
   ```

   Substitua por:
   ```javascript
   const baseURLEnv = getEnv('VITE_API_URL', 'https://clientes.domcloud.dev') || 'https://clientes.domcloud.dev';
   const baseURL = baseURLEnv;
   ```

4. **Salve e faça build:**
   ```bash
   npm run build
   ```

5. **Deploy:**
   - Faça commit e push
   - O Render vai fazer deploy automaticamente

### Opção 2: Copiar arquivo corrigido

Copie o arquivo `axios-fixed.js` (anexado neste repositório) para `clientesvue/src/api/axios.js`

---

## ✅ Verificação

Após aplicar a correção, você deve ver nos logs do console:

```
=== CONFIGURAÇÃO AXIOS ===
baseURL calculado: https://clientes.domcloud.dev
🔐 Buscando CSRF token de: https://clientes.domcloud.dev/api/csrf-token
✅ CSRF token obtido com sucesso!
```

**Não deve mais aparecer:**
```
Failed to execute 'setRequestHeader'...
```

---

## 🔒 Segurança

O backend já está configurado corretamente com CORS permitindo:
- ✅ `https://clientesvue-1.onrender.com`
- ✅ `https://clientes.domcloud.dev`
- ✅ `http://localhost:3000`
- ✅ `http://localhost:5173`

---

## 📞 Suporte

Se após a correção ainda houver problemas:

1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Verifique se o backend está rodando: `https://clientes.domcloud.dev/api/csrf-token`
3. Veja os logs do console (F12) e me envie
4. Verifique se o build foi feito corretamente: `npm run build`

---

## 📊 Resumo

| Item | Antes | Depois |
|------|-------|--------|
| URL do CSRF | `/api/csrf-token` (relativa) ❌ | `https://clientes.domcloud.dev/api/csrf-token` ✅ |
| baseURL | Vazia ou undefined ❌ | `https://clientes.domcloud.dev` ✅ |
| Resposta | HTML (erro) ❌ | JSON (correto) ✅ |
| Login | Falha ❌ | Funciona ✅ |
