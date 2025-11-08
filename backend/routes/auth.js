// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
// Importa a conexão (que já tem .promise() ativado em connection.js)
const db = require('../db/connection');

const router = express.Router();

// Rate limiter específico para autenticação - mais restritivo
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo de 5 tentativas de login por IP a cada 15 minutos
  message: 'Muitas tentativas de login. Tente novamente após 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Não conta requisições bem-sucedidas
});

// --- Rota de Cadastro (Corrigida com async/await e try...catch) ---
router.post('/register', async (req, res) => { 
    const { name, email, password } = req.body;

    // Validação básica
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    try {
        // 1. Hash da senha (dentro do try externo)
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Tenta inserir no banco (try interno para erro específico)
        try {
            // Usa 'await' com a query do banco de dados
            await db.query( 
                'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
                [name, email, hashedPassword]
            );
            // Se chegou aqui, a inserção foi bem-sucedida
            res.status(201).json({ message: 'Usuário registrado com sucesso!' });

        } catch (dbErr) {
            // 3. Captura ERROS DO BANCO DE DADOS
            // Verifica especificamente o erro de entrada duplicada
            if (dbErr.code === 'ER_DUP_ENTRY') {
                console.warn(`Tentativa de registro duplicado para: ${email}`); 
                // Retorna 409 Conflict - informa o usuário
                return res.status(409).json({ error: 'Este e-mail já está cadastrado.' }); 
            } else {
                // Se for outro erro do banco, registra e retorna 500
                console.error('Erro no banco de dados ao registrar usuário:', dbErr);
                return res.status(500).json({ error: 'Erro interno ao salvar usuário.' });
            }
        }
    } catch (err) {
        // 4. Captura erros gerais (ex: falha no bcrypt.hash)
        console.error('Erro geral ao registrar usuário:', err);
        res.status(500).json({ error: 'Erro interno ao processar registro.' });
    }
});

// --- Rota de Login (Corrigida com async/await e try...catch) ---
router.post('/login', authLimiter, async (req, res) => { // Rate limiter aplicado
    const { email, password } = req.body;

     // Validação básica
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios.' });
    }

    try {
        // 1. Busca o usuário no banco
        const [results] = await db.query( // <-- Adicionado await e desestruturação [results]
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        // 2. Verifica se o usuário existe
        if (results.length === 0) {
            // Usar 401 Unauthorized para ambos (não encontrado ou senha errada)
            // Evita dar dicas a atacantes se um email existe ou não.
            return res.status(401).json({ error: 'Credenciais inválidas.' }); 
        }
        const user = results[0];

        // 3. Compara a senha (dentro de try...catch)
        try {
            const match = await bcrypt.compare(password, user.password);

            if (!match) {
                return res.status(401).json({ error: 'Credenciais inválidas.' });
            }

            // 4. Gera o token JWT
            const token = jwt.sign(
                { id: user.id }, 
                process.env.JWT_SECRET, 
                { expiresIn: '1h' } // Ou um tempo maior, ex: '8h', '1d'
            );

            // 5. Envia a resposta de sucesso
            res.status(200).json({ message: 'Login bem-sucedido!', token });

        } catch (compareErr) {
            // Captura erro na comparação da senha
            console.error('Erro ao comparar senhas:', compareErr);
            res.status(500).json({ error: 'Erro interno durante o login.' });
        }

    } catch (err) {
        // Captura erro na busca do usuário no banco
        console.error('Erro no banco de dados durante o login:', err);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

module.exports = router;