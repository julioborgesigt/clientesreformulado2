// backend/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const authMiddleware = require('../middleware/authMiddleware');
const {
    generateRecoveryCode,
    hashRecoveryCode,
    verifyRecoveryCode,
    isValidRecoveryCodeFormat
} = require('../utils/recoveryCode');
const {
    generateAccessToken,
    generateRefreshToken,
    saveRefreshToken,
    verifyRefreshToken,
    revokeRefreshToken,
    revokeAllUserTokens
} = require('../utils/tokens');
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
 *                 minLength: 12
 *                 pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])
 *                 example: SenhaSegura123!
 *                 description: Deve ter 12+ caracteres com maiúsculas, minúsculas, números e caracteres especiais
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
        .isLength({ min: 12 })
        .withMessage('Senha deve ter no mínimo 12 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais (@$!%*?&)')
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
        // 1. Hash da senha
        const hashedPassword = await bcrypt.hash(password, 10);

        // 2. Gera código de recuperação único
        const recoveryCode = generateRecoveryCode(); // Ex: A1B2-C3D4-E5F6-G7H8
        const hashedRecoveryCode = await hashRecoveryCode(recoveryCode);

        // 3. Tenta inserir no banco
        try {
            await db.query(
                'INSERT INTO users (name, email, password, recovery_code, recovery_code_created_at, first_login_completed) VALUES (?, ?, ?, ?, NOW(), FALSE)',
                [name, email, hashedPassword, hashedRecoveryCode]
            );

            logger.info(`Novo usuário registrado: ${email}`);

            // 4. IMPORTANTE: Retorna o recovery code EM TEXTO PLANO (única vez!)
            res.status(201).json({
                message: 'Usuário registrado com sucesso!',
                recoveryCode: recoveryCode,
                warning: {
                    title: '⚠️ IMPORTANTE: Guarde este código em local seguro!',
                    message: 'Este código de recuperação será solicitado no primeiro login e para resetar sua senha. Ele NÃO será mostrado novamente!',
                    code: recoveryCode,
                    instructions: [
                        '1. Anote este código em um local seguro',
                        '2. NÃO compartilhe com ninguém',
                        '3. Você precisará dele no primeiro login',
                        '4. Este código é necessário para recuperar sua conta'
                    ]
                }
            });

        } catch (dbErr) {
            // 5. Captura ERROS DO BANCO DE DADOS
            if (dbErr.code === 'ER_DUP_ENTRY') {
                logger.warn(`Tentativa de registro duplicado para: ${email}`);
                return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
            } else {
                logger.error('Erro no banco de dados ao registrar usuário:', dbErr);
                return res.status(500).json({ error: 'Erro interno ao salvar usuário.' });
            }
        }
    } catch (err) {
        // 6. Captura erros gerais
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
 *                 accessToken:
 *                   type: string
 *                   description: Token de acesso JWT (15 minutos)
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 refreshToken:
 *                   type: string
 *                   description: Token de renovação JWT (7 dias)
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 expiresIn:
 *                   type: number
 *                   description: Tempo de expiração do access token em segundos
 *                   example: 900
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
    logger.info('[LOGIN] Requisição de login recebida');
    logger.info(`[LOGIN] Headers:`, {
        'x-csrf-token': req.headers['x-csrf-token'],
        'authorization': req.headers['authorization'] ? 'presente' : 'ausente',
        'origin': req.headers.origin,
        'content-type': req.headers['content-type']
    });

    // Verifica erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        logger.warn('[LOGIN] Validação falhou:', errors.array());
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }

    const { email, password } = req.body;
    logger.info(`[LOGIN] Tentativa de login para: ${email}`);

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

            // 4. VERIFICA SE É O PRIMEIRO LOGIN
            if (!user.first_login_completed) {
                logger.info(`Primeiro login detectado para: ${user.email}`);
                return res.status(403).json({
                    error: 'Primeiro login não concluído',
                    requiresRecoveryCode: true,
                    message: 'Este é seu primeiro login. Você precisa fornecer o código de recuperação que foi mostrado no registro.',
                    nextStep: 'Use o endpoint POST /auth/first-login com email, senha e recovery code'
                });
            }

            // 5. Gera access token (15 minutos) e refresh token (7 dias)
            const accessToken = generateAccessToken(user);
            const refreshToken = generateRefreshToken(user);

            // 6. Salva o refresh token no banco de dados
            await saveRefreshToken(user.id, refreshToken);

            logger.info(`Login bem-sucedido para usuário: ${user.email}`);

            // 7. Envia a resposta de sucesso com ambos os tokens
            res.status(200).json({
                message: 'Login bem-sucedido!',
                accessToken,
                refreshToken,
                expiresIn: 900 // 15 minutos em segundos
            });

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

/**
 * @swagger
 * /auth/first-login:
 *   post:
 *     summary: Primeiro login com validação de código de recuperação
 *     tags: [Autenticação]
 *     description: Usado no primeiro login após o registro. Valida email, senha e o código de recuperação fornecido no registro.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *               - recoveryCode
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *               password:
 *                 type: string
 *                 example: Senha123!@#
 *               recoveryCode:
 *                 type: string
 *                 description: Código de recuperação fornecido no registro (formato XXXX-XXXX-XXXX-XXXX)
 *                 example: A1B2-C3D4-E5F6-G7H8
 *     responses:
 *       200:
 *         description: Primeiro login concluído com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Primeiro login concluído com sucesso!
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *                   example: 900
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Credenciais ou código de recuperação inválidos
 *       403:
 *         description: Primeiro login já foi concluído
 */
router.post('/first-login', [
    authLimiter,
    // Validações
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    body('password')
        .notEmpty()
        .withMessage('Senha é obrigatória'),
    body('recoveryCode')
        .notEmpty()
        .withMessage('Código de recuperação é obrigatório')
        .custom((value) => {
            if (!isValidRecoveryCodeFormat(value)) {
                throw new Error('Formato de código de recuperação inválido. Use o formato XXXX-XXXX-XXXX-XXXX');
            }
            return true;
        })
], async (req, res) => {
    // Verifica erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }

    const { email, password, recoveryCode } = req.body;
    logger.info(`[FIRST-LOGIN] Tentativa de primeiro login para: ${email}`);

    try {
        // 1. Busca o usuário no banco
        const [results] = await db.query(
            'SELECT * FROM users WHERE email = ?',
            [email]
        );

        // 2. Verifica se o usuário existe
        if (results.length === 0) {
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }
        const user = results[0];

        // 3. Verifica se o primeiro login já foi concluído
        if (user.first_login_completed) {
            logger.warn(`[FIRST-LOGIN] Usuário ${email} já concluiu primeiro login`);
            return res.status(403).json({
                error: 'Primeiro login já foi concluído',
                message: 'Use o endpoint POST /auth/login normal'
            });
        }

        // 4. Verifica a senha
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            logger.warn(`[FIRST-LOGIN] Senha incorreta para: ${email}`);
            return res.status(401).json({ error: 'Credenciais inválidas.' });
        }

        // 5. Verifica o código de recuperação
        const codeMatch = await verifyRecoveryCode(recoveryCode, user.recovery_code);
        if (!codeMatch) {
            logger.warn(`[FIRST-LOGIN] Código de recuperação incorreto para: ${email}`);
            return res.status(401).json({
                error: 'Código de recuperação inválido',
                message: 'O código de recuperação fornecido não corresponde ao código gerado no registro.'
            });
        }

        // 6. Marca o primeiro login como concluído
        await db.query(
            'UPDATE users SET first_login_completed = TRUE WHERE id = ?',
            [user.id]
        );

        logger.info(`[FIRST-LOGIN] Primeiro login concluído com sucesso para: ${email}`);

        // 7. Gera tokens
        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        // 8. Salva o refresh token
        await saveRefreshToken(user.id, refreshToken);

        // 9. Retorna sucesso com tokens
        res.status(200).json({
            message: 'Primeiro login concluído com sucesso!',
            accessToken,
            refreshToken,
            expiresIn: 900
        });

    } catch (err) {
        logger.error('[FIRST-LOGIN] Erro durante primeiro login:', err);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

/**
 * @swagger
 * /auth/refresh:
 *   post:
 *     summary: Renova o access token usando refresh token
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token renovado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *                   example: 900
 *       400:
 *         description: Refresh token não fornecido
 *       401:
 *         description: Refresh token inválido ou expirado
 */
router.post('/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token não fornecido.' });
    }

    try {
        // Verifica se o refresh token é válido
        const decoded = await verifyRefreshToken(refreshToken);

        if (!decoded) {
            return res.status(401).json({ error: 'Refresh token inválido ou expirado.' });
        }

        // Busca os dados atualizados do usuário
        const [results] = await db.query(
            'SELECT id, email, name FROM users WHERE id = ?',
            [decoded.id]
        );

        if (results.length === 0) {
            return res.status(401).json({ error: 'Usuário não encontrado.' });
        }

        const user = results[0];

        // Gera novos tokens (token rotation)
        const newAccessToken = generateAccessToken(user);
        const newRefreshToken = generateRefreshToken(user);

        // Revoga o refresh token antigo e salva o novo
        await revokeRefreshToken(refreshToken, newRefreshToken);
        await saveRefreshToken(user.id, newRefreshToken);

        logger.info(`Tokens renovados para usuário: ${user.email}`);

        res.status(200).json({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
            expiresIn: 900 // 15 minutos
        });

    } catch (error) {
        logger.error('Erro ao renovar token:', error);
        res.status(500).json({ error: 'Erro interno ao renovar token.' });
    }
});

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     summary: Faz logout revogando o refresh token
 *     tags: [Autenticação]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Logout realizado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logout realizado com sucesso.
 *       400:
 *         description: Refresh token não fornecido
 */
router.post('/logout', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(400).json({ error: 'Refresh token não fornecido.' });
    }

    try {
        // Revoga o refresh token
        await revokeRefreshToken(refreshToken);

        logger.info('Logout realizado com sucesso');

        res.status(200).json({ message: 'Logout realizado com sucesso.' });

    } catch (error) {
        logger.error('Erro ao fazer logout:', error);
        res.status(500).json({ error: 'Erro interno ao fazer logout.' });
    }
});

/**
 * @swagger
 * /auth/reset-password-with-code:
 *   post:
 *     summary: Resetar senha usando código de recuperação
 *     tags: [Autenticação]
 *     description: Permite resetar a senha quando o usuário esqueceu a senha atual. Requer apenas email, código de recuperação e nova senha.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - recoveryCode
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: joao@exemplo.com
 *               recoveryCode:
 *                 type: string
 *                 description: Código de recuperação fornecido no registro
 *                 example: A1B2-C3D4-E5F6-G7H8
 *               newPassword:
 *                 type: string
 *                 minLength: 12
 *                 pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])
 *                 description: Nova senha (12+ caracteres com maiúsculas, minúsculas, números e especiais)
 *                 example: NovaSenha456!
 *     responses:
 *       200:
 *         description: Senha resetada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Senha resetada com sucesso! Faça login com a nova senha.
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Email ou código de recuperação inválidos
 *       500:
 *         description: Erro interno
 */
router.post('/reset-password-with-code', [
    authLimiter,
    // Validações
    body('email')
        .trim()
        .isEmail()
        .withMessage('Email inválido')
        .normalizeEmail(),
    body('recoveryCode')
        .notEmpty()
        .withMessage('Código de recuperação é obrigatório')
        .custom((value) => {
            if (!isValidRecoveryCodeFormat(value)) {
                throw new Error('Formato de código de recuperação inválido');
            }
            return true;
        }),
    body('newPassword')
        .isLength({ min: 12 })
        .withMessage('Nova senha deve ter no mínimo 12 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Nova senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais (@$!%*?&)')
], async (req, res) => {
    // Verifica erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }

    const { email, recoveryCode, newPassword } = req.body;
    logger.info(`[RESET-PASSWORD] Tentativa de reset de senha para: ${email}`);

    try {
        // 1. Busca o usuário no banco
        const [results] = await db.query(
            'SELECT id, email, recovery_code FROM users WHERE email = ?',
            [email]
        );

        // 2. Verifica se o usuário existe
        if (results.length === 0) {
            logger.warn(`[RESET-PASSWORD] Usuário não encontrado: ${email}`);
            return res.status(401).json({ error: 'Email ou código de recuperação inválidos.' });
        }
        const user = results[0];

        // 3. Verifica se o usuário tem recovery code
        if (!user.recovery_code) {
            logger.warn(`[RESET-PASSWORD] Usuário ${email} não possui recovery code`);
            return res.status(401).json({ error: 'Email ou código de recuperação inválidos.' });
        }

        // 4. Verifica o código de recuperação
        const codeMatch = await verifyRecoveryCode(recoveryCode, user.recovery_code);
        if (!codeMatch) {
            logger.warn(`[RESET-PASSWORD] Código de recuperação incorreto para: ${email}`);
            return res.status(401).json({
                error: 'Código de recuperação inválido',
                message: 'O código de recuperação fornecido está incorreto.'
            });
        }

        // 5. Hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 6. Atualiza a senha no banco
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, user.id]
        );

        // 7. Revoga todos os refresh tokens (segurança)
        await revokeAllUserTokens(user.id);

        logger.info(`[RESET-PASSWORD] Senha resetada com sucesso para: ${email}`);

        // 8. Retorna sucesso
        res.status(200).json({
            message: 'Senha resetada com sucesso! Faça login com a nova senha.',
            info: 'Por segurança, você foi desconectado de todos os dispositivos.'
        });

    } catch (err) {
        logger.error('[RESET-PASSWORD] Erro durante reset de senha:', err);
        res.status(500).json({ error: 'Erro interno no servidor.' });
    }
});

/**
 * @swagger
 * /auth/change-password:
 *   put:
 *     summary: Alterar senha do usuário autenticado
 *     tags: [Autenticação]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - currentPassword
 *               - newPassword
 *             properties:
 *               currentPassword:
 *                 type: string
 *                 description: Senha atual do usuário
 *                 example: SenhaAntiga123!
 *               newPassword:
 *                 type: string
 *                 minLength: 12
 *                 pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])
 *                 description: Nova senha (12+ caracteres com maiúsculas, minúsculas, números e especiais)
 *                 example: SenhaNova456!
 *     responses:
 *       200:
 *         description: Senha alterada com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Senha alterada com sucesso!
 *       400:
 *         description: Dados inválidos
 *       401:
 *         description: Senha atual incorreta ou não autenticado
 *       500:
 *         description: Erro interno
 */
router.put('/change-password', authMiddleware, [
    // Validações
    body('currentPassword')
        .notEmpty()
        .withMessage('Senha atual é obrigatória'),
    body('newPassword')
        .isLength({ min: 12 })
        .withMessage('Nova senha deve ter no mínimo 12 caracteres')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/)
        .withMessage('Nova senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais (@$!%*?&)'),
    body('newPassword').custom((value, { req }) => {
        if (value === req.body.currentPassword) {
            throw new Error('Nova senha não pode ser igual à senha atual');
        }
        return true;
    })
], async (req, res) => {
    // O authMiddleware já garantiu que req.userData existe
    // Se chegou aqui, o usuário está autenticado
    if (!req.userData || !req.userData.id) {
        return res.status(401).json({ error: 'Não autenticado. Faça login primeiro.' });
    }

    // Verifica erros de validação
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Dados inválidos',
            details: errors.array()
        });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.userData.id;

    try {
        // 1. Busca o usuário no banco
        const [results] = await db.query(
            'SELECT id, email, password FROM users WHERE id = ?',
            [userId]
        );

        if (results.length === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado.' });
        }

        const user = results[0];

        // 2. Verifica se a senha atual está correta
        const match = await bcrypt.compare(currentPassword, user.password);

        if (!match) {
            logger.warn(`Tentativa de alteração de senha com senha incorreta: ${user.email}`);
            return res.status(401).json({ error: 'Senha atual incorreta.' });
        }

        // 3. Hash da nova senha
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 4. Atualiza a senha no banco
        await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, userId]
        );

        // 5. (Opcional) Revoga todos os refresh tokens do usuário por segurança
        // Isso força o usuário a fazer login novamente em todos os dispositivos
        await revokeAllUserTokens(userId);

        logger.info(`Senha alterada com sucesso para usuário: ${user.email}`);

        res.status(200).json({
            message: 'Senha alterada com sucesso! Por segurança, faça login novamente.'
        });

    } catch (error) {
        logger.error('Erro ao alterar senha:', error);
        res.status(500).json({ error: 'Erro interno ao alterar senha.' });
    }
});

module.exports = router;