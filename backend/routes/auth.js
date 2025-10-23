const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/connection');

const router = express.Router();

// Rota de cadastro
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        [name, email, hashedPassword],
        (err) => {
            if (err) {
                // Adiciona verificação de e-mail duplicado
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
                }
                return res.status(500).json({ error: 'Erro ao registrar usuário' });
            }
            res.status(201).json({ message: 'Usuário registrado com sucesso!' });
        }
    );
});

// Rota de login
router.post('/login', (req, res) => {
    const { email, password } = req.body;

    db.query(
        'SELECT * FROM users WHERE email = ?',
        [email],
        async (err, results) => {
            if (err) return res.status(500).json({ error: 'Erro no servidor' });

            if (results.length === 0) {
                return res.status(404).json({ error: 'Usuário não encontrado' });
            }

            const user = results[0];
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.status(401).json({ error: 'Senha inválida' });
            }

            const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, {
                expiresIn: '1h',
            });

            res.status(200).json({ message: 'Login bem-sucedido!', token });
        }
    );
});

// *** CORREÇÃO: Rota /alerts duplicada foi removida daqui ***

module.exports = router;