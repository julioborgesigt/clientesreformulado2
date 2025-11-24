-- Migration: Adiciona hashing de refresh tokens
-- Data: 2025-11-23
-- Descrição: Armazena hash SHA-256 dos tokens ao invés de plaintext
--            para prevenir exposição de tokens em caso de vazamento do banco

-- 1. Adicionar coluna token_hash
ALTER TABLE refresh_tokens
ADD COLUMN token_hash VARCHAR(64) NULL
COMMENT 'Hash SHA-256 do refresh token para armazenamento seguro';

-- 2. Criar índice no token_hash para performance
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens(token_hash);

-- 3. Adicionar índice composto para queries de verificação
CREATE INDEX idx_refresh_tokens_hash_user ON refresh_tokens(token_hash, user_id);

-- Nota: A coluna 'token' antiga será mantida temporariamente para compatibilidade
-- Tokens existentes continuarão funcionando até expirarem (7 dias)
-- Novos tokens usarão apenas token_hash
-- Em uma migração futura (após 7 dias), a coluna 'token' pode ser removida
