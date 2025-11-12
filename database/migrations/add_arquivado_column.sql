-- Migration: Adiciona campo arquivado à tabela clientes
-- Autor: Sistema
-- Data: 2025-11-09

-- Adicionar coluna arquivado
ALTER TABLE clientes
ADD COLUMN arquivado BOOLEAN DEFAULT FALSE NOT NULL
COMMENT 'Indica se o cliente está arquivado (soft delete)';

-- Criar índice para otimizar consultas
CREATE INDEX idx_clientes_arquivado ON clientes(arquivado);

-- Garantir que todos os registros existentes sejam marcados como não arquivados
UPDATE clientes SET arquivado = FALSE WHERE arquivado IS NULL;

-- Adicionar índice composto para otimizar consultas com user_id e arquivado
CREATE INDEX idx_clientes_user_arquivado ON clientes(user_id, arquivado);
