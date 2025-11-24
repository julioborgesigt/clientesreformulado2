-- Migration: Adiciona índices para melhorar performance
-- Data: 2025-11-23
-- Descrição: Cria índices em colunas frequentemente consultadas
--            para otimizar queries comuns

-- ========================================
-- ÍNDICES NA TABELA CLIENTES
-- ========================================

-- Índice para filtros de status
CREATE INDEX IF NOT EXISTS idx_clientes_status ON clientes(status);

-- Índice para filtros de vencimento (usado em alerts, vencidos, etc)
CREATE INDEX IF NOT EXISTS idx_clientes_vencimento ON clientes(vencimento);

-- Índice composto para queries comuns (user_id + arquivado)
-- Usado na rota /list principal
CREATE INDEX IF NOT EXISTS idx_clientes_user_arquivado ON clientes(user_id, arquivado);

-- Índice composto para busca por nome + user_id
-- Usado em queries de search
CREATE INDEX IF NOT EXISTS idx_clientes_name_user ON clientes(name, user_id);

-- Índice composto para queries de vencimento por usuário
-- Usado em /alerts, /pending-this-month, stats
CREATE INDEX IF NOT EXISTS idx_clientes_user_vencimento ON clientes(user_id, vencimento);

-- Índice composto para queries de status por usuário
CREATE INDEX IF NOT EXISTS idx_clientes_user_status ON clientes(user_id, status);

-- ========================================
-- ÍNDICES NA TABELA ACTION_LOG
-- ========================================

-- Índice para filtrar logs por usuário (usado em /actions/recent)
CREATE INDEX IF NOT EXISTS idx_action_log_user ON action_log(user_id);

-- Índice composto para queries ordenadas por data
CREATE INDEX IF NOT EXISTS idx_action_log_user_date ON action_log(user_id, timestamp DESC);

-- Índice para buscar por client_id (usado em queries de histórico)
CREATE INDEX IF NOT EXISTS idx_action_log_client ON action_log(client_id);

-- Índice para filtrar por tipo de ação
CREATE INDEX IF NOT EXISTS idx_action_log_action_type ON action_log(action_type);

-- ========================================
-- ÍNDICES NA TABELA SERVICOS
-- ========================================

-- Índice para ordenação por nome
CREATE INDEX IF NOT EXISTS idx_servicos_nome ON servicos(nome);

-- Nota: user_id já tem índice criado em add_user_id_columns.sql

-- ========================================
-- ÍNDICES NA TABELA REFRESH_TOKENS
-- ========================================

-- Índice para queries de expiração (cleanup periódico)
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires ON refresh_tokens(expires_at);

-- Índice composto para queries de tokens revogados
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked_expires ON refresh_tokens(revoked, expires_at);

-- Nota: token_hash já tem índice criado em hash_refresh_tokens.sql

-- ========================================
-- ANÁLISE DE TABELAS PARA OTIMIZAÇÃO
-- ========================================

-- Analisa as tabelas para atualizar estatísticas do otimizador
ANALYZE TABLE clientes;
ANALYZE TABLE action_log;
ANALYZE TABLE servicos;
ANALYZE TABLE refresh_tokens;
ANALYZE TABLE users;
