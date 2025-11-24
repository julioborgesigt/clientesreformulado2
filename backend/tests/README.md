# 🧪 Testes Automatizados

Este diretório contém todos os testes automatizados da aplicação.

## 📋 Índice

- [Como Executar](#como-executar)
- [Estrutura](#estrutura)
- [Cobertura](#cobertura)
- [Escrevendo Novos Testes](#escrevendo-novos-testes)

---

## 🚀 Como Executar

### Executar todos os testes:
```bash
npm test
```

### Executar testes em modo watch (desenvolvimento):
```bash
npm run test:watch
```

### Executar apenas um arquivo de teste:
```bash
npm test health.test.js
```

### Executar com cobertura detalhada:
```bash
npm test -- --coverage --verbose
```

---

## 📁 Estrutura

```
backend/tests/
├── health.test.js          # Testes de health check
├── validateEnv.test.js     # Testes de validação de env vars
└── README.md               # Este arquivo
```

---

## 📊 Testes Implementados

### ✅ Health Check (`health.test.js`)

Testa todos os endpoints de health check:

1. **GET /health** - Health check básico
2. **GET /health/detailed** - Health check detalhado com métricas
3. **GET /health/liveness** - Kubernetes liveness probe
4. **GET /health/readiness** - Kubernetes readiness probe

**Cobertura:**
- Status codes corretos (200, 503)
- Estrutura JSON de resposta
- Conexão com banco de dados
- Métricas de sistema (memória, uptime, etc)

### ✅ Validação de Ambiente (`validateEnv.test.js`)

Testa a validação de variáveis de ambiente:

1. **Variáveis obrigatórias** - Detecta ausência
2. **Secrets** - Valida comprimento mínimo (32 chars)
3. **NODE_ENV** - Valida valores permitidos
4. **FRONTEND_URL** - Valida formato de URL
5. **DB_CONNECTION_LIMIT** - Valida range numérico
6. **Valores padrão** - Aplica defaults para opcionais

**Cobertura:**
- Todas as 9 variáveis obrigatórias
- Validações específicas por tipo
- Aplicação de valores padrão

---

## 🎯 Cobertura de Código

Objetivo: **>80% de cobertura** em:
- Statements
- Branches
- Functions
- Lines

### Ver relatório de cobertura:
```bash
npm test
# Abre: coverage/lcov-report/index.html
```

---

## ✍️ Escrevendo Novos Testes

### Estrutura básica:

```javascript
// backend/tests/meuModulo.test.js
const request = require('supertest');
const path = require('path');

// Carrega env de teste
require('dotenv').config({ path: path.join(__dirname, '../../.env.test') });

const app = require('../app');

describe('Meu Módulo', () => {
    describe('Funcionalidade X', () => {
        it('deve fazer Y quando Z', async () => {
            const response = await request(app)
                .get('/endpoint')
                .expect(200);

            expect(response.body).toHaveProperty('campo');
        });
    });
});
```

### Boas práticas:

1. **Nomes descritivos:**
   - ✅ `deve retornar 401 quando token inválido`
   - ❌ `teste de auth`

2. **Arrange, Act, Assert:**
   ```javascript
   // Arrange - Preparar dados
   const userData = { email: 'test@test.com' };

   // Act - Executar ação
   const response = await request(app).post('/auth/login').send(userData);

   // Assert - Verificar resultado
   expect(response.status).toBe(200);
   ```

3. **Cleanup após testes:**
   ```javascript
   afterEach(async () => {
       // Limpar dados de teste
       await cleanupTestData();
   });
   ```

4. **Testar casos de sucesso E falha:**
   - ✅ Dados válidos (happy path)
   - ✅ Dados inválidos
   - ✅ Campos faltando
   - ✅ Permissões negadas

---

## 🔧 Configuração Jest

Configuração em `package.json`:

```json
{
  "jest": {
    "testEnvironment": "node",
    "coveragePathIgnorePatterns": ["/node_modules/"],
    "testTimeout": 10000
  }
}
```

---

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

## ✅ Checklist para Novos Testes

Ao adicionar nova funcionalidade, garanta:

- [ ] Teste de sucesso (happy path)
- [ ] Teste de falha (error cases)
- [ ] Teste de validação de input
- [ ] Teste de autorização (se aplicável)
- [ ] Teste de edge cases
- [ ] Cobertura > 80%
- [ ] Testes passando no CI/CD

---

## 🐛 Troubleshooting

### Testes falhando com timeout?
Aumente o timeout em `jest.config.js` ou no teste específico:
```javascript
jest.setTimeout(15000); // 15 segundos
```

### Conexão com banco falhando?
Verifique `.env.test` tem credenciais corretas.

### Testes não limpando dados?
Use hooks `beforeEach/afterEach` para cleanup.

---

**Status:** ✅ 2 suites de teste implementadas
**Próximos:** Testes de autenticação e CRUD de clientes
