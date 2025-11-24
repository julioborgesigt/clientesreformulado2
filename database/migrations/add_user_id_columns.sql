-- Migration: Adiciona coluna user_id para isolamento de dados por usuário
-- Data: 2025-11-22
-- Descrição: Implementa controle de acesso baseado em user_id para prevenir
--            que usuários vejam/editem dados de outros usuários (Broken Access Control)

-- 1. Adicionar coluna user_id na tabela clientes
ALTER TABLE clientes
ADD COLUMN user_id INT NOT NULL DEFAULT 1 COMMENT 'ID do usuário proprietário do cliente';

-- 2. Adicionar coluna user_id na tabela servicos
ALTER TABLE servicos
ADD COLUMN user_id INT NOT NULL DEFAULT 1 COMMENT 'ID do usuário proprietário do serviço';

-- 3. Adicionar coluna user_id na tabela action_log
ALTER TABLE action_log
ADD COLUMN user_id INT NULL COMMENT 'ID do usuário que executou a ação';

-- 4. Criar foreign keys para garantir integridade referencial
ALTER TABLE clientes
ADD CONSTRAINT fk_clientes_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE servicos
ADD CONSTRAINT fk_servicos_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE action_log
ADD CONSTRAINT fk_action_log_user
FOREIGN KEY (user_id) REFERENCES users(id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 5. Criar índices para melhorar performance das queries com user_id
CREATE INDEX idx_clientes_user_id ON clientes(user_id);
CREATE INDEX idx_clientes_user_id_arquivado ON clientes(user_id, arquivado);
CREATE INDEX idx_clientes_user_id_status ON clientes(user_id, status);
CREATE INDEX idx_clientes_user_id_vencimento ON clientes(user_id, vencimento);

CREATE INDEX idx_servicos_user_id ON servicos(user_id);

CREATE INDEX idx_action_log_user_id ON action_log(user_id);
CREATE INDEX idx_action_log_client_id ON action_log(client_id);

-- 6. Atualizar registros existentes
-- IMPORTANTE: Em produção, você deve definir o user_id correto para cada registro
-- Por padrão, estamos atribuindo ao user_id = 1 (primeiro usuário)
-- Se você tiver múltiplos usuários, precisa atribuir corretamente

-- Exemplo: Se você souber que todos os clientes atuais pertencem ao user_id 1
UPDATE clientes SET user_id = 1 WHERE user_id = 1;
UPDATE servicos SET user_id = 1 WHERE user_id = 1;

-- 7. Verificar integridade
SELECT 'Clientes sem user válido' as verificacao, COUNT(*) as total
FROM clientes c
LEFT JOIN users u ON c.user_id = u.id
WHERE u.id IS NULL;

SELECT 'Serviços sem user válido' as verificacao, COUNT(*) as total
FROM servicos s
LEFT JOIN users u ON s.user_id = u.id
WHERE u.id IS NULL;

-- 8. Estatísticas após migration
SELECT
    'Migration concluída' as status,
    (SELECT COUNT(*) FROM clientes) as total_clientes,
    (SELECT COUNT(*) FROM servicos) as total_servicos,
    (SELECT COUNT(DISTINCT user_id) FROM clientes) as usuarios_com_clientes,
    (SELECT COUNT(DISTINCT user_id) FROM servicos) as usuarios_com_servicos;
