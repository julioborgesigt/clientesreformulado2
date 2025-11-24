// Em backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    // OPTIONS (preflight) sempre passa sem autenticação
    if (req.method === 'OPTIONS') {
        return next();
    }
    
    try {
        // Verifica se o cabeçalho Authorization existe
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token não fornecido!' });
        }

        // Pega o token do cabeçalho 'Authorization' (ex: "Bearer SEUTOKEN...")
        const token = authHeader.split(' ')[1];

        // Verifica se o token foi extraído corretamente
        if (!token) {
            return res.status(401).json({ error: 'Token inválido!' });
        }

        // Verifica se o token é válido
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);

        // Adiciona os dados do usuário (como o ID) ao objeto 'req'
        req.userData = { id: decodedToken.id };

        // Continua para a próxima rota
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Autenticação falhou!' });
    }
};