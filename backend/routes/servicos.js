// backend/routes/servicos.js
const express = require('express');
const db = require('../db/connection');
const router = express.Router();

// Rota para BUSCAR todos os serviços
router.get('/', (req, res) => {
    db.query('SELECT id, nome FROM servicos ORDER BY nome ASC', (err, results) => {
        if (err) {
            console.error('Erro ao buscar serviços:', err);
            return res.status(500).json({ error: 'Erro ao buscar serviços.' });
        }
        res.status(200).json(results); // Envia a lista de serviços
    });
});

// Rota para ADICIONAR um novo serviço
router.post('/', (req, res) => {
    const { nome } = req.body;

    if (!nome || nome.trim() === '') {
        return res.status(400).json({ error: 'O nome do serviço não pode estar vazio.' });
    }

    db.query('INSERT INTO servicos (nome) VALUES (?)', [nome.trim()], (err, results) => {
        // Trata erro de nome duplicado (UNIQUE constraint)
        if (err && err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Este serviço já existe.' });
        }
        if (err) {
            console.error('Erro ao adicionar serviço:', err);
            return res.status(500).json({ error: 'Erro ao adicionar serviço.' });
        }
        // Retorna o ID do serviço recém-criado
        res.status(201).json({ message: 'Serviço adicionado com sucesso!', id: results.insertId, nome: nome.trim() });
    });
});

// --- NOVA ROTA DELETE ---
router.delete('/:id', (req, res) => {
    const serviceId = req.params.id;

    if (!serviceId || isNaN(parseInt(serviceId))) {
        return res.status(400).json({ error: 'ID do serviço inválido.' });
    }

    // Opcional: Verificar se o serviço está sendo usado por algum cliente antes de deletar?
    // Se sim, você adicionaria uma query SELECT aqui para verificar na tabela 'clientes'.
    // Se estiver em uso, retorne um erro (ex: 409 Conflict) impedindo a exclusão.
    // Ex: db.query('SELECT COUNT(*) as count FROM clientes WHERE servico = (SELECT nome FROM servicos WHERE id = ?)', [serviceId], (err, results) => { ... });

    db.query('DELETE FROM servicos WHERE id = ?', [serviceId], (err, result) => {
        if (err) {
            console.error('Erro ao excluir serviço:', err);
            return res.status(500).json({ error: 'Erro ao excluir serviço.' });
        }
        // Verifica se alguma linha foi afetada (se o ID existia)
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: 'Serviço não encontrado.' });
        }
        res.status(200).json({ message: 'Serviço excluído com sucesso!' });
    });
});

module.exports = router;