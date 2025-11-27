-- Migration: 004 - Criar tabela de logs de ações
-- Data: 2025-11-27
-- Descrição: Tabela para auditoria de ações dos usuários

CREATE TABLE IF NOT EXISTS action_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,

  -- Tipo de ação
  action_type VARCHAR(50) NOT NULL COMMENT 'Tipo de ação: CREATE_CLIENT, UPDATE_CLIENT, DELETE_CLIENT, LOGIN, etc.',

  -- Descrição da ação
  description TEXT NOT NULL,

  -- Metadados adicionais (JSON)
  metadata JSON NULL DEFAULT NULL COMMENT 'Dados adicionais em formato JSON',

  -- IP e User Agent
  ip_address VARCHAR(45) NULL DEFAULT NULL COMMENT 'Endereço IP do usuário',
  user_agent TEXT NULL DEFAULT NULL COMMENT 'User agent do navegador',

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Foreign key
  CONSTRAINT fk_action_logs_user_id
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

  -- Índices para performance
  INDEX idx_user_id (user_id),
  INDEX idx_action_type (action_type),
  INDEX idx_created_at (created_at),
  INDEX idx_user_action_date (user_id, action_type, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de logs de ações para auditoria';
