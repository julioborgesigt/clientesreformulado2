-- Migration: Adiciona soft delete para clientes
-- Data: 2025-11-23
-- Descrição: Adiciona coluna deleted_at para permitir soft delete
--            ao invés de deletar permanentemente os dados

-- Adicionar coluna deleted_at
ALTER TABLE clientes
ADD COLUMN deleted_at TIMESTAMP NULL DEFAULT NULL
COMMENT 'Data de exclusão do cliente (soft delete)';

-- Criar índice para performance em queries que filtram deleted_at
CREATE INDEX idx_clientes_deleted_at ON clientes(deleted_at);

-- Criar índice composto para queries comuns (user_id + deleted_at)
CREATE INDEX idx_clientes_user_deleted ON clientes(user_id, deleted_at);

-- Nota: Clientes com deleted_at IS NULL são ativos
-- Clientes com deleted_at IS NOT NULL são deletados (soft delete)
