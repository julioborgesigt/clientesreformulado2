-- Migration: 001 - Criar tabela de usuários
-- Data: 2025-11-27
-- Descrição: Tabela para armazenar usuários do sistema

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL COMMENT 'Senha hasheada com bcrypt',
  role VARCHAR(50) DEFAULT 'user' COMMENT 'Roles: user, admin',

  -- Recovery code para primeiro login e reset de senha
  recovery_code VARCHAR(19) NOT NULL COMMENT 'Formato: XXXX-XXXX-XXXX-XXXX',
  recovery_code_created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Flag de primeiro login
  first_login_completed BOOLEAN DEFAULT FALSE,

  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- Índices para performance
  INDEX idx_email (email),
  INDEX idx_role (role),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Tabela de usuários do sistema';
