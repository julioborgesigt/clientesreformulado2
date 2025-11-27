-- Migration: 003 - Alterar tabela clientes (caso já exista)
-- Data: 2025-11-27
-- Descrição: Garante que a tabela clientes está compatível com o novo sistema

-- Verificar se a tabela existe e adicionar colunas se necessário
-- Esta migration é idempotente (pode ser executada múltiplas vezes)

-- Adicionar coluna deleted_at se não existir (soft delete)
ALTER TABLE clientes
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL DEFAULT NULL
COMMENT 'Data de exclusão lógica (soft delete)';

-- Adicionar índice para soft delete
ALTER TABLE clientes
ADD INDEX IF NOT EXISTS idx_deleted_at (deleted_at);

-- Adicionar índice composto para queries de listagem
ALTER TABLE clientes
ADD INDEX IF NOT EXISTS idx_user_arquivado_deleted (user_id, arquivado, deleted_at);

-- Adicionar índice para data de vencimento
ALTER TABLE clientes
ADD INDEX IF NOT EXISTS idx_vencimento (vencimento);

-- Adicionar índice para status
ALTER TABLE clientes
ADD INDEX IF NOT EXISTS idx_status (status);

-- Garantir que user_id tem foreign key (se ainda não tiver)
-- Note: Isso pode falhar se a constraint já existir, por isso usamos IGNORE
-- No MySQL 8.0+, você pode usar IF NOT EXISTS

SET @constraint_exists = (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = DATABASE()
    AND TABLE_NAME = 'clientes'
    AND CONSTRAINT_NAME = 'fk_clientes_user_id'
);

SET @sql = IF(
  @constraint_exists = 0,
  'ALTER TABLE clientes ADD CONSTRAINT fk_clientes_user_id FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE',
  'SELECT "Foreign key já existe" AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
