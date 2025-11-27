import { Pool, RowDataPacket, ResultSetHeader } from 'mysql2/promise';
import { RefreshToken } from '../entities/RefreshToken';

/**
 * Dados para criação de refresh token
 */
export interface CreateRefreshTokenData {
  user_id: number;
  token_hash: string;
  expires_at: Date;
}

/**
 * Repository para acesso a dados de refresh tokens
 * Encapsula todas as queries relacionadas à tabela refresh_tokens
 */
export class RefreshTokenRepository {
  constructor(private db: Pool) {}

  /**
   * Cria novo refresh token
   * @param data Dados do refresh token
   * @returns ID do token criado
   */
  async create(data: CreateRefreshTokenData): Promise<number> {
    const [result] = await this.db.query<ResultSetHeader>(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, revoked)
       VALUES (?, ?, ?, FALSE)`,
      [data.user_id, data.token_hash, data.expires_at]
    );

    return result.insertId;
  }

  /**
   * Busca refresh token por hash
   * @param tokenHash Hash do token
   * @returns RefreshToken ou null se não encontrado
   */
  async findByTokenHash(tokenHash: string): Promise<RefreshToken | null> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT * FROM refresh_tokens WHERE token_hash = ?',
      [tokenHash]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as RefreshToken;
  }

  /**
   * Busca refresh token por ID
   * @param id ID do token
   * @returns RefreshToken ou null se não encontrado
   */
  async findById(id: number): Promise<RefreshToken | null> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT * FROM refresh_tokens WHERE id = ?',
      [id]
    );

    if (rows.length === 0) {
      return null;
    }

    return rows[0] as RefreshToken;
  }

  /**
   * Revoga um refresh token específico
   * @param tokenHash Hash do token a revogar
   */
  async revoke(tokenHash: string): Promise<void> {
    await this.db.query(
      'UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE token_hash = ?',
      [tokenHash]
    );
  }

  /**
   * Revoga todos os refresh tokens de um usuário
   * @param userId ID do usuário
   */
  async revokeAllUserTokens(userId: number): Promise<void> {
    await this.db.query(
      'UPDATE refresh_tokens SET revoked = TRUE, revoked_at = NOW() WHERE user_id = ? AND revoked = FALSE',
      [userId]
    );
  }

  /**
   * Remove tokens expirados do banco de dados
   * @returns Número de tokens removidos
   */
  async cleanupExpired(): Promise<number> {
    const [result] = await this.db.query<ResultSetHeader>(
      'DELETE FROM refresh_tokens WHERE expires_at < NOW() OR (revoked = TRUE AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY))'
    );

    return result.affectedRows;
  }

  /**
   * Busca todos os tokens ativos de um usuário
   * @param userId ID do usuário
   * @returns Array de refresh tokens ativos
   */
  async findActiveTokensByUser(userId: number): Promise<RefreshToken[]> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT * FROM refresh_tokens WHERE user_id = ? AND revoked = FALSE AND expires_at > NOW() ORDER BY created_at DESC',
      [userId]
    );

    return rows as RefreshToken[];
  }

  /**
   * Conta quantos tokens ativos um usuário possui
   * @param userId ID do usuário
   * @returns Número de tokens ativos
   */
  async countActiveTokensByUser(userId: number): Promise<number> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM refresh_tokens WHERE user_id = ? AND revoked = FALSE AND expires_at > NOW()',
      [userId]
    );

    return rows[0]?.count || 0;
  }

  /**
   * Verifica se um token é válido (não revogado e não expirado)
   * @param tokenHash Hash do token
   * @returns true se token é válido
   */
  async isTokenValid(tokenHash: string): Promise<boolean> {
    const [rows] = await this.db.query<RowDataPacket[]>(
      'SELECT COUNT(*) as count FROM refresh_tokens WHERE token_hash = ? AND revoked = FALSE AND expires_at > NOW()',
      [tokenHash]
    );

    const count = rows[0]?.count || 0;
    return count > 0;
  }

  /**
   * Remove tokens muito antigos de forma permanente (limpeza de manutenção)
   * @param daysOld Número de dias para considerar "muito antigo"
   * @returns Número de tokens removidos
   */
  async deleteOldTokens(daysOld: number = 90): Promise<number> {
    const [result] = await this.db.query<ResultSetHeader>(
      'DELETE FROM refresh_tokens WHERE created_at < DATE_SUB(NOW(), INTERVAL ? DAY)',
      [daysOld]
    );

    return result.affectedRows;
  }
}
