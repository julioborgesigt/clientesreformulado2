/**
 * Tipos comuns utilizados em toda a aplicação
 */

/**
 * Resposta de erro padronizada
 */
export interface ErrorResponse {
  error: string;
  details?: any;
  statusCode?: number;
}

/**
 * Resposta de sucesso padronizada
 */
export interface SuccessResponse<T = any> {
  message?: string;
  data?: T;
  statusCode?: number;
}

/**
 * Resposta de listagem paginada
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages?: number;
}

/**
 * Parâmetros de paginação
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Tipos de ação para o log de auditoria
 */
export enum ActionType {
  CREATE_CLIENT = 'CREATE_CLIENT',
  UPDATE_CLIENT = 'UPDATE_CLIENT',
  DELETE_CLIENT = 'DELETE_CLIENT',
  CHANGE_STATUS = 'CHANGE_STATUS',
  ADJUST_DATE = 'ADJUST_DATE',
  ARCHIVE_CLIENT = 'ARCHIVE_CLIENT',
  UNARCHIVE_CLIENT = 'UNARCHIVE_CLIENT',
  REVERT_ACTION = 'REVERT_ACTION',
  UPDATE_CONFIG = 'UPDATE_CONFIG',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  REGISTER = 'REGISTER',
  CHANGE_PASSWORD = 'CHANGE_PASSWORD',
  RESET_PASSWORD = 'RESET_PASSWORD'
}

/**
 * Entrada para o log de ação
 */
export interface ActionLogEntry {
  action_type: ActionType | string;
  client_id?: number | null;
  details: string;
  user_id: number;
  revertable?: boolean;
  original_data?: any;
}

/**
 * Log de ação completo (como retornado do banco)
 */
export interface ActionLog extends ActionLogEntry {
  id: number;
  timestamp: Date;
  reverted: boolean;
  client_name?: string;
}

/**
 * Unidades de tempo para ajuste de datas
 */
export type TimeUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';

/**
 * Status de pagamento de clientes
 */
export enum PaymentStatus {
  NAO_PAGOU = 'Não pagou',
  COBRANCA_FEITA = 'cobrança feita',
  PAG_EM_DIAS = 'Pag. em dias'
}

/**
 * Configuração de mensagens WhatsApp
 */
export interface WhatsAppConfig {
  id: number;
  whatsapp_message: string | null;
  whatsapp_message_vencido: string | null;
}

/**
 * Estatísticas do dashboard
 */
export interface DashboardStats {
  custoTotal: number;
  valorApurado: number;
  lucro: number;
  previsto: number;
  totalClientes: number;
  vencidos: number;
  vence3: number;
  emdias: number;
}

/**
 * Dados de gráfico (genérico)
 */
export interface ChartData {
  labels: string[];
  data: number[];
}

/**
 * Opções de ordenação
 */
export interface SortOptions {
  field: string;
  order: 'ASC' | 'DESC';
}

/**
 * Filtros genéricos de busca
 */
export interface SearchFilters {
  search?: string;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
  startDate?: Date;
  endDate?: Date;
}

/**
 * Resultado de operação (sucesso/falha)
 */
export interface OperationResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}

/**
 * Token JWT payload
 */
export interface JwtPayload {
  id: number;
  email: string;
  name: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * Tokens de autenticação
 */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Resposta de login
 */
export interface LoginResponse extends AuthTokens {
  message: string;
}

/**
 * Dados de registro de usuário
 */
export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

/**
 * Resposta de registro (com recovery code)
 */
export interface RegisterResponse {
  message: string;
  recoveryCode: string;
  warning: {
    title: string;
    message: string;
    code: string;
    instructions: string[];
  };
}

/**
 * Tipo utilitário para tornar propriedades opcionais
 */
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Tipo utilitário para tornar propriedades obrigatórias
 */
export type Required<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: T[P] };

/**
 * Tipo para remover null e undefined
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Tipo para resultados de queries do banco (mysql2)
 */
export interface DatabaseResult {
  affectedRows: number;
  insertId: number;
  warningStatus: number;
}
