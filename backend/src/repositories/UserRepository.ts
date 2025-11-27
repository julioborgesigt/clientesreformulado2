import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { User } from '../entities/User';

/**
 * Dados para criação de usuário
 */
export interface CreateUserData {
  name: string;
  email: string;
  password: string;
  role?: string;
  recovery_code: string;
}

/**
 * Dados para atualização de usuário
 */
export interface UpdateUserData {
  id: number;
  name?: string;
  email?: string;
  role?: string;
}

/**
 * Repository para acesso a dados de usuários
 * Encapsula todas as queries relacionadas à tabela users
 */
export class UserRepository {
  constructor(private db: Pool) {}

  /**
   * Busca usuário por email
   * @param email Email do usuário
   * @returns User ou null se não encontrado
   */
  async findByEmail(email: string): Promise<User | null> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as User;
  }

  /**
   * Busca usuário por ID
   * @param id ID do usuário
   * @returns User ou null se não encontrado
   */
  async findById(id: number): Promise<User | null> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT * FROM users WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as User;
  }

  /**
   * Cria novo usuário
   * @param data Dados do usuário
   * @returns ID do usuário criado
   */
  async create(data: CreateUserData): Promise<number> {
    const [result] = await this.db.query<ResultSetHeader>(
      `INSERT INTO users (name, email, password, role, recovery_code, recovery_code_created_at, first_login_completed)
       VALUES (?, ?, ?, ?, ?, NOW(), FALSE)`,
      [
        data.name,
        data.email,
        data.password,
        data.role || 'user',
        data.recovery_code
      ]
    );

    return result.insertId;
  }

  /**
   * Atualiza dados do usuário (exceto senha)
   * @param data Dados para atualização
   */
  async update(data: UpdateUserData): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (data.name !== undefined) {
      fields.push('name = ?');
      values.push(data.name);
    }

    if (data.email !== undefined) {
      fields.push('email = ?');
      values.push(data.email);
    }

    if (data.role !== undefined) {
      fields.push('role = ?');
      values.push(data.role);
    }

    if (fields.length === 0) {
      return; // Nada para atualizar
    }

    fields.push('updated_at = NOW()');
    values.push(data.id);

    const query = `UPDATE users SET ${fields.join(', ')} WHERE id = ?`;
    await this.db.query(query, values);
  }

  /**
   * Atualiza senha do usuário
   * @param id ID do usuário
   * @param hashedPassword Senha já hasheada
   */
  async updatePassword(id: number, hashedPassword: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET password = ?, updated_at = NOW() WHERE id = ?',
      [hashedPassword, id]
    );
  }

  /**
   * Marca primeiro login como completo
   * @param id ID do usuário
   */
  async markFirstLoginCompleted(id: number): Promise<void> {
    await this.db.query(
      'UPDATE users SET first_login_completed = TRUE, updated_at = NOW() WHERE id = ?',
      [id]
    );
  }

  /**
   * Atualiza recovery code do usuário
   * @param id ID do usuário
   * @param recoveryCode Novo recovery code
   */
  async updateRecoveryCode(id: number, recoveryCode: string): Promise<void> {
    await this.db.query(
      'UPDATE users SET recovery_code = ?, recovery_code_created_at = NOW(), updated_at = NOW() WHERE id = ?',
      [recoveryCode, id]
    );
  }

  /**
   * Verifica se email já está em uso
   * @param email Email a verificar
   * @param excludeUserId ID do usuário a excluir da verificação (para updates)
   * @returns true se email já existe
   */
  async emailExists(email: string, excludeUserId?: number): Promise<boolean> {
    let query = 'SELECT COUNT(*) as count FROM users WHERE email = ?';
    const params: any[] = [email];

    if (excludeUserId) {
      query += ' AND id != ?';
      params.push(excludeUserId);
    }

    const [rows] = await this.db.query<RowDataPacket[]>(query, params);
    const count = rows[0]?.count || 0;

    return count > 0;
  }

  /**
   * Lista todos os usuários (para admin)
   * @returns Array de usuários
   */
  async findAll(): Promise<User[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT * FROM users ORDER BY created_at DESC'
    );

    return rows as User[];
  }

  /**
   * Conta total de usuários
   * @returns Total de usuários
   */
  async count(): Promise<number> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as total FROM users'
    );

    return rows[0]?.total || 0;
  }
}
