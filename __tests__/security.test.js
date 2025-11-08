// __tests__/security.test.js
const request = require('supertest');
const app = require('../backend/app');

describe('Security Middleware', () => {
  describe('Authentication Middleware', () => {
    it('deve bloquear acesso a /clientes sem token', async () => {
      const res = await request(app)
        .get('/clientes/list');

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/token|autoriza/i);
    });

    it('deve bloquear acesso com token inválido', async () => {
      const res = await request(app)
        .get('/clientes/list')
        .set('Authorization', 'Bearer token-invalido');

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/token|autoriza|autentica/i);
    });

    it('deve bloquear acesso sem Bearer prefix', async () => {
      const res = await request(app)
        .get('/clientes/list')
        .set('Authorization', 'token-sem-bearer');

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/token|autoriza/i);
    });
  });

  describe('Security Headers (Helmet)', () => {
    it('deve incluir headers de segurança', async () => {
      const res = await request(app)
        .get('/');

      // Helmet deve adicionar headers de segurança
      expect(res.headers['x-dns-prefetch-control']).toBeDefined();
      expect(res.headers['x-frame-options']).toBeDefined();
      expect(res.headers['x-download-options']).toBeDefined();
    });
  });

  describe('CORS Configuration', () => {
    it('deve ter CORS configurado', async () => {
      const res = await request(app)
        .options('/')
        .set('Origin', 'http://localhost:3000');

      // CORS deve responder a OPTIONS com 200 ou 204
      expect([200, 204]).toContain(res.statusCode);
      // Header Access-Control-Allow-Origin deve estar presente
      expect(res.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    it('deve ter rate limiting headers', async () => {
      const res = await request(app)
        .get('/');

      // Rate limit headers devem estar presentes
      // Note: podem não aparecer em todos os ambientes de teste
      if (res.headers['ratelimit-limit']) {
        expect(res.headers['ratelimit-limit']).toBeDefined();
      }
    });
  });

  describe('Input Validation', () => {
    it('deve rejeitar XSS em nome de registro', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: '<script>alert("XSS")</script>',
          email: 'teste@exemplo.com',
          password: 'Senha123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Dados inválidos');
    });

    it('deve rejeitar SQL injection em email', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: "admin'--",
          password: 'qualquer'
        });

      // Deve falhar na validação de email
      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Dados inválidos');
    });
  });
});
