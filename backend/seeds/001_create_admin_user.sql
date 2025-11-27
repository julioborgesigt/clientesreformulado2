-- Seed: 001 - Criar usuário administrador inicial
-- Data: 2025-11-27
-- Descrição: Cria um usuário admin para primeiro acesso ao sistema

-- IMPORTANTE:
-- - Email: admin@sistema.com
-- - Senha: Admin@123456 (MUDE APÓS PRIMEIRO LOGIN!)
-- - Recovery Code: DEMO-DEMO-DEMO-DEMO (para primeiro login)

-- Verificar se já existe um admin
SET @admin_exists = (
  SELECT COUNT(*)
  FROM users
  WHERE email = 'admin@sistema.com'
);

-- Só insere se não existir
INSERT INTO users (name, email, password, role, recovery_code, first_login_completed)
SELECT
  'Administrador',
  'admin@sistema.com',
  -- Senha: Admin@123456 (bcrypt hash com 12 rounds)
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyYIxKzQx.9m',
  'admin',
  'DEMO-DEMO-DEMO-DEMO',
  FALSE
WHERE @admin_exists = 0;

-- Feedback
SELECT
  IF(@admin_exists = 0,
    'Usuário admin criado com sucesso!',
    'Usuário admin já existe.'
  ) AS message;

-- Exibir informações de acesso (apenas em ambiente de desenvolvimento!)
SELECT
  '=====================================' AS '',
  'CREDENCIAIS DE ACESSO INICIAL' AS '',
  '=====================================' AS ' ',
  'Email: admin@sistema.com' AS '  ',
  'Senha: Admin@123456' AS '   ',
  'Recovery Code: DEMO-DEMO-DEMO-DEMO' AS '    ',
  '=====================================' AS '     ',
  'IMPORTANTE: Mude a senha após primeiro login!' AS '      ',
  '=====================================' AS '       '
WHERE @admin_exists = 0;
