-- ===================================================================
-- RUN ALL MIGRATIONS
-- ===================================================================
-- Script principal para executar todas as migrations em ordem
-- Data: 2025-11-27
--
-- IMPORTANTE: Execute este arquivo para criar/atualizar todas as tabelas
-- ===================================================================

-- Habilitar modo de transação (rollback em caso de erro)
START TRANSACTION;

-- ===================================================================
-- MIGRATION 001: Criar tabela users
-- ===================================================================
SOURCE 001_create_users_table.sql;

-- ===================================================================
-- MIGRATION 002: Criar tabela refresh_tokens
-- ===================================================================
SOURCE 002_create_refresh_tokens_table.sql;

-- ===================================================================
-- MIGRATION 003: Alterar tabela clientes (se existir)
-- ===================================================================
SOURCE 003_alter_clientes_table.sql;

-- ===================================================================
-- MIGRATION 004: Criar tabela action_logs
-- ===================================================================
SOURCE 004_create_action_logs_table.sql;

-- ===================================================================
-- Commit das alterações
-- ===================================================================
COMMIT;

-- ===================================================================
-- Verificação final
-- ===================================================================
SELECT 'Migrations executadas com sucesso!' AS status;

SHOW TABLES;
