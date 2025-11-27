import { ClienteRepository } from '../repositories/ClienteRepository';
import { Cliente, ClienteFilters, ClienteStatus } from '../entities/Cliente';
import { CreateClienteDto } from '../dtos/clientes/CreateClienteDto';
import { UpdateClienteDto } from '../dtos/clientes/UpdateClienteDto';

// Constantes de valores padrão
const DEFAULT_VALOR_COBRADO = 15.00;
const DEFAULT_CUSTO = 6.00;

/**
 * Service: ClienteService
 *
 * Contém toda a lógica de negócio relacionada a clientes
 */
export class ClienteService {
  constructor(
    private clienteRepository: ClienteRepository
  ) {}

  /**
   * Lista clientes com filtros e paginação
   */
  async listarClientes(userId: number, filters: ClienteFilters): Promise<{ clientes: Cliente[]; total: number; page: number; limit: number }> {
    const result = await this.clienteRepository.findAll(userId, filters);

    // Formata datas
    const clientesFormatados = result.clientes.map(cliente => ({
      ...cliente,
      vencimento: cliente.vencimento ? new Date(cliente.vencimento).toISOString().split('T')[0] : null
    }));

    return {
      clientes: clientesFormatados as any,
      total: result.total,
      page: filters.page || 1,
      limit: filters.limit || -1
    };
  }

  /**
   * Busca um cliente por ID
   */
  async buscarCliente(id: number, userId: number): Promise<Cliente> {
    const cliente = await this.clienteRepository.findById(id, userId);

    if (!cliente) {
      throw new Error('Cliente não encontrado ou você não tem permissão para acessá-lo.');
    }

    return cliente;
  }

  /**
   * Cria um novo cliente
   */
  async criarCliente(dto: CreateClienteDto, userId: number): Promise<number> {
    // Aplica valores padrão
    const valorCobrado = dto.valor_cobrado ?? DEFAULT_VALOR_COBRADO;
    const custo = dto.custo ?? DEFAULT_CUSTO;

    // Converte data se fornecida
    const vencimento = dto.vencimento ? new Date(dto.vencimento) : null;

    const clienteId = await this.clienteRepository.create({
      name: dto.name,
      vencimento,
      servico: dto.servico,
      whatsapp: dto.whatsapp,
      observacoes: dto.observacoes,
      valor_cobrado: valorCobrado,
      custo: custo,
      user_id: userId
    });

    // TODO: Adicionar log de ação (ActionLogService)
    // await this.actionLogService.log('CREATE_CLIENT', clienteId, `Cliente "${dto.name}" criado.`, userId);

    return clienteId;
  }

  /**
   * Atualiza um cliente existente
   */
  async atualizarCliente(id: number, dto: UpdateClienteDto, userId: number): Promise<void> {
    // Verifica se o cliente existe e pertence ao usuário
    await this.buscarCliente(id, userId);

    // Converte data se fornecida
    const vencimento = dto.vencimento ? new Date(dto.vencimento) : undefined;

    await this.clienteRepository.update({
      id,
      user_id: userId,
      name: dto.name,
      vencimento: vencimento as any,
      servico: dto.servico,
      whatsapp: dto.whatsapp,
      observacoes: dto.observacoes,
      valor_cobrado: dto.valor_cobrado,
      custo: dto.custo
    });

    // TODO: Adicionar log de ação com dados originais
    // await this.actionLogService.log('UPDATE_CLIENT', id, detalhes, userId, true, clienteOriginal);
  }

  /**
   * Deleta um cliente (soft delete)
   */
  async deletarCliente(id: number, userId: number): Promise<void> {
    // Verifica se o cliente existe e pertence ao usuário
    await this.buscarCliente(id, userId);

    await this.clienteRepository.softDelete(id, userId);

    // TODO: Adicionar log de ação
    // await this.actionLogService.log('DELETE_CLIENT', id, `Cliente "${cliente.name}" excluído.`, userId, true, cliente);
  }

  /**
   * Marca cliente como pendente
   */
  async marcarPendente(id: number, userId: number): Promise<void> {
    await this.atualizarStatus(id, userId, ClienteStatus.NAO_PAGOU);
  }

  /**
   * Marca cliente como pago
   */
  async marcarPago(id: number, userId: number): Promise<void> {
    await this.atualizarStatus(id, userId, ClienteStatus.COBRANCA_FEITA);
  }

  /**
   * Marca cliente como em dia
   */
  async marcarEmDia(id: number, userId: number): Promise<void> {
    await this.atualizarStatus(id, userId, ClienteStatus.PAG_EM_DIAS);
  }

  /**
   * Atualiza o status de um cliente (método auxiliar)
   */
  private async atualizarStatus(id: number, userId: number, novoStatus: string): Promise<void> {
    // Busca o cliente para verificar status atual
    const cliente = await this.buscarCliente(id, userId);

    if (cliente.status === novoStatus) {
      // Status já é o mesmo, nada a fazer
      return;
    }

    await this.clienteRepository.updateStatus(id, userId, novoStatus);

    // TODO: Adicionar log de ação
    // await this.actionLogService.log('CHANGE_STATUS', id, detalhes, userId, true, { status: cliente.status });
  }

  /**
   * Ajusta a data de vencimento de um cliente
   */
  async ajustarData(id: number, userId: number, value: number, unit: 'DAY' | 'MONTH'): Promise<{ vencimento: string | null; statusUpdated: boolean }> {
    // Busca o cliente
    const cliente = await this.buscarCliente(id, userId);
    const originalStatus = cliente.status;

    // Atualiza a data
    await this.clienteRepository.adjustDate(id, userId, value, unit);

    // Lógica de atualização de status
    let statusUpdated = false;
    if (unit === 'MONTH' && value > 0) {
      if (originalStatus !== ClienteStatus.PAG_EM_DIAS) {
        await this.clienteRepository.updateStatus(id, userId, ClienteStatus.PAG_EM_DIAS);
        statusUpdated = true;
      }
    }

    // Busca nova data
    const newVencimento = await this.clienteRepository.getVencimento(id, userId);
    const newDate = newVencimento ? new Date(newVencimento).toISOString().split('T')[0] : null;

    // TODO: Adicionar log de ação
    // await this.actionLogService.log('ADJUST_DATE', id, detalhes, userId, true, originalData);

    return {
      vencimento: newDate || null,
      statusUpdated
    };
  }

  /**
   * Arquiva um cliente
   */
  async arquivarCliente(id: number, userId: number): Promise<void> {
    const cliente = await this.buscarCliente(id, userId);

    if (cliente.arquivado) {
      throw new Error('Cliente já está arquivado.');
    }

    await this.clienteRepository.archive(id, userId);

    // TODO: Adicionar log de ação
    // await this.actionLogService.log('ARCHIVE_CLIENT', id, detalhes, userId, true, { arquivado: false });
  }

  /**
   * Desarquiva um cliente
   */
  async desarquivarCliente(id: number, userId: number): Promise<void> {
    const cliente = await this.buscarCliente(id, userId);

    if (!cliente.arquivado) {
      throw new Error('Cliente não está arquivado.');
    }

    await this.clienteRepository.unarchive(id, userId);

    // TODO: Adicionar log de ação
    // await this.actionLogService.log('UNARCHIVE_CLIENT', id, detalhes, userId, true, { arquivado: true });
  }

  /**
   * Busca estatísticas do dashboard
   */
  async buscarDashboardStats(userId: number): Promise<any> {
    return await this.clienteRepository.getDashboardStats(userId);
  }

  /**
   * Busca a data de vencimento de um cliente
   */
  async buscarVencimento(id: number, userId: number): Promise<string | null> {
    const vencimento = await this.clienteRepository.getVencimento(id, userId);
    return vencimento ? new Date(vencimento).toISOString().split('T')[0] || null : null;
  }

  /**
   * Busca pagamentos por dia do mês
   */
  async buscarPagamentosPorDia(userId: number): Promise<{ days: string[]; payments: number[] }> {
    const payments = await this.clienteRepository.getPaymentsByDay(userId);
    const labels = Array.from({ length: 31 }, (_, i) => (i + 1).toString());

    return { days: labels, payments };
  }

  /**
   * Busca estatísticas por serviço
   */
  async buscarStatsPorServico(userId: number): Promise<{ labels: string[]; data: number[] }> {
    return await this.clienteRepository.getStatsByService(userId);
  }

  /**
   * Busca alertas de clientes com vencimento próximo
   */
  async buscarAlertas(userId: number): Promise<Cliente[]> {
    return await this.clienteRepository.getAlertsClientes(userId);
  }

  /**
   * Busca clientes pendentes do mês atual
   */
  async buscarPendentesDoMes(userId: number): Promise<Cliente[]> {
    const clientes = await this.clienteRepository.getPendingThisMonth(userId);

    // Formata datas
    return clientes.map(cliente => ({
      ...cliente,
      vencimento: cliente.vencimento ? new Date(cliente.vencimento).toISOString().split('T')[0] : null
    })) as any;
  }
}
