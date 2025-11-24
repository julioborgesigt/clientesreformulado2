-- Migration: Adicionar sistema de código de recuperação
-- Data: 2025-11-24
-- Descrição: Adiciona campos para recovery code e primeiro login

-- Adicionar campos para recovery code na tabela users
ALTER TABLE users
ADD COLUMN recovery_code VARCHAR(255) NULL COMMENT 'Hash bcrypt do código de recuperação',
ADD COLUMN first_login_completed BOOLEAN DEFAULT FALSE COMMENT 'Se o usuário completou o primeiro login com código',
ADD COLUMN recovery_code_created_at DATETIME NULL COMMENT 'Data de criação do código de recuperação';

-- Índice para busca por recovery_code (mesmo sendo hash, ajuda na performance)
CREATE INDEX idx_users_recovery_code ON users(recovery_code);

-- Índice para first_login_completed (para consultas de usuários pendentes)
CREATE INDEX idx_users_first_login ON users(first_login_completed);

-- Comentário na tabela
ALTER TABLE users COMMENT = 'Tabela de usuários com sistema de autenticação e recovery code';
