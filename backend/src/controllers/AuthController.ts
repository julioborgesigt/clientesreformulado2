import { Request, Response, NextFunction } from 'express';
import { plainToClass } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthService } from '../services/AuthService';
import { RegisterDto } from '../dtos/auth/RegisterDto';
import { LoginDto } from '../dtos/auth/LoginDto';
import { FirstLoginDto } from '../dtos/auth/FirstLoginDto';
import { ChangePasswordDto } from '../dtos/auth/ChangePasswordDto';
import { ResetPasswordDto } from '../dtos/auth/ResetPasswordDto';
import { RefreshTokenDto } from '../dtos/auth/RefreshTokenDto';

/**
 * Controller de autenticação
 * Responsável por receber requisições HTTP e delegar para AuthService
 */
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Registra novo usuário
   * POST /api/auth/register
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validar DTO
      const dto = plainToClass(RegisterDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors.map(e => ({
            field: e.property,
            constraints: e.constraints
          }))
        });
        return;
      }

      // Executar registro
      const result = await this.authService.register(dto);

      res.status(201).json({
        message: 'Usuário registrado com sucesso!',
        userId: result.userId,
        recoveryCode: result.recoveryCode,
        warning: 'Guarde este código de recuperação em local seguro. Você precisará dele no primeiro login.'
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Email já está em uso') {
          res.status(409).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  }

  /**
   * Realiza login
   * POST /api/auth/login
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validar DTO
      const dto = plainToClass(LoginDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors.map(e => ({
            field: e.property,
            constraints: e.constraints
          }))
        });
        return;
      }

      // Executar login
      const result = await this.authService.login(dto);

      res.status(200).json({
        message: 'Login realizado com sucesso',
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'FIRST_LOGIN_REQUIRED') {
          res.status(403).json({
            error: 'FIRST_LOGIN_REQUIRED',
            message: 'Este é seu primeiro login. Use o endpoint /first-login com seu código de recuperação.'
          });
          return;
        }
        if (error.message === 'Credenciais inválidas') {
          res.status(401).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  }

  /**
   * Primeiro login com recovery code
   * POST /api/auth/first-login
   */
  async firstLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validar DTO
      const dto = plainToClass(FirstLoginDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors.map(e => ({
            field: e.property,
            constraints: e.constraints
          }))
        });
        return;
      }

      // Executar primeiro login
      const result = await this.authService.firstLogin(dto);

      res.status(200).json({
        message: 'Primeiro login completado com sucesso!',
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        warning: 'Um novo código de recuperação foi gerado e enviado para seu email.'
      });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'Credenciais inválidas' ||
          error.message === 'Código de recuperação inválido' ||
          error.message.includes('Código de recuperação expirado')
        ) {
          res.status(401).json({ error: error.message });
          return;
        }
        if (error.message.includes('já foi completado')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  }

  /**
   * Renova access token
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validar DTO
      const dto = plainToClass(RefreshTokenDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors.map(e => ({
            field: e.property,
            constraints: e.constraints
          }))
        });
        return;
      }

      // Renovar token
      const result = await this.authService.refreshToken(dto);

      res.status(200).json({
        message: 'Token renovado com sucesso',
        accessToken: result.accessToken,
        refreshToken: result.refreshToken
      });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message.includes('inválido') ||
          error.message.includes('expirado') ||
          error.message.includes('não encontrado')
        ) {
          res.status(401).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  }

  /**
   * Altera senha (usuário autenticado)
   * PUT /api/auth/change-password
   */
  async changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Obter ID do usuário autenticado
      const userId = (req as any).userData?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      // Validar DTO
      const dto = plainToClass(ChangePasswordDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors.map(e => ({
            field: e.property,
            constraints: e.constraints
          }))
        });
        return;
      }

      // Alterar senha
      await this.authService.changePassword(userId, dto);

      res.status(200).json({
        message: 'Senha alterada com sucesso! Todos os seus dispositivos foram desconectados por segurança.'
      });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'Senha atual incorreta') {
          res.status(401).json({ error: error.message });
          return;
        }
        if (error.message.includes('deve ser diferente')) {
          res.status(400).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  }

  /**
   * Reset de senha com recovery code
   * POST /api/auth/reset-password
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Validar DTO
      const dto = plainToClass(ResetPasswordDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({
          error: 'Dados inválidos',
          details: errors.map(e => ({
            field: e.property,
            constraints: e.constraints
          }))
        });
        return;
      }

      // Resetar senha
      await this.authService.resetPassword(dto);

      res.status(200).json({
        message: 'Senha resetada com sucesso! Um novo código de recuperação foi enviado para seu email.'
      });
    } catch (error) {
      if (error instanceof Error) {
        if (
          error.message === 'Usuário não encontrado' ||
          error.message === 'Código de recuperação inválido' ||
          error.message.includes('Código de recuperação expirado')
        ) {
          res.status(401).json({ error: error.message });
          return;
        }
      }
      next(error);
    }
  }

  /**
   * Faz logout (revoga refresh token)
   * POST /api/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ error: 'Refresh token é obrigatório' });
        return;
      }

      await this.authService.logout(refreshToken);

      res.status(200).json({
        message: 'Logout realizado com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoga todos os tokens do usuário
   * POST /api/auth/logout-all
   */
  async logoutAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Obter ID do usuário autenticado
      const userId = (req as any).userData?.id;

      if (!userId) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      await this.authService.logoutAll(userId);

      res.status(200).json({
        message: 'Todos os dispositivos foram desconectados com sucesso'
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtém informações do usuário autenticado
   * GET /api/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userData = (req as any).userData;

      if (!userData) {
        res.status(401).json({ error: 'Não autenticado' });
        return;
      }

      res.status(200).json({
        user: userData
      });
    } catch (error) {
      next(error);
    }
  }
}
