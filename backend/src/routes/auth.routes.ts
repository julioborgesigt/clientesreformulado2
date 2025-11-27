import { Router } from 'express';
import { AuthController } from '../controllers/AuthController';
import { authMiddleware } from '../middleware/authMiddleware';

/**
 * Factory function para criar rotas de autenticação
 * @param authController Instância do AuthController
 * @returns Router configurado
 */
export function createAuthRoutes(authController: AuthController): Router {
  const router = Router();

  /**
   * @route   POST /api/auth/register
   * @desc    Registra novo usuário
   * @access  Public
   */
  router.post('/register', (req, res, next) =>
    authController.register(req, res, next)
  );

  /**
   * @route   POST /api/auth/login
   * @desc    Login de usuário
   * @access  Public
   */
  router.post('/login', (req, res, next) =>
    authController.login(req, res, next)
  );

  /**
   * @route   POST /api/auth/first-login
   * @desc    Primeiro login com recovery code
   * @access  Public
   */
  router.post('/first-login', (req, res, next) =>
    authController.firstLogin(req, res, next)
  );

  /**
   * @route   POST /api/auth/refresh
   * @desc    Renova access token usando refresh token
   * @access  Public
   */
  router.post('/refresh', (req, res, next) =>
    authController.refreshToken(req, res, next)
  );

  /**
   * @route   PUT /api/auth/change-password
   * @desc    Altera senha do usuário autenticado
   * @access  Private (requer autenticação)
   */
  router.put('/change-password', authMiddleware, (req, res, next) =>
    authController.changePassword(req, res, next)
  );

  /**
   * @route   POST /api/auth/reset-password
   * @desc    Reset de senha usando recovery code
   * @access  Public
   */
  router.post('/reset-password', (req, res, next) =>
    authController.resetPassword(req, res, next)
  );

  /**
   * @route   POST /api/auth/logout
   * @desc    Logout (revoga refresh token)
   * @access  Public
   */
  router.post('/logout', (req, res, next) =>
    authController.logout(req, res, next)
  );

  /**
   * @route   POST /api/auth/logout-all
   * @desc    Revoga todos os tokens do usuário
   * @access  Private (requer autenticação)
   */
  router.post('/logout-all', authMiddleware, (req, res, next) =>
    authController.logoutAll(req, res, next)
  );

  /**
   * @route   GET /api/auth/me
   * @desc    Obtém informações do usuário autenticado
   * @access  Private (requer autenticação)
   */
  router.get('/me', authMiddleware, (req, res, next) =>
    authController.getMe(req, res, next)
  );

  return router;
}
