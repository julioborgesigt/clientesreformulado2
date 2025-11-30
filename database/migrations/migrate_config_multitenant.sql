-- ========================================
-- Migration: Config Multi-tenant
-- Descrição: Migra tabela config de global para isolada por usuário
-- Data: 2025-11-30
-- Autor: Security Audit Team
-- ========================================

-- IMPORTANTE: Fazer backup do banco antes de executar!
-- mysqldump -u user -p database > backup_before_migration.sql

START TRANSACTION;

-- 1. Criar backup da tabela config
CREATE TABLE IF NOT EXISTS config_backup AS SELECT * FROM config;

-- 2. Adicionar coluna user_id à tabela config
ALTER TABLE config ADD COLUMN user_id INT NULL AFTER id;

-- 3. Criar configuração para cada usuário existente
-- Copia as mensagens globais para cada usuário
INSERT INTO config (whatsapp_message, whatsapp_message_vencido, user_id)
SELECT
  COALESCE((SELECT whatsapp_message FROM config_backup WHERE id = 1), 'Olá! Seu pagamento vence em breve.'),
  COALESCE((SELECT whatsapp_message_vencido FROM config_backup WHERE id = 1), 'Olá! Seu pagamento está vencido.'),
  u.id
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM config c WHERE c.user_id = u.id
);

-- 4. Remover config global antiga (sem user_id)
DELETE FROM config WHERE user_id IS NULL;

-- 5. Tornar user_id obrigatório
ALTER TABLE config MODIFY COLUMN user_id INT NOT NULL;

-- 6. Remover ID auto increment e usar user_id como PK
ALTER TABLE config DROP PRIMARY KEY;
ALTER TABLE config DROP COLUMN id;
ALTER TABLE config ADD PRIMARY KEY (user_id);

-- 7. Adicionar foreign key com CASCADE
ALTER TABLE config ADD CONSTRAINT fk_config_user
  FOREIGN KEY (user_id) REFERENCES users(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- 8. Adicionar índice para performance
ALTER TABLE config ADD INDEX idx_config_user (user_id);

COMMIT;

-- Verificação pós-migration
SELECT
  'Total de usuários' as metric,
  COUNT(*) as count
FROM users

UNION ALL

SELECT
  'Total de configs criadas' as metric,
  COUNT(*) as count
FROM config

UNION ALL

SELECT
  'Usuários sem config' as metric,
  COUNT(*) as count
FROM users u
LEFT JOIN config c ON u.id = c.user_id
WHERE c.user_id IS NULL;

-- Para reverter (rollback):
-- DROP TABLE config;
-- CREATE TABLE config AS SELECT * FROM config_backup;
-- DROP TABLE config_backup;
