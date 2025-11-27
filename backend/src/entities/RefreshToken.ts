/**
 * Entity: RefreshToken
 *
 * Representa um refresh token JWT para renovação automática
 * Tabela: refresh_tokens
 */

export interface RefreshToken {
  id: number;
  user_id: number;
  token_hash: string; // Hash SHA-256 do token
  expires_at: Date;
  created_at: Date;
  revoked: boolean;
  revoked_at: Date | null;
}

/**
 * Dados necessários para criar um refresh token
 */
export interface CreateRefreshTokenData {
  user_id: number;
  token_hash: string;
  expires_at: Date;
}

/**
 * Dados para atualizar um refresh token (revogar)
 */
export interface UpdateRefreshTokenData {
  id: number;
  revoked: boolean;
  revoked_at: Date;
}
