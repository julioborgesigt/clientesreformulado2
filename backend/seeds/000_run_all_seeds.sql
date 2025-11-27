-- ===================================================================
-- RUN ALL SEEDS
-- ===================================================================
-- Script principal para executar todos os seeds em ordem
-- Data: 2025-11-27
--
-- IMPORTANTE: Execute após as migrations para popular dados iniciais
-- ===================================================================

-- ===================================================================
-- SEED 001: Criar usuário administrador
-- ===================================================================
SOURCE 001_create_admin_user.sql;

-- ===================================================================
-- SEED 002: Criar usuário demo
-- ===================================================================
SOURCE 002_create_demo_user.sql;

-- ===================================================================
-- Verificação final
-- ===================================================================
SELECT 'Seeds executados com sucesso!' AS status;

SELECT
  id,
  name,
  email,
  role,
  recovery_code,
  first_login_completed,
  created_at
FROM users
ORDER BY id;
