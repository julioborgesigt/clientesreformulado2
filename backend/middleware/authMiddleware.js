// Em backend/middleware/authMiddleware.js

const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    try {
        // Pega o token do cabeçalho 'Authorization' (ex: "Bearer SEUTOKEN...")
        const token = req.headers.authorization.split(' ')[1];
        
        // Verifica se o token é válido
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
        
        // Adiciona os dados do usuário (como o ID) ao objeto 'req'
        req.userData = { userId: decodedToken.id };
        
        // Continua para a próxima rota
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Autenticação falhou!' });
    }
};