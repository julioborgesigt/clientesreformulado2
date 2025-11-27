import { Request, Response, NextFunction } from 'express';
import { ClienteService } from '../services/ClienteService';
import { CreateClienteDto } from '../dtos/clientes/CreateClienteDto';
import { UpdateClienteDto } from '../dtos/clientes/UpdateClienteDto';
import { ListClientesDto } from '../dtos/clientes/ListClientesDto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

/**
 * Controller: ClienteController
 *
 * Responsável por receber requisições HTTP e delegar para o ClienteService
 */
export class ClienteController {
  constructor(private clienteService: ClienteService) {}

  /**
   * GET /clientes/list - Lista todos os clientes
   */
  async listar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;

      // Valida query parameters
      const dto = plainToClass(ListClientesDto, req.query);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({ error: 'Parâmetros inválidos', details: errors });
        return;
      }

      const result = await this.clienteService.listarClientes(userId, dto);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /clientes/add - Cria um novo cliente
   */
  async criar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;

      // Valida DTO
      const dto = plainToClass(CreateClienteDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({ error: 'Dados inválidos', details: errors });
        return;
      }

      const clienteId = await this.clienteService.criarCliente(dto, userId);

      res.status(201).json({
        message: 'Cliente adicionado com sucesso!',
        id: clienteId
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /clientes/update/:id - Atualiza um cliente
   */
  async atualizar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clienteId = parseInt(req.params.id || '0');

      if (isNaN(clienteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      // Valida DTO
      const dto = plainToClass(UpdateClienteDto, req.body);
      const errors = await validate(dto);

      if (errors.length > 0) {
        res.status(400).json({ error: 'Dados inválidos', details: errors });
        return;
      }

      await this.clienteService.atualizarCliente(clienteId, dto, userId);

      res.status(200).json({ message: 'Cliente atualizado com sucesso!' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /clientes/delete/:id - Deleta um cliente (soft delete)
   */
  async deletar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clienteId = parseInt(req.params.id || '0');

      if (isNaN(clienteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      await this.clienteService.deletarCliente(clienteId, userId);

      res.status(200).json({ message: 'Cliente excluído com sucesso!' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /clientes/mark-pending/:id - Marca cliente como pendente
   */
  async marcarPendente(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clienteId = parseInt(req.params.id || '0');

      if (isNaN(clienteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      await this.clienteService.marcarPendente(clienteId, userId);

      res.status(200).json({ message: 'Status do cliente atualizado para "Não pagou".' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /clientes/mark-paid/:id - Marca cliente como pago
   */
  async marcarPago(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clienteId = parseInt(req.params.id || '0');

      if (isNaN(clienteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      await this.clienteService.marcarPago(clienteId, userId);

      res.status(200).json({ message: 'Status do cliente atualizado para "cobrança feita".' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /clientes/mark-in-day/:id - Marca cliente como em dia
   */
  async marcarEmDia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clienteId = parseInt(req.params.id || '0');

      if (isNaN(clienteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      await this.clienteService.marcarEmDia(clienteId, userId);

      res.status(200).json({ message: 'Status do cliente atualizado para "Pag. em dias".' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /clientes/adjust-date/:id - Ajusta data de vencimento
   */
  async ajustarData(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clienteId = parseInt(req.params.id || '0');

      if (isNaN(clienteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const { value, unit } = req.body;

      if (!value || !unit) {
        res.status(400).json({ error: 'Parâmetros value e unit são obrigatórios' });
        return;
      }

      if (unit !== 'DAY' && unit !== 'MONTH') {
        res.status(400).json({ error: 'Unit deve ser DAY ou MONTH' });
        return;
      }

      const result = await this.clienteService.ajustarData(clienteId, userId, parseInt(value), unit);

      res.status(200).json({
        message: `Data ajustada com sucesso!${result.statusUpdated ? ' Status atualizado para "Pag. em dias".' : ''}`,
        vencimento: result.vencimento
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /clientes/archive/:id - Arquiva um cliente
   */
  async arquivar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clienteId = parseInt(req.params.id || '0');

      if (isNaN(clienteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      await this.clienteService.arquivarCliente(clienteId, userId);

      res.status(200).json({ message: 'Cliente arquivado com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /clientes/unarchive/:id - Desarquiva um cliente
   */
  async desarquivar(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clienteId = parseInt(req.params.id || '0');

      if (isNaN(clienteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      await this.clienteService.desarquivarCliente(clienteId, userId);

      res.status(200).json({ message: 'Cliente desarquivado com sucesso' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clientes/dashboard-stats - Busca estatísticas do dashboard
   */
  async dashboardStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const stats = await this.clienteService.buscarDashboardStats(userId);

      res.status(200).json(stats);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clientes/get-vencimento/:id - Busca data de vencimento
   */
  async getVencimento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clienteId = parseInt(req.params.id || '0');

      if (isNaN(clienteId)) {
        res.status(400).json({ error: 'ID inválido' });
        return;
      }

      const vencimento = await this.clienteService.buscarVencimento(clienteId, userId);

      res.status(200).json({ vencimento });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clientes/pagamentos/dias - Busca pagamentos por dia do mês
   */
  async pagamentosPorDia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const result = await this.clienteService.buscarPagamentosPorDia(userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clientes/stats/by-service - Busca estatísticas por serviço
   */
  async statsPorServico(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const result = await this.clienteService.buscarStatsPorServico(userId);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clientes/alerts - Busca alertas de vencimento
   */
  async alertas(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const alertas = await this.clienteService.buscarAlertas(userId);

      res.status(200).json(alertas);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /clientes/pending-this-month - Busca clientes pendentes do mês
   */
  async pendentesDoMes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = (req as any).userData.id;
      const clientes = await this.clienteService.buscarPendentesDoMes(userId);

      res.status(200).json(clientes);
    } catch (error) {
      next(error);
    }
  }
}
