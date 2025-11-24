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

// Carrega variáveis de ambiente do arquivo .env na raiz do projeto
// O path.join garante que funcione mesmo quando executado de backend/
const envPath = path.join(__dirname, '..', '.env');
const envResult = dotenv.config({ path: envPath });

// Log para debug
if (envResult.error) {
  console.error(`❌ Erro ao carregar .env de ${envPath}:`, envResult.error.message);
} else {
  console.log(`✅ Arquivo .env carregado de: ${envPath}`);
}

// 🔒 SEGURANÇA: Valida variáveis de ambiente ANTES de iniciar app
// Fail-fast: Previne inicialização com configuração incorreta
const { validateOrExit } = require('./config/validateEnv');
validateOrExit();

const app = express();

// Trust proxy - necessário quando atrás de proxy reverso (nginx, domcloud, etc)
app.set('trust proxy', 1);

// Logger HTTP middleware - deve vir antes das rotas
app.use(logger.httpLogger);

// Lista de origens permitidas - definida antes para uso em múltiplos lugares
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173', // Vite dev server
  'https://clientes.domcloud.dev',
  'https://clientesvue.domcloud.dev', // Frontend Vue no DomCloud
  'https://clientesvue-1.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean); // Remove valores undefined

// Middleware para garantir que requisições OPTIONS (preflight) sempre passem
// DEVE VIR ANTES DE QUALQUER OUTRO MIDDLEWARE (exceto logger)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    const origin = req.headers.origin;
    logger.info(`[CORS-PREFLIGHT] Requisição OPTIONS recebida de origin: ${origin}`);
    logger.info(`[CORS-PREFLIGHT] Origens permitidas:`, allowedOrigins);
    
    // Verifica se a origem está na lista permitida ou se não há origin (mesmo domínio)
    if (!origin || allowedOrigins.includes(origin)) {
      // Se há origin e está permitida, usa ela; caso contrário usa '*'
      const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : '*';
      
      // Define todos os headers CORS necessários
      res.setHeader('Access-Control-Allow-Origin', allowOrigin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 horas
      
      logger.info(`[CORS-PREFLIGHT] OPTIONS permitido para origin: ${origin || 'sem origin'}, retornando 200`);
      return res.status(200).end();
    } else {
      // Origem não permitida
      logger.warn(`[CORS-PREFLIGHT] OPTIONS BLOQUEADO para origin: ${origin}`);
      res.setHeader('Access-Control-Allow-Origin', '*');
      return res.status(403).end();
    }
  }
  next();
});

// 🔒 Helmet - Headers de segurança (CSP ATIVADA)
app.use(helmet({
  // 🔒 SEGURANÇA: CSP ativada (antes estava false)
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"], // API backend não serve scripts
      styleSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: [
        "'self'",
        "https://clientes.domcloud.dev",
        "https://clientesvue.domcloud.dev",
        "https://clientesvue-1.onrender.com"
      ],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: [] // Force HTTPS
    }
  },
  crossOriginEmbedderPolicy: false, // Permite CORS
  crossOriginResourcePolicy: false, // Permite CORS
  crossOriginOpenerPolicy: false, // Permite CORS
  // 🔒 HSTS: Force HTTPS por 1 ano
  hsts: {
    maxAge: 31536000, // 1 ano em segundos
    includeSubDomains: true,
    preload: true
  }
}));

// Configuração segura de CORS - DEVE VIR ANTES DO RATE LIMITING

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
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-Requested-With'],
  exposedHeaders: ['x-csrf-token']
};

logger.info('[CORS] Configurando CORS com as seguintes origens:', allowedOrigins);
app.use(cors(corsOptions));

// Rate limiting global - proteção contra ataques de força bruta
// DEVE VIR DEPOIS DO CORS para não bloquear requisições OPTIONS (preflight)
// Exclui requisições GET (leitura) e rotas de refresh token para não bloquear uso normal
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // Máximo de 500 requisições por IP a cada 15 minutos (apenas POST/PUT/DELETE)
  message: 'Muitas requisições deste IP, tente novamente após 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
  // Exclui requisições GET (leitura) e refresh token do rate limiting
  skip: (req) => {
    // Permite todas as requisições GET (leitura)
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return true;
    }
    // Permite refresh token e CSRF token para não bloquear renovação de tokens
    if (req.path === '/auth/refresh' || req.path === '/api/csrf-token' || req.path.startsWith('/api/csrf-token')) {
      return true;
    }
    return false;
  }
});
app.use(globalLimiter);

// Rate limiter mais permissivo para rotas autenticadas (aplicado após autenticação)
// Isso permite mais ações para usuários autenticados
const authenticatedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 2000, // Máximo de 2000 requisições por IP a cada 15 minutos para rotas autenticadas
  message: 'Muitas ações realizadas. Aguarde alguns minutos antes de continuar.',
  standardHeaders: true,
  legacyHeaders: false,
  // Aplica apenas em rotas autenticadas (será aplicado nas rotas específicas)
  skip: (req) => {
    // Não aplica em requisições GET (leitura)
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') {
      return true;
    }
    return false;
  }
});

// Cookie parser - necessário para CSRF
app.use(cookieParser());

app.use(bodyParser.json());

// Configuração de CSRF Protection
const isProduction = process.env.NODE_ENV === 'production';

// 🔒 SEGURANÇA: Verifica se temos um secret válido (OBRIGATÓRIO em produção)
const csrfSecret = process.env.CSRF_SECRET || process.env.JWT_SECRET;
logger.info(`[CSRF] CSRF_SECRET definido: ${csrfSecret ? 'SIM (comprimento: ' + csrfSecret.length + ')' : 'NÃO'}`);
logger.info(`[CSRF] JWT_SECRET definido: ${process.env.JWT_SECRET ? 'SIM' : 'NÃO'}`);
logger.info(`[CSRF] NODE_ENV: ${process.env.NODE_ENV}`);

// 🔒 SEGURANÇA: Falha imediatamente se CSRF_SECRET não estiver definido em produção
if (!csrfSecret && isProduction) {
  logger.error('❌ CSRF_SECRET ou JWT_SECRET OBRIGATÓRIO em produção!');
  logger.error('❌ Configure CSRF_SECRET no arquivo .env antes de iniciar em produção.');
  process.exit(1); // Fail-fast: não inicia sem secret em produção
}

if (!csrfSecret) {
  logger.warn('[CSRF] ⚠️ CSRF_SECRET não definido em ambiente de desenvolvimento. CSRF protection será limitada.');
}

let generateCsrfToken, doubleCsrfProtection;

try {
  const csrfProtection = doubleCsrf({
    // 🔒 SEGURANÇA: Sem fallback - falha se secret não estiver definido
    getSecret: () => {
      if (!csrfSecret) {
        throw new Error('CSRF_SECRET ou JWT_SECRET não definido!');
      }
      return csrfSecret;
    },
    // Usa nome simples de cookie (sem __Host-) para compatibilidade
    cookieName: 'x-csrf-token',
    cookieOptions: {
      // CORREÇÃO: Usa 'none' para permitir cross-site (frontend Vue separado)
      // 'lax' só funciona quando frontend e backend estão no mesmo domínio
      sameSite: 'none',
      path: '/',
      // Secure deve ser true quando sameSite=none
      secure: true,
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

  // Wrapper para adicionar logs e garantir que OPTIONS sempre passe
  doubleCsrfProtection = (req, res, next) => {
    // OPTIONS (preflight) sempre passa sem verificação CSRF
    if (req.method === 'OPTIONS') {
      return next();
    }
    
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
  logger.info(`CSRF cookieOptions: sameSite=none (cross-site enabled), secure=true`);
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
const healthRoutes = require('./routes/health');
const backupRoutes = require('./routes/backup');
const authMiddleware = require('./middleware/authMiddleware');
const setupSwagger = require('./swagger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { startAutoBackup } = require('./services/backupService');

// Documentação Swagger
setupSwagger(app);

// 🏥 Health check routes (SEM autenticação/CSRF - disponível para monitoramento)
app.use('/health', healthRoutes);

 // Rotas com proteção CSRF (desabilitada em ambiente de teste)
const csrfMiddleware = process.env.NODE_ENV === 'test' ? (req, res, next) => next() : doubleCsrfProtection;

// Auth routes - CSRF aplicado apenas em POST/PUT/DELETE (GET é ignorado pela config)
app.use('/auth', csrfMiddleware, authRoutes);
// Rotas protegidas por autenticação + CSRF + Rate limiter permissivo
// O authenticatedLimiter permite mais ações para usuários autenticados (500 req/15min)
app.use('/clientes', authMiddleware, authenticatedLimiter, csrfMiddleware, clientesRoutes);
app.use('/servicos', authMiddleware, authenticatedLimiter, csrfMiddleware, servicosRoutes);
// 📦 Backup routes (requer autenticação - TODO: adicionar middleware de admin)
app.use('/backup', authMiddleware, authenticatedLimiter, csrfMiddleware, backupRoutes);
  

// API Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API de Gestão de Clientes - Backend',
    version: '1.0.0',
    endpoints: {
      docs: '/api/docs',
      auth: '/auth',
      clientes: '/clientes',
      servicos: '/servicos'
    }
  });
});

// ========================================
// MIDDLEWARE DE TRATAMENTO DE ERROS
// DEVE SER O ÚLTIMO MIDDLEWARE REGISTRADO
// ========================================

// 404 - Rota não encontrada
app.use(notFoundHandler);

// Handler centralizado de erros
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Executa migrations e inicia servidor apenas quando executado diretamente (não em testes)
if (require.main === module) {
    const { runMigrations } = require('./db/migrations');
    const { cleanupExpiredTokens } = require('./utils/tokens');

    (async () => {
        // Executa migrations antes de iniciar o servidor
        await runMigrations();

        // 🔒 SEGURANÇA: Limpeza inicial de tokens expirados
        try {
            const deletedCount = await cleanupExpiredTokens();
            logger.info(`🧹 Limpeza inicial de tokens: ${deletedCount} tokens removidos`);
        } catch (error) {
            logger.error('❌ Erro na limpeza inicial de tokens:', error);
        }

        // 🔒 SEGURANÇA: Agendar limpeza automática a cada 24 horas
        setInterval(async () => {
            try {
                const deletedCount = await cleanupExpiredTokens();
                logger.info(`🧹 Limpeza automática: ${deletedCount} tokens expirados removidos`);
            } catch (error) {
                logger.error('❌ Erro na limpeza automática de tokens:', error);
            }
        }, 24 * 60 * 60 * 1000); // 24 horas em millisegundos

        logger.info('✅ Limpeza automática de tokens agendada (a cada 24h)');

        // 📦 BOA PRÁTICA: Inicia sistema de backup automático
        startAutoBackup();

        // Inicia o servidor
        app.listen(PORT, () => {
            console.log(`Servidor rodando na porta ${PORT}`);
            logger.info(`Servidor iniciado na porta ${PORT}`);
        });
    })();
}

module.exports = app;
