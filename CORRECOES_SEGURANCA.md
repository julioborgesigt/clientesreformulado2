# 🔒 Correções de Segurança Aplicadas

## Data: 22 de novembro de 2025

### Vulnerabilidade Corrigida: **Broken Access Control (OWASP A01:2021)**

**Severidade:** 🔴 CRÍTICO

**Problema:** Usuários autenticados podiam ver/editar/deletar dados de TODOS os outros usuários.

**Solução:** Adicionar filtro `user_id` em TODAS as queries do sistema.

---

## ✅ Correções Aplicadas em `backend/routes/clientes.js`

### 1. GET /list (Linha ~291)
- ✅ Adicionado `user_id = ?` no WHERE
- ✅ userId obtido de `req.userData.id`

### 2. POST /add (Linha ~22)
- ✅ Incluído `user_id` no INSERT
- ✅ userId passado como parâmetro

### 3. DELETE /delete/:id (Linha ~41)
- ✅ SELECT verifica `id = ? AND user_id = ?`
- ✅ DELETE verifica `id = ? AND user_id = ?`

### 4. PUT /update/:id (Linha ~60)
- ✅ SELECT verifica `id = ? AND user_id = ?`
- ✅ UPDATE verifica `id = ? AND user_id = ?`

### 5. updateClientStatusAndLog() (Linha ~89)
- ✅ SELECT verifica `id = ? AND user_id = ?`
- ✅ UPDATE verifica `id = ? AND user_id = ?`
- Afeta: /mark-pending, /mark-paid, /mark-in-day

### 6. GET /dashboard-stats (Linha ~353)
- ✅ WHERE filtra `user_id = ?`

---

## ⏳ Correções Pendentes (a fazer manualmente)

### Em `backend/routes/clientes.js`:

7. **PUT /adjust-date/:id** (Linha ~101-174)
   - [ ] 4 queries precisam de user_id

8. **PUT /archive/:id** (Linha ~177-200)
   - [ ] SELECT e UPDATE precisam de user_id

9. **PUT /unarchive/:id** (Linha ~215-245)
   - [ ] SELECT e UPDATE precisam de user_id

10. **GET /get-vencimento/:id** (Linha ~387)
    - [ ] SELECT precisa de user_id

11. **GET /alerts** (Linha ~479)
    - [ ] SELECT precisa de user_id

12. **GET /pagamentos/dias** (Linha ~413)
    - [ ] WHERE precisa de user_id

13. **GET /stats/by-service** (Linha ~433)
    - [ ] WHERE precisa de user_id

14. **GET /actions/recent** (Linha ~455)
    - [ ] LEFT JOIN precisa verificar user_id

15. **POST /actions/:logId/revert** (Linha ~496)
    - [ ] Múltiplas queries precisam verificar user_id

16. **GET /pending-this-month** (Linha ~632)
    - [ ] WHERE precisa de user_id

---

## 🔧 Em `backend/routes/servicos.js`

Todas as rotas precisam do mesmo tratamento:
- [ ] GET /list
- [ ] POST /add
- [ ] PUT /update/:id
- [ ] DELETE /delete/:id

---

## 📝 Template de Correção

### Para SELECTs:
```javascript
// ❌ ANTES
const [results] = await db.query('SELECT * FROM clientes WHERE id = ?', [id]);

// ✅ DEPOIS
const userId = req.userData.id;
const [results] = await db.query('SELECT * FROM clientes WHERE id = ? AND user_id = ?', [id, userId]);
```

### Para INSERTs:
```javascript
// ❌ ANTES
await db.query(
  'INSERT INTO clientes (name, vencimento) VALUES (?, ?)',
  [name, vencimento]
);

// ✅ DEPOIS
const userId = req.userData.id;
await db.query(
  'INSERT INTO clientes (name, vencimento, user_id) VALUES (?, ?, ?)',
  [name, vencimento, userId]
);
```

### Para UPDATEs:
```javascript
// ❌ ANTES
await db.query('UPDATE clientes SET status = ? WHERE id = ?', [status, id]);

// ✅ DEPOIS
const userId = req.userData.id;
await db.query('UPDATE clientes SET status = ? WHERE id = ? AND user_id = ?', [status, id, userId]);
```

### Para DELETEs:
```javascript
// ❌ ANTES
await db.query('DELETE FROM clientes WHERE id = ?', [id]);

// ✅ DEPOIS
const userId = req.userData.id;
await db.query('DELETE FROM clientes WHERE id = ? AND user_id = ?', [id, userId]);
```

---

## 🧪 Como Testar

### 1. Criar Migration
```bash
mysql -u usuario -p < database/migrations/add_user_id_columns.sql
```

### 2. Verificar Tabelas
```sql
DESCRIBE clientes;
-- Deve mostrar coluna user_id
```

### 3. Teste de Isolamento
```bash
# 1. Criar usuário A e adicionar cliente
POST /auth/register { email: "userA@test.com", password: "Pass123!" }
POST /auth/login { email: "userA@test.com", password: "Pass123!" }
# Salvar accessToken de A

POST /clientes/add { name: "Cliente do A", ... }
# Headers: Authorization: Bearer <token_de_A>

# 2. Criar usuário B
POST /auth/register { email: "userB@test.com", password: "Pass123!" }
POST /auth/login { email: "userB@test.com", password: "Pass123!" }
# Salvar accessToken de B

# 3. Tentar listar com token de B
GET /clientes/list
# Headers: Authorization: Bearer <token_de_B>

# RESULTADO ESPERADO: Lista vazia (userB não vê clientes de userA)
```

---

## 📊 Status das Correções

| Arquivo | Rotas Corrigidas | Rotas Pendentes | % Completo |
|---------|------------------|-----------------|-----------|
| `clientes.js` | 6/16 | 10 | 37% |
| `servicos.js` | 0/4 | 4 | 0% |
| **TOTAL** | **6/20** | **14** | **30%** |

---

## 🎯 Próximos Passos

1. ✅ Migration criada
2. ✅ 6 rotas críticas corrigidas
3. ⏳ Corrigir 10 rotas restantes de clientes.js
4. ⏳ Corrigir 4 rotas de servicos.js
5. ⏳ Testar isolamento de dados
6. ⏳ Atualizar testes automatizados

---

## ⚠️ Importante

**Não esquecer de:**
- Executar a migration no banco de produção
- Atribuir `user_id` correto para registros existentes
- Avisar usuários sobre mudanças (se houver múltiplos usuários)
- Validar que todos os clientes existentes têm `user_id` válido
