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

// (Opcional: Adicionar rotas DELETE /:id e PUT /:id no futuro, se necessário)

module.exports = router;