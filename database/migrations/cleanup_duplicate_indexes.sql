-- Migration: Remove índices duplicados
-- Data: 2025-11-23
-- Descrição: Remove índices redundantes que duplicam funcionalidade
--            Mantém apenas os índices compostos mais úteis

-- ========================================
-- LIMPEZA: action_log
-- ========================================

-- client_id tem 2 índices: idx_client_id (antigo) e idx_action_log_client (novo)
-- MANTÉM: idx_action_log_client (nome mais descritivo)
-- REMOVE: idx_client_id
DROP INDEX IF EXISTS idx_client_id ON action_log;

-- ========================================
-- LIMPEZA: clientes
-- ========================================

-- vencimento tem 3 índices
-- MANTÉM: idx_clientes_user_vencimento (composto user_id+vencimento, mais útil)
-- REMOVE: idx_vencimento, idx_clientes_vencimento (simples, redundantes)
DROP INDEX IF EXISTS idx_vencimento ON clientes;
DROP INDEX IF EXISTS idx_clientes_vencimento ON clientes;

-- status tem 3 índices
-- MANTÉM: idx_clientes_user_status (composto user_id+status, mais útil)
-- REMOVE: idx_status, idx_clientes_status (simples, redundantes)
DROP INDEX IF EXISTS idx_status ON clientes;
DROP INDEX IF EXISTS idx_clientes_status ON clientes;

-- name tem 2 índices
-- MANTÉM: idx_clientes_name_user (composto name+user_id, mais útil)
-- REMOVE: idx_name (simples, redundante)
DROP INDEX IF EXISTS idx_name ON clientes;

-- arquivado tem 2 índices
-- MANTÉM: idx_clientes_user_arquivado (composto user_id+arquivado, mais útil)
-- REMOVE: idx_clientes_arquivado (simples, redundante)
DROP INDEX IF EXISTS idx_clientes_arquivado ON clientes;

-- deleted_at tem 2 índices
-- MANTÉM: idx_clientes_user_deleted (composto user_id+deleted_at, mais útil)
-- REMOVE: idx_clientes_deleted_at (simples, redundante)
DROP INDEX IF EXISTS idx_clientes_deleted_at ON clientes;

-- servico: idx_servico pode ser removido pois é coberto pela FK
DROP INDEX IF EXISTS idx_servico ON clientes;

-- ========================================
-- LIMPEZA: refresh_tokens
-- ========================================

-- token tem 2 índices: token (UNIQUE) e idx_token
-- MANTÉM: token (UNIQUE constraint, necessário)
-- REMOVE: idx_token (redundante com UNIQUE)
DROP INDEX IF EXISTS idx_token ON refresh_tokens;

-- expires_at tem 3 índices
-- MANTÉM: idx_refresh_tokens_revoked_expires (composto revoked+expires_at, mais útil para queries de limpeza)
-- REMOVE: idx_expires_at, idx_refresh_tokens_expires (simples, redundantes)
DROP INDEX IF EXISTS idx_expires_at ON refresh_tokens;
DROP INDEX IF EXISTS idx_refresh_tokens_expires ON refresh_tokens;

-- token_hash tem 2 índices
-- MANTÉM: idx_refresh_tokens_hash_user (composto token_hash+user_id, mais útil)
-- REMOVE: idx_refresh_tokens_hash (simples, redundante)
DROP INDEX IF EXISTS idx_refresh_tokens_hash ON refresh_tokens;

-- ========================================
-- LIMPEZA: servicos
-- ========================================

-- nome tem 2 índices: nome (UNIQUE) e idx_servicos_nome
-- MANTÉM: nome (UNIQUE constraint, necessário)
-- REMOVE: idx_servicos_nome (redundante com UNIQUE)
DROP INDEX IF EXISTS idx_servicos_nome ON servicos;

-- ========================================
-- RESUMO DA LIMPEZA
-- ========================================
-- Total de índices removidos: 15
-- Benefícios:
--   ✓ Redução de overhead em INSERT/UPDATE/DELETE
--   ✓ Economia de espaço em disco
--   ✓ Simplificação da estrutura do banco
--   ✓ Mantém todos os índices compostos mais úteis
