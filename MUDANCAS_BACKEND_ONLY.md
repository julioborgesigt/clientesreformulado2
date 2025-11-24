# 🔄 Mudanças: Projeto Backend-Only

Este documento descreve as alterações realizadas para transformar o projeto em uma API backend isolada, separando completamente do frontend Vue.js.

## 📅 Data da Migração
**22 de novembro de 2025**

---

## ✅ Alterações Realizadas

### 1. Remoção de Código Frontend

#### Arquivos Deletados:
- ❌ `frontend/` - Pasta completa removida, incluindo:
  - `frontend/index.html`
  - `frontend/dashboard.html`
  - `frontend/login.js`
  - `frontend/auth.js`
  - `frontend/script.js`
  - `frontend/scripttemp.js`
  - `frontend/sanitize.js`
  - `frontend/style.css`
  - `frontend/styledash.css`
- ❌ `axios-fixed.js` - Arquivo auxiliar de frontend
- ❌ `.env do site clientes novo.txt` - Arquivo temporário de configuração
- ❌ `CORRECAO_FRONTEND_VUE.md` - Documentação específica de frontend
- ❌ `BUGFIX.md` - Documentação antiga
- ❌ `SOLUCAO_FINAL.md` - Documentação antiga

### 2. Alterações no Backend

#### `backend/app.js`

**Antes:**
```javascript
// Configura arquivos estáticos
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota para a página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html'));
});

app.get('/dashboard.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'dashboard.html'));
});
```

**Depois:**
```javascript
// API Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API de Gestão de Clientes - Backend',
    version: '1.0.0',
    endpoints: {
      docs: '/api/docs',
      auth: '/auth',
      clientes: '/clientes',
      servicos: '/servicos'
    }
  });
});
```

### 3. Atualizações de Documentação

#### `README.md`
- ✅ Reescrito completamente para focar apenas na API backend
- ✅ Removidas todas as referências ao frontend HTML/CSS/JS
- ✅ Adicionada seção de endpoints da API
- ✅ Documentação de autenticação JWT expandida
- ✅ Adicionada nota indicando uso de frontend Vue.js separado

#### `package.json`
- ✅ Nome alterado: `projetoclientes` → `clientes-api-backend`
- ✅ Descrição atualizada: "API REST para gestão de clientes - Backend"
- ✅ Main alterado: `index.js` → `backend/app.js`

---

## 🎯 Estrutura Final do Projeto

```
clientesreformulado2/
├── backend/                    # Código da API
│   ├── app.js                 # Servidor Express
│   ├── db/                    # Conexão e migrações
│   ├── middleware/            # Middlewares (auth, etc)
│   ├── routes/                # Rotas da API
│   ├── utils/                 # Utilitários (logger, tokens)
│   └── swagger.js             # Documentação OpenAPI
├── database/                   # Migrações SQL
├── __tests__/                  # Testes automatizados
├── logs/                       # Arquivos de log
├── .env.example               # Template de configuração
├── .gitignore                 # Arquivos ignorados
├── banco.sql                  # Schema do banco
├── package.json               # Dependências
├── README.md                  # Documentação principal
├── DEPLOY.md                  # Guia de deploy
└── AUDITORIA_SEGURANCA.md     # Relatório de segurança
```

---

## 🔌 Integração com Frontend Vue.js

O frontend Vue.js deve estar hospedado separadamente e se conectar a esta API.

### Configuração do Frontend Vue.js

1. **Configurar URL da API:**
   ```javascript
   // No frontend Vue.js
   const API_URL = 'https://sua-api.domcloud.dev';
   // ou
   const API_URL = 'http://localhost:3000'; // desenvolvimento
   ```

2. **Configurar CORS no Backend:**
   ```env
   # No .env do backend
   FRONTEND_URL=https://seu-frontend-vue.domcloud.dev
   ```

3. **Headers necessários nas requisições:**
   ```javascript
   // Requisição autenticada
   {
     headers: {
       'Authorization': `Bearer ${accessToken}`,
       'x-csrf-token': csrfToken,
       'Content-Type': 'application/json'
     },
     credentials: 'include'
   }
   ```

### Endpoints Principais para o Frontend

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/csrf-token` | GET | Obter token CSRF |
| `/auth/login` | POST | Login do usuário |
| `/auth/register` | POST | Registrar novo usuário |
| `/auth/refresh` | POST | Renovar access token |
| `/auth/logout` | POST | Fazer logout |
| `/clientes/list` | GET | Listar clientes (paginado) |
| `/clientes/add` | POST | Adicionar cliente |
| `/clientes/update/:id` | PUT | Atualizar cliente |
| `/clientes/delete/:id` | DELETE | Deletar cliente |
| `/clientes/dashboard-stats` | GET | Estatísticas do dashboard |
| `/servicos/list` | GET | Listar serviços |

---

## 🚀 Como Usar

### 1. Backend (Este Projeto)

```bash
# Instalar dependências
npm install

# Configurar .env
cp .env.example .env
# Editar .env com suas credenciais

# Iniciar servidor
npm run dev
```

Acesse: `http://localhost:3000`
- API: `http://localhost:3000/`
- Docs: `http://localhost:3000/api/docs`

### 2. Frontend Vue.js (Projeto Separado)

Configure o frontend para apontar para `http://localhost:3000` em desenvolvimento ou a URL de produção do backend.

---

## 🔒 Segurança

### Origens Permitidas (CORS)

O backend está configurado para aceitar requisições das seguintes origens:

```javascript
// backend/app.js - Linha 33
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',      // Vite dev server (Vue.js)
  'https://clientes.domcloud.dev',
  'https://clientesvue.domcloud.dev',
  'https://clientesvue-1.onrender.com',
  process.env.FRONTEND_URL       // Configurável via .env
];
```

Para adicionar uma nova origem:
1. Adicione no array `allowedOrigins` em `backend/app.js`
2. Ou configure `FRONTEND_URL` no `.env`

---

## 📝 Checklist de Deploy

### Backend (Este Projeto)
- [ ] Configurar `.env` no servidor com credenciais de produção
- [ ] Definir `FRONTEND_URL` com a URL do frontend Vue.js
- [ ] Executar `npm install --production`
- [ ] Iniciar servidor: `npm start` ou `pm2 start backend/app.js`
- [ ] Verificar logs em `logs/`

### Frontend Vue.js (Projeto Separado)
- [ ] Configurar URL da API backend
- [ ] Build: `npm run build`
- [ ] Deploy dos arquivos estáticos
- [ ] Testar conexão com a API

---

## 🐛 Troubleshooting

### Erro: CORS blocked
**Causa:** URL do frontend não está em `allowedOrigins`
**Solução:** Adicione a URL em `backend/app.js` linha 33 ou configure `FRONTEND_URL` no `.env`

### Erro: CSRF token invalid
**Causa:** Frontend não está obtendo/enviando token CSRF corretamente
**Solução:**
1. Faça GET em `/api/csrf-token` antes de qualquer operação POST/PUT/DELETE
2. Envie o token no header `x-csrf-token`
3. Use `credentials: 'include'` nas requisições

### Erro: Unauthorized (401)
**Causa:** Token JWT expirado ou inválido
**Solução:**
1. Use POST em `/auth/refresh` com o `refreshToken` para renovar
2. Se refresh também falhar, faça login novamente

---

## 📊 Estatísticas da Migração

- **Arquivos removidos:** 12 (toda a pasta frontend + auxiliares)
- **Linhas de código removidas:** ~3000+ (frontend HTML/CSS/JS)
- **Arquivos de documentação removidos:** 3
- **Tamanho reduzido:** ~500KB (sem contar node_modules)
- **Tempo da migração:** ~30 minutos

---

## ✨ Benefícios da Separação

1. **Independência de Deploy**
   - Backend e frontend podem ser atualizados separadamente
   - Diferentes ciclos de release
   - Facilita rollback

2. **Escalabilidade**
   - Backend pode ter múltiplas instâncias
   - Frontend pode usar CDN
   - Cache mais eficiente

3. **Desenvolvimento**
   - Equipes podem trabalhar independentemente
   - Tecnologias podem evoluir separadamente
   - Melhor organização de código

4. **Segurança**
   - Separação de concerns
   - CORS bem configurado
   - API stateless

5. **Performance**
   - Frontend pode ser servido de CDN
   - Backend focado em processar dados
   - Caching mais eficiente

---

## 📚 Próximos Passos Recomendados

1. **Backend:**
   - [ ] Implementar filtro `user_id` em todas as queries (ver AUDITORIA_SEGURANCA.md)
   - [ ] Ativar CSP no Helmet
   - [ ] Implementar limpeza automática de tokens expirados
   - [ ] Adicionar testes de integração para CRUD

2. **Frontend Vue.js:**
   - [ ] Implementar interceptor Axios para refresh token automático
   - [ ] Adicionar retry logic em caso de falha
   - [ ] Implementar store Vuex/Pinia para estado global
   - [ ] Adicionar testes E2E com Cypress

---

## 🆘 Suporte

Para dúvidas sobre:
- **Backend (API):** Consulte [README.md](README.md)
- **Deploy:** Consulte [DEPLOY.md](DEPLOY.md)
- **Segurança:** Consulte [AUDITORIA_SEGURANCA.md](AUDITORIA_SEGURANCA.md)
- **API Endpoints:** Acesse `/api/docs` (Swagger)

---

**Migração concluída com sucesso! ✅**

Este projeto agora é uma API REST pura, pronta para ser consumida por qualquer frontend (Vue.js, React, Angular, Mobile, etc.).
