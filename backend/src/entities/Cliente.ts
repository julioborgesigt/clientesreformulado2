/**
 * Entity: Cliente
 *
 * Representa um cliente cadastrado no sistema.
 * Tabela: clientes
 */

export interface Cliente {
  id: number;
  name: string;
  vencimento: Date | null;
  servico: string;
  whatsapp: string | null;
  observacoes: string | null;
  valor_cobrado: number;
  custo: number;
  status: string;
  arquivado: boolean;
  user_id: number;
  deleted_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

/**
 * Dados necessários para criar um cliente
 */
export interface CreateClienteData {
  name: string;
  vencimento?: Date | null;
  servico: string;
  whatsapp?: string | null;
  observacoes?: string | null;
  valor_cobrado?: number;
  custo?: number;
  user_id: number;
}

/**
 * Dados para atualizar um cliente
 */
export interface UpdateClienteData {
  id: number;
  user_id: number;
  name?: string;
  vencimento?: Date | null;
  servico?: string;
  whatsapp?: string | null;
  observacoes?: string | null;
  valor_cobrado?: number;
  custo?: number;
  status?: string;
}

/**
 * Filtros para listagem de clientes
 */
export interface ClienteFilters {
  page?: number;
  limit?: number;
  status?: 'vencidos' | 'vence3' | 'emdias' | string;
  search?: string;
  showArchived?: boolean;
}

/**
 * Status possíveis de um cliente
 */
export enum ClienteStatus {
  NAO_PAGOU = 'Não pagou',
  COBRANCA_FEITA = 'cobrança feita',
  PAG_EM_DIAS = 'Pag. em dias',
}
