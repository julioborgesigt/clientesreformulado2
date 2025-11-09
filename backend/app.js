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

// Trust proxy - necessário quando atrás de proxy reverso (nginx, domcloud, etc)
app.set('trust proxy', 1);

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
// Permite múltiplas origens (frontend Vue e frontend vanilla JS)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
  'https://clientes.domcloud.dev',
  'https://clientesvue-1.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove valores undefined

const corsOptions = {
  origin: function (origin, callback) {
    logger.info(`[CORS] Requisição de origin: ${origin}`);
    logger.info(`[CORS] Origens permitidas:`, allowedOrigins);

    // Permite requisições sem origin (como Postman, curl, etc.) ou origens permitidas
    if (!origin || allowedOrigins.includes(origin)) {
      logger.info(`[CORS] Origin permitida: ${origin || 'sem origin'}`);
      callback(null, true);
    } else {
      logger.warn(`[CORS] BLOQUEADO - origem não permitida: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

logger.info('[CORS] Configurando CORS com as seguintes origens:', allowedOrigins);
app.use(cors(corsOptions));

// Cookie parser - necessário para CSRF
app.use(cookieParser());

app.use(bodyParser.json());

// Configuração de CSRF Protection
const isProduction = process.env.NODE_ENV === 'production';

// Verifica se temos um secret válido
const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
logger.info(`[CSRF] CSRF_SECRET definido: ${csrfSecret ? 'SIM (comprimento: ' + csrfSecret.length + ')' : 'NÃO'}`);
logger.info(`[CSRF] JWT_SECRET definido: ${process.env.JWT_SECRET ? 'SIM' : 'NÃO'}`);
logger.info(`[CSRF] NODE_ENV: ${process.env.NODE_ENV}`);

if (!csrfSecret) {
  logger.warn('[CSRF] CSRF_SECRET ou JWT_SECRET não definido. CSRF protection será desabilitada.');
}

let generateCsrfToken, doubleCsrfProtection;

try {
  const csrfProtection = doubleCsrf({
    getSecret: () => csrfSecret || 'fallback-secret-change-in-production',
    // Usa nome simples de cookie (sem __Host-) para compatibilidade
    cookieName: 'x-csrf-token',
    cookieOptions: {
      sameSite: process.env.NODE_ENV === 'production' ? 'lax' : 'none',
      path: '/',
      secure: process.env.NODE_ENV !== 'development',
      httpOnly: false,
    },
    size: 64,
    ignoredMethods: ['GET', 'HEAD', 'OPTIONS'],
    // Adiciona getSessionIdentifier para evitar erro
    getSessionIdentifier: (req) => {
      // Usa IP do usuário como identificador de sessão
      return req.ip || req.connection.remoteAddress || 'unknown';
    },
  });

  generateCsrfToken = csrfProtection.generateCsrfToken;
  const originalDoubleCsrfProtection = csrfProtection.doubleCsrfProtection;

  // Wrapper para adicionar logs
  doubleCsrfProtection = (req, res, next) => {
    logger.info(`[CSRF] Verificando CSRF para ${req.method} ${req.path}`);
    logger.info(`[CSRF] Headers recebidos:`, {
      'x-csrf-token': req.headers['x-csrf-token'],
      'cookie': req.headers.cookie ? 'presente' : 'ausente',
      'origin': req.headers.origin
    });

    originalDoubleCsrfProtection(req, res, (err) => {
      if (err) {
        logger.error(`[CSRF] Proteção CSRF bloqueou a requisição: ${err.message}`);
        logger.error(`[CSRF] Detalhes:`, err);
      } else {
        logger.info(`[CSRF] Proteção CSRF passou - requisição autorizada`);
      }
      next(err);
    });
  };

  logger.info('CSRF protection configurada com sucesso');
  logger.info(`CSRF cookieOptions: sameSite=${process.env.NODE_ENV === 'production' ? 'lax' : 'none'}, secure=${process.env.NODE_ENV !== 'development'}`);
} catch (error) {
  logger.error('Erro ao configurar CSRF protection:', error);
  // Fallback: cria middleware dummy que não bloqueia nada
  generateCsrfToken = () => 'csrf-disabled';
  doubleCsrfProtection = (req, res, next) => next();
  logger.warn('CSRF protection desabilitada devido a erro na configuração');
}

// Endpoint para obter CSRF token
app.get('/api/csrf-token', (req, res) => {
  try {
    logger.info('[CSRF] Requisição para obter CSRF token');
    logger.info(`[CSRF] Origin: ${req.headers.origin}`);
    logger.info(`[CSRF] NODE_ENV: ${process.env.NODE_ENV}`);
    logger.info(`[CSRF] Cookie header: ${req.headers.cookie ? 'presente' : 'ausente'}`);

    // Em ambiente de teste, retorna um token dummy
    if (process.env.NODE_ENV === 'test') {
      logger.info('[CSRF] Ambiente de teste - retornando token dummy');
      return res.json({ csrfToken: 'test-csrf-token' });
    }

    logger.info('[CSRF] Chamando generateCsrfToken...');
    const csrfToken = generateCsrfToken(req, res);
    logger.info(`[CSRF] Token gerado com sucesso: ${csrfToken.substring(0, 10)}...`);
    logger.info(`[CSRF] Headers de resposta a serem enviados:`, res.getHeaders());
    res.json({ csrfToken });
  } catch (error) {
    logger.error('[CSRF] Erro ao gerar CSRF token:', error);
    logger.error('[CSRF] Stack trace:', error.stack);
    // Retorna um token dummy ao invés de erro 500
    // Isso permite que o sistema continue funcionando sem CSRF
    logger.warn('[CSRF] Retornando token dummy - CSRF protection efetivamente desabilitada');
    res.json({ csrfToken: 'csrf-disabled-due-to-error' });
  }
});


const authRoutes = require('./routes/auth');
const clientesRoutes = require('./routes/clientes');
const servicosRoutes = require('./routes/servicos');
const authMiddleware = require('./middleware/authMiddleware');
const setupSwagger = require('./swagger');

// Documentação Swagger
setupSwagger(app);

 // Rotas com proteção CSRF (desabilitada em ambiente de teste)
const csrfMiddleware = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : doubleCsrfProtection;

// Auth routes - CSRF aplicado apenas em POST/PUT/DELETE (GET é ignorado pela config)
app.use('/auth', csrfMiddleware, authRoutes);
// Rotas protegidas por autenticação + CSRF
app.use('/clientes', authMiddleware, csrfMiddleware, clientesRoutes);
app.use('/servicos', authMiddleware, csrfMiddleware, servicosRoutes);
  

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

// Executa migrations e inicia servidor apenas quando executado diretamente (não em testes)
if (require.main === module) {
    const { runMigrations } = require('./db/migrations');

    (async () => {
        // Executa migrations antes de iniciar o servidor
        await runMigrations();

        // Inicia o servidor
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            logger.info(`Servidor iniciado na porta ${PORT}`);
        });
    })();
}

module.exports = app;
