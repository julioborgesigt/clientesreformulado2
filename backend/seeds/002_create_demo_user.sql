-- Seed: 002 - Criar usuário demo para testes
-- Data: 2025-11-27
-- Descrição: Cria um usuário comum para testes

-- IMPORTANTE:
-- - Email: demo@sistema.com
-- - Senha: Demo@123456
-- - Recovery Code: TEST-TEST-TEST-TEST

-- Verificar se já existe
SET @demo_exists = (
  SELECT COUNT(*)
  FROM users
  WHERE email = 'demo@sistema.com'
);

-- Só insere se não existir
INSERT INTO users (name, email, password, role, recovery_code, first_login_completed)
SELECT
  'Usuário Demo',
  'demo@sistema.com',
  -- Senha: Demo@123456 (bcrypt hash com 12 rounds)
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKzQx.9m',
  'user',
  'TEST-TEST-TEST-TEST',
  FALSE
WHERE @demo_exists = 0;

-- Feedback
SELECT
  IF(@demo_exists = 0,
    'Usuário demo criado com sucesso!',
    'Usuário demo já existe.'
  ) AS message;
