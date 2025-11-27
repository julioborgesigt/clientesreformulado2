import { Router } from 'express';
import { ClienteController } from '../controllers/ClienteController';

/**
 * Cria as rotas de clientes
 *
 * @param clienteController - Instância do controller de clientes
 * @returns Router configurado com todas as rotas
 */
export function createClientesRoutes(clienteController: ClienteController): Router {
  const router = Router();

  // Rotas GET (leitura)
  router.get('/list', (req, res, next) => clienteController.listar(req, res, next));
  router.get('/dashboard-stats', (req, res, next) => clienteController.dashboardStats(req, res, next));
  router.get('/get-vencimento/:id', (req, res, next) => clienteController.getVencimento(req, res, next));
  router.get('/pagamentos/dias', (req, res, next) => clienteController.pagamentosPorDia(req, res, next));
  router.get('/stats/by-service', (req, res, next) => clienteController.statsPorServico(req, res, next));
  router.get('/alerts', (req, res, next) => clienteController.alertas(req, res, next));
  router.get('/pending-this-month', (req, res, next) => clienteController.pendentesDoMes(req, res, next));

  // Rotas POST (criação)
  router.post('/add', (req, res, next) => clienteController.criar(req, res, next));

  // Rotas PUT (atualização)
  router.put('/update/:id', (req, res, next) => clienteController.atualizar(req, res, next));
  router.put('/mark-pending/:id', (req, res, next) => clienteController.marcarPendente(req, res, next));
  router.put('/mark-paid/:id', (req, res, next) => clienteController.marcarPago(req, res, next));
  router.put('/mark-in-day/:id', (req, res, next) => clienteController.marcarEmDia(req, res, next));
  router.put('/adjust-date/:id', (req, res, next) => clienteController.ajustarData(req, res, next));
  router.put('/archive/:id', (req, res, next) => clienteController.arquivar(req, res, next));
  router.put('/unarchive/:id', (req, res, next) => clienteController.desarquivar(req, res, next));

  // Rotas DELETE (exclusão)
  router.delete('/delete/:id', (req, res, next) => clienteController.deletar(req, res, next));

  return router;
}
