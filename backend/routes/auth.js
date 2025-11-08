// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
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

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra um novo usuário
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - email
 *               - password
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 2
 *                 maxLength: 100
 *                 example: João Silva
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *               password:
 *                 type: string
 *                 minLength: 6
 *                 pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)
 *                 example: Senha123
 *                 description: Deve conter letras maiúsculas, minúsculas e números
 *     responses:
 *       201:
 *         description: Usuário registrado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuário registrado com sucesso!
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       409:
 *         description: Email já cadastrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/register', [
    // Validações
    body('name')
        .trim()
        .isLength({ min: 2, max: 100 })
        .withMessage('Nome deve ter entre 2 e 100 caracteres')
        .matches(/^[a-zA-ZÀ-ÿ\s]+$/)
        .withMessage('Nome deve conter apenas letras'),
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Senha deve ter no mínimo 6 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('Senha deve conter letras maiúsculas, minúsculas e números')
], async (req, res) => {
    // Verifica erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }

    const { name, email, password } = req.body;

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
                logger.warn(`Tentativa de registro duplicado para: ${email}`);
                // Retorna 409 Conflict - informa o usuário
                return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
            } else {
                // Se for outro erro do banco, registra e retorna 500
                logger.error('Erro no banco de dados ao registrar usuário:', dbErr);
                return res.status(500).json({ error: 'Erro interno ao salvar usuário.' });
            }
        }
    } catch (err) {
        // 4. Captura erros gerais (ex: falha no bcrypt.hash)
        logger.error('Erro geral ao registrar usuário:', err);
        res.status(500).json({ error: 'Erro interno ao processar registro.' });
    }
});

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Faz login e retorna token JWT
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *               password:
 *                 type: string
 *                 example: Senha123
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Login bem-sucedido!
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *       400:
 *         description: Dados inválidos
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Credenciais inválidas
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       429:
 *         description: Muitas tentativas de login
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Muitas tentativas de login. Tente novamente após 15 minutos.
 */
router.post('/login', [
    authLimiter,
    // Validações
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Senha é obrigatória')
], async (req, res) => {
    // Verifica erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }

    const { email, password } = req.body;

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
            logger.error('Erro ao comparar senhas:', compareErr);
            res.status(500).json({ error: 'Erro interno durante o login.' });
        }

    } catch (err) {
        // Captura erro na busca do usuário no banco
        logger.error('Erro no banco de dados durante o login:', err);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

module.exports = router;