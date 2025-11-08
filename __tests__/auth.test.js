// __tests__/auth.test.js
const request = require('supertest');
const app = require('../backend/app');

describe('Auth Routes', () => {
  describe('POST /auth/register', () => {
    it('deve rejeitar registro sem dados', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('deve rejeitar email inválido', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Teste User',
          email: 'email-invalido',
          password: 'Senha123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Dados inválidos');
    });

    it('deve rejeitar senha fraca', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Teste User',
          email: 'teste@exemplo.com',
          password: '123456' // Sem maiúsculas
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Dados inválidos');
    });

    it('deve rejeitar nome com números', async () => {
      const res = await request(app)
        .post('/auth/register')
        .send({
          name: 'Teste123',
          email: 'teste@exemplo.com',
          password: 'Senha123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Dados inválidos');
    });
  });

  describe('POST /auth/login', () => {
    it('deve rejeitar login sem dados', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({});

      expect(res.statusCode).toBe(400);
      expect(res.body).toHaveProperty('error');
    });

    it('deve rejeitar email inválido', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'email-invalido',
          password: 'senha123'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.error).toBe('Dados inválidos');
    });

    it('deve rejeitar credenciais incorretas', async () => {
      const res = await request(app)
        .post('/auth/login')
        .send({
          email: 'naoexiste@exemplo.com',
          password: 'SenhaErrada123'
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.error).toBe('Credenciais inválidas.');
    });
  });
});
