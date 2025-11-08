const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const { doubleCsrf } = require('csrf-csrf');
const logger = require('./utils/logger');

dotenv.config();
const app = express();

// Logger HTTP middleware - deve vir antes das rotas
app.use(logger.httpLogger);

// Helmet - Headers de segurança
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitar CSP para permitir inline scripts (ajuste conforme necessário)
  crossOriginEmbedderPolicy: false
}));

// Rate limiting global - proteção contra ataques de força bruta
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo de 100 requisições por IP a cada 15 minutos
  message: 'Muitas requisições deste IP, tente novamente após 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(globalLimiter);

// Configuração segura de CORS
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Cookie parser - necessário para CSRF
app.use(cookieParser());

app.use(bodyParser.json());

// Configuração de CSRF Protection
const isProduction = process.env.NODE_ENV === 'production';
const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET,
  // Usa nome simples de cookie (sem __Host-) para compatibilidade
  cookieName: 'x-csrf-token',
  cookieOptions: {
    sameSite: 'lax', // 'lax' é mais compatível que 'strict'
    path: '/',
    secure: isProduction,
    httpOnly: false, // false permite que o JS acesse o cookie se necessário
  },
  size: 64,
  ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
});

// Endpoint para obter CSRF token
app.get('/api/csrf-token', (req, res) => {
  try {
    const csrfToken = generateToken(req, res);
    res.json({ csrfToken });
  } catch (error) {
    logger.error('Erro ao gerar CSRF token:', error);
    res.status(500).json({
      error: 'Erro ao gerar CSRF token',
      message: error.message
    });
  }
});


const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const servicosRoutes = require('./routes/servicos');
const authMiddleware = require('./middleware/authMiddleware');
const setupSwagger = require('./swagger');

// Documentação Swagger
setupSwagger(app);

 // Rotas - CSRF temporariamente desabilitado para debug
// TODO: Reabilitar CSRF quando o erro 500 for resolvido
app.use('/auth', authRoutes);
// Rotas protegidas por autenticação
app.use('/clientes', authMiddleware, clientesRoutes);
app.use('/servicos', authMiddleware, servicosRoutes);
  

// Configura o uso de arquivos estáticos (CSS, JS, etc.) a partir da pasta frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rota para a página principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend', 'index.html')); // Caminho para o index.html
});

// Rota para a página principal
app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend', 'dashboard.html')); // Caminho para o dashboard.html
  });
  

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = app;
