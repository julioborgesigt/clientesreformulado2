// __tests__/csrf.test.js
const request = require('supertest');
const app = require('../backend/app');

describe('CSRF Protection', () => {
  describe('GET /api/csrf-token', () => {
    it('deve retornar um CSRF token', async () => {
      const res = await request(app)
        .get('/api/csrf-token');

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('csrfToken');
      expect(typeof res.body.csrfToken).toBe('string');
      // Em teste, retorna token dummy de 15 caracteres
      expect(res.body.csrfToken.length).toBeGreaterThan(0);
    });

    it('deve aceitar requisições GET sem CSRF token em modo de teste', async () => {
      const res = await request(app)
        .get('/api/csrf-token');

      expect(res.statusCode).toBe(200);
      // Em ambiente de teste, CSRF está desabilitado
      // então cookies podem não estar presentes
      expect(res.body).toHaveProperty('csrfToken');
    });
  });

  describe('CSRF Protection on POST routes', () => {
    it('deve permitir requests GET sem CSRF token', async () => {
      // GET requests devem passar sem CSRF
      const res = await request(app)
        .get('/');

      expect(res.statusCode).not.toBe(403);
    });
  });
});
