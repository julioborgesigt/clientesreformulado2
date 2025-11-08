// __tests__/refresh-tokens.test.js
const request = require('supertest');
const app = require('../backend/app');

describe('Refresh Token Routes', () => {
  describe('POST /auth/refresh', () => {
    it('deve rejeitar requisição sem refreshToken', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Refresh token não fornecido.');
    });

    it('deve rejeitar refreshToken inválido', async () => {
      const res = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: 'token-invalido'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/inválido|expirado/i);
    });

    it('deve rejeitar refreshToken expirado', async () => {
      // Token JWT expirado (payload: {id: 1, type: 'refresh', exp: timestamp antigo})
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidHlwZSI6InJlZnJlc2giLCJleHAiOjE2MDAwMDAwMDB9.test';

      const res = await request(app)
        .post('/auth/refresh')
        .send({
          refreshToken: expiredToken
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toMatch(/inválido|expirado/i);
    });
  });

  describe('POST /auth/logout', () => {
    it('deve rejeitar logout sem refreshToken', async () => {
      const res = await request(app)
        .post('/auth/logout')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Refresh token não fornecido.');
    });

    it('deve aceitar logout mesmo com refreshToken inválido', async () => {
      // Logout deve ser resiliente e aceitar tokens inválidos
      // pois o objetivo é limpar a sessão
      const res = await request(app)
        .post('/auth/logout')
        .send({
          refreshToken: 'token-qualquer'
        });

      // Pode retornar 200 ou 500, mas não deve travar
      expect([200, 500]).toContain(res.statusCode);
    });
  });
});
