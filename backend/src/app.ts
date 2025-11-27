/**
 * App Principal - Arquitetura em Camadas com TypeScript
 *
 * Este é um exemplo de como integrar a nova arquitetura.
 * Demonstra a injeção de dependências e setup das rotas.
 */

import 'reflect-metadata'; // Necessário para class-validator
import express, { Application } from 'express';
import dotenv from 'dotenv';
import path from 'path';

// Configuração de ambiente
const envPath = path.join(__dirname, '../../.env');
dotenv.config({ path: envPath });

// Imports da configuração
import { createDatabasePool, testDatabaseConnection } from './config/database';

// Imports de repositórios, services e controllers
import { ClienteRepository } from './repositories/ClienteRepository';
import { ClienteService } from './services/ClienteService';
import { ClienteController } from './controllers/ClienteController';

import { UserRepository } from './repositories/UserRepository';
import { RefreshTokenRepository } from './repositories/RefreshTokenRepository';
import { AuthService } from './services/AuthService';
import { AuthController } from './controllers/AuthController';

// Imports de rotas
import { createClientesRoutes } from './routes/clientes.routes';
import { createAuthRoutes } from './routes/auth.routes';

// Imports de middleware
import { authMiddleware } from './middleware/authMiddleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

/**
 * Classe principal da aplicação
 */
class App {
  public app: Application;
  private dbPool: any;

  constructor() {
    this.app = express();
    this.dbPool = createDatabasePool();

    this.initializeMiddlewares();
    this.initializeRoutes();
  }

  /**
   * Inicializa os middlewares do Express
   */
  private initializeMiddlewares(): void {
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // Health check endpoint
    this.app.get('/', (_req, res) => {
      res.json({
        status: 'ok',
        message: 'API de Gestão de Clientes - TypeScript + Arquitetura em Camadas',
        version: '2.0.0',
        architecture: 'Controllers → Services → Repositories',
        endpoints: {
          auth: '/api/auth',
          clientes: '/api/clientes',
          docs: '/api/docs'
        }
      });
    });
  }

  /**
   * Inicializa as rotas com injeção de dependências
   */
  private initializeRoutes(): void {
    // ========================================
    // Auth Module - Autenticação e Autorização
    // ========================================

    const userRepository = new UserRepository(this.dbPool);
    const refreshTokenRepository = new RefreshTokenRepository(this.dbPool);
    const authService = new AuthService(userRepository, refreshTokenRepository);
    const authController = new AuthController(authService);
    const authRoutes = createAuthRoutes(authController);

    // Rotas públicas de autenticação (sem middleware)
    this.app.use('/api/auth', authRoutes);

    // ========================================
    // Clientes Module - Gestão de Clientes
    // ========================================

    const clienteRepository = new ClienteRepository(this.dbPool);
    const clienteService = new ClienteService(clienteRepository);
    const clienteController = new ClienteController(clienteService);
    const clientesRoutes = createClientesRoutes(clienteController);

    // Rotas protegidas de clientes (requer autenticação)
    this.app.use('/api/clientes', authMiddleware, clientesRoutes);

    // ========================================
    // Exemplo de como adicionar mais módulos:
    // ========================================

    // Servicos Module
    // const servicoRepository = new ServicoRepository(this.dbPool);
    // const servicoService = new ServicoService(servicoRepository);
    // const servicoController = new ServicoController(servicoService);
    // const servicosRoutes = createServicosRoutes(servicoController);
    // this.app.use('/api/servicos', authMiddleware, servicosRoutes);

    // ========================================
    // Error Handlers (DEVEM SER OS ÚLTIMOS)
    // ========================================

    // 404 - Rota não encontrada
    this.app.use(notFoundHandler);

    // Error handler global
    this.app.use(errorHandler);
  }

  /**
   * Inicia o servidor
   */
  public async listen(port: number): Promise<void> {
    // Testa conexão com banco antes de iniciar
    const dbConnected = await testDatabaseConnection(this.dbPool);

    if (!dbConnected) {
      console.error('❌ Falha ao conectar ao banco de dados. Servidor não será iniciado.');
      process.exit(1);
    }

    this.app.listen(port, () => {
      console.log(`\n🚀 Servidor TypeScript rodando na porta ${port}`);
      console.log(`📁 Arquitetura: Controllers → Services → Repositories`);
      console.log(`🔗 Acesse: http://localhost:${port}\n`);
    });
  }
}

// ========================================
// Inicialização
// ========================================

if (require.main === module) {
  const PORT = parseInt(process.env.PORT || '3000');
  const app = new App();
  app.listen(PORT);
}

export default App;
