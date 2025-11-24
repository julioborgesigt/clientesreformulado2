-- Migration: Adiciona constraints e índices faltando
-- Data: 2025-11-23
-- Descrição: Adiciona Foreign Keys para integridade referencial
--            e índices faltando para melhor performance

-- ========================================
-- ÍNDICE: servicos.user_id
-- ========================================

-- Adiciona índice em servicos.user_id (usado em queries com WHERE)
CREATE INDEX IF NOT EXISTS idx_servicos_user_id ON servicos(user_id);

-- ========================================
-- FOREIGN KEYS: Integridade Referencial
-- ========================================

-- 🔒 SEGURANÇA: Foreign Key em action_log.user_id
-- Garante que todo log está associado a um usuário válido
-- ON DELETE CASCADE: Remove logs quando usuário é deletado
ALTER TABLE action_log
ADD CONSTRAINT fk_action_log_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 🔒 SEGURANÇA: Foreign Key em clientes.user_id
-- Garante que todo cliente pertence a um usuário válido
-- ON DELETE CASCADE: Remove clientes quando usuário é deletado
ALTER TABLE clientes
ADD CONSTRAINT fk_clientes_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- 🔒 SEGURANÇA: Foreign Key em servicos.user_id
-- Garante que todo serviço pertence a um usuário válido
-- ON DELETE CASCADE: Remove serviços quando usuário é deletado
ALTER TABLE servicos
ADD CONSTRAINT fk_servicos_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ========================================
-- NOTA SOBRE refresh_tokens.user_id
-- ========================================
-- A FK refresh_tokens.user_id -> users.id já existe (refresh_tokens_ibfk_1)
-- Criada na migration create_refresh_tokens.sql

-- ========================================
-- NOTA SOBRE action_log.client_id
-- ========================================
-- A FK action_log.client_id -> clientes.id já existe (fk_log_cliente)
-- Não é necessário criar novamente

-- ========================================
-- NOTA SOBRE clientes.servico
-- ========================================
-- A FK clientes.servico -> servicos.nome já existe (fk_cliente_servico_nome)
-- Não é necessário criar novamente

-- ========================================
-- RESUMO
-- ========================================
-- Adicionado:
--   ✓ 1 índice (servicos.user_id)
--   ✓ 3 foreign keys (action_log, clientes, servicos)
--
-- Benefícios:
--   🔒 Integridade referencial garantida
--   🔒 Previne dados órfãos
--   🔒 Cascata de deleção automática
--   ⚡ Melhora performance em queries por user_id
