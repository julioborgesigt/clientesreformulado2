import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { Cliente, CreateClienteData, UpdateClienteData, ClienteFilters } from '../entities/Cliente';

/**
 * Repository: ClienteRepository
 *
 * Responsável por todas as operações de banco de dados relacionadas a clientes
 */
export class ClienteRepository {
  constructor(private db: Pool) {}

  /**
   * Lista todos os clientes com filtros e paginação
   */
  async findAll(userId: number, filters: ClienteFilters = {}): Promise<{ clientes: Cliente[]; total: number }> {
    const {
      page = 1,
      limit = 999999,
      status = '',
      search = '',
      showArchived = false
    } = filters;

    const effectiveLimit = (!limit || limit === -1 || isNaN(limit)) ? 999999 : limit;
    const offset = (page - 1) * effectiveLimit;

    const today = new Date().toISOString().split('T')[0];
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);
    const threeDaysLater = threeDays.toISOString().split('T')[0];

    const whereClauses: string[] = [];
    const params: any[] = [];

    // Filtro obrigatório por user_id
    whereClauses.push('user_id = ?');
    params.push(userId);

    // Exclui clientes soft deleted
    whereClauses.push('deleted_at IS NULL');

    // Filtro de arquivamento
    if (showArchived) {
      whereClauses.push('arquivado = TRUE');
    } else {
      whereClauses.push('arquivado = FALSE');
    }

    // Filtro de busca por nome
    if (search) {
      whereClauses.push('name LIKE ?');
      params.push(`%${search}%`);
    }

    // Filtro de status
    if (status === 'vencidos') {
      whereClauses.push('vencimento < ?');
      params.push(today);
    } else if (status === 'vence3') {
      whereClauses.push('vencimento >= ? AND vencimento <= ?');
      params.push(today, threeDaysLater);
    } else if (status === 'emdias') {
      whereClauses.push('vencimento > ?');
      params.push(threeDaysLater);
    }

    const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Query de dados
    const dataQuery = `SELECT * FROM clientes ${whereString} ORDER BY vencimento ASC LIMIT ? OFFSET ?`;
    const dataParams = [...params, effectiveLimit, offset];

    // Query de contagem
    const countQuery = `SELECT COUNT(*) as totalCount FROM clientes ${whereString}`;
    const countParams = [...params];

    const [[countResults], [dataResults]] = await Promise.all([
      this.db.query<RowDataPacket[]>(countQuery, countParams),
      this.db.query<RowDataPacket[]>(dataQuery, dataParams)
    ]);

    const totalCount = countResults[0]?.totalCount || 0;

    return {
      clientes: dataResults as Cliente[],
      total: totalCount
    };
  }

  /**
   * Busca um cliente por ID
   */
  async findById(id: number, userId: number): Promise<Cliente | null> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT * FROM clientes WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
    return rows.length > 0 ? (rows[0] as Cliente) : null;
  }

  /**
   * Cria um novo cliente
   */
  async create(data: CreateClienteData): Promise<number> {
    const [result] = await this.db.query<ResultSetHeader>(
      'INSERT INTO clientes (name, vencimento, servico, whatsapp, observacoes, valor_cobrado, custo, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        data.name,
        data.vencimento || null,
        data.servico,
        data.whatsapp || null,
        data.observacoes || null,
        data.valor_cobrado,
        data.custo,
        data.user_id
      ]
    );
    return result.insertId;
  }

  /**
   * Atualiza um cliente existente
   */
  async update(data: UpdateClienteData): Promise<void> {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      setClauses.push('name = ?');
      params.push(data.name);
    }
    if (data.vencimento !== undefined) {
      setClauses.push('vencimento = ?');
      params.push(data.vencimento);
    }
    if (data.servico !== undefined) {
      setClauses.push('servico = ?');
      params.push(data.servico);
    }
    if (data.whatsapp !== undefined) {
      setClauses.push('whatsapp = ?');
      params.push(data.whatsapp);
    }
    if (data.observacoes !== undefined) {
      setClauses.push('observacoes = ?');
      params.push(data.observacoes);
    }
    if (data.valor_cobrado !== undefined) {
      setClauses.push('valor_cobrado = ?');
      params.push(data.valor_cobrado);
    }
    if (data.custo !== undefined) {
      setClauses.push('custo = ?');
      params.push(data.custo);
    }
    if (data.status !== undefined) {
      setClauses.push('status = ?');
      params.push(data.status);
    }

    if (setClauses.length === 0) {
      return; // Nada para atualizar
    }

    params.push(data.id, data.user_id);

    const query = `UPDATE clientes SET ${setClauses.join(', ')} WHERE id = ? AND user_id = ? AND deleted_at IS NULL`;

    await this.db.query(query, params);
  }

  /**
   * Soft delete de um cliente
   */
  async softDelete(id: number, userId: number): Promise<void> {
    await this.db.query(
      'UPDATE clientes SET deleted_at = NOW() WHERE id = ? AND user_id = ?',
      [id, userId]
    );
  }

  /**
   * Atualiza o status de um cliente
   */
  async updateStatus(id: number, userId: number, status: string): Promise<void> {
    await this.db.query(
      'UPDATE clientes SET status = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [status, id, userId]
    );
  }

  /**
   * Ajusta a data de vencimento de um cliente
   */
  async adjustDate(id: number, userId: number, intervalValue: number, unit: 'DAY' | 'MONTH'): Promise<void> {
    const query = `UPDATE clientes SET vencimento = DATE_ADD(vencimento, INTERVAL ? ${unit}) WHERE id = ? AND user_id = ? AND deleted_at IS NULL`;
    await this.db.query(query, [intervalValue, id, userId]);
  }

  /**
   * Busca a data de vencimento de um cliente
   */
  async getVencimento(id: number, userId: number): Promise<Date | null> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT vencimento FROM clientes WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
    return rows.length > 0 && rows[0] ? rows[0].vencimento : null;
  }

  /**
   * Arquiva um cliente
   */
  async archive(id: number, userId: number): Promise<void> {
    await this.db.query(
      'UPDATE clientes SET arquivado = TRUE WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
  }

  /**
   * Desarquiva um cliente
   */
  async unarchive(id: number, userId: number): Promise<void> {
    await this.db.query(
      'UPDATE clientes SET arquivado = FALSE WHERE id = ? AND user_id = ? AND deleted_at IS NULL',
      [id, userId]
    );
  }

  /**
   * Busca estatísticas do dashboard
   */
  async getDashboardStats(userId: number): Promise<any> {
    const today = new Date().toISOString().slice(0, 10);
    const threeDays = new Date();
    threeDays.setDate(threeDays.getDate() + 3);
    const threeDaysLater = threeDays.toISOString().slice(0, 10);

    const query = `
      SELECT
        SUM(custo) as custoTotal,
        SUM(CASE WHEN status != 'Não pagou' THEN valor_cobrado ELSE 0 END) as valorApurado,
        SUM(CASE WHEN status != 'Não pagou' THEN valor_cobrado - custo ELSE 0 END) as lucro,
        SUM(CASE
              WHEN
                status != 'Não pagou'
                AND MONTH(vencimento) = MONTH(CURRENT_DATE())
                AND YEAR(vencimento) = YEAR(CURRENT_DATE())
              THEN valor_cobrado
              ELSE 0
          END) as previsto,
        COUNT(*) as totalClientes,
        SUM(CASE WHEN vencimento < ? THEN 1 ELSE 0 END) as vencidos,
        SUM(CASE WHEN vencimento >= ? AND vencimento <= ? THEN 1 ELSE 0 END) as vence3,
        SUM(CASE WHEN vencimento > ? THEN 1 ELSE 0 END) as emdias
      FROM clientes
      WHERE user_id = ? AND arquivado = FALSE;
    `;

    const [rows] = await this.db.query<RowDataPacket[]>(query, [today, today, threeDaysLater, threeDaysLater, userId]);
    return rows[0] || {
      custoTotal: 0,
      valorApurado: 0,
      lucro: 0,
      previsto: 0,
      totalClientes: 0,
      vencidos: 0,
      vence3: 0,
      emdias: 0
    };
  }

  /**
   * Busca pagamentos por dia do mês
   */
  async getPaymentsByDay(userId: number): Promise<number[]> {
    const query = `
      SELECT DAY(vencimento) AS day, COUNT(*) AS count
      FROM clientes
      WHERE vencimento IS NOT NULL AND arquivado = FALSE AND user_id = ?
      GROUP BY DAY(vencimento) ORDER BY day
    `;

    const [results] = await this.db.query<RowDataPacket[]>(query, [userId]);

    const payments = Array(31).fill(0);
    results.forEach((row: any) => {
      if (row.day >= 1 && row.day <= 31) {
        payments[row.day - 1] = row.count;
      }
    });

    return payments;
  }

  /**
   * Busca estatísticas por serviço
   */
  async getStatsByService(userId: number): Promise<{ labels: string[]; data: number[] }> {
    const query = `
      SELECT servico, COUNT(*) as count
      FROM clientes
      WHERE servico IS NOT NULL AND servico != '' AND arquivado = FALSE AND user_id = ?
      GROUP BY servico
      ORDER BY count DESC
    `;

    const [results] = await this.db.query<RowDataPacket[]>(query, [userId]);

    const labels = results.map((row: any) => row.servico);
    const data = results.map((row: any) => row.count);

    return { labels, data };
  }

  /**
   * Busca clientes com vencimento próximo (alertas)
   */
  async getAlertsClientes(userId: number): Promise<Cliente[]> {
    const today = new Date();
    const threeDaysLater = new Date(today);
    threeDaysLater.setDate(today.getDate() + 3);

    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT * FROM clientes WHERE vencimento BETWEEN ? AND ? AND arquivado = FALSE AND user_id = ? AND deleted_at IS NULL',
      [today.toISOString().slice(0, 10), threeDaysLater.toISOString().slice(0, 10), userId]
    );

    return rows as Cliente[];
  }

  /**
   * Busca clientes pendentes do mês atual
   */
  async getPendingThisMonth(userId: number): Promise<Cliente[]> {
    const query = `
      SELECT id, name, vencimento, valor_cobrado, status
      FROM clientes
      WHERE
        status != 'Não pagou'
        AND MONTH(vencimento) = MONTH(CURRENT_DATE())
        AND YEAR(vencimento) = YEAR(CURRENT_DATE())
        AND arquivado = FALSE
        AND user_id = ?
      ORDER BY vencimento ASC;
    `;

    const [rows] = await this.db.query<RowDataPacket[]>(query, [userId]);
    return rows as Cliente[];
  }
}
