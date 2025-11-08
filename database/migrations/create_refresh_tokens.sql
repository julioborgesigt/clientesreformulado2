-- Tabela para armazenar refresh tokens
-- Execução: mysql -u usuario -p nome_do_banco < create_refresh_tokens.sql

CREATE TABLE IF NOT EXISTS refresh_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    token VARCHAR(500) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    revoked BOOLEAN DEFAULT FALSE,
    replaced_by_token VARCHAR(500) DEFAULT NULL,

    -- Índices para melhor performance
    INDEX idx_user_id (user_id),
    INDEX idx_token (token),
    INDEX idx_expires_at (expires_at),

    -- Foreign key para users
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Adiciona comentário à tabela
ALTER TABLE refresh_tokens COMMENT = 'Armazena refresh tokens JWT para renovação automática';
