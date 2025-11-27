/**
 * Entity: User
 *
 * Representa um usuário do sistema
 * Tabela: users
 */

export interface User {
  id: number;
  name: string;
  email: string;
  password: string; // Hash bcrypt
  role?: string;
  recovery_code: string; // Hash do código de recuperação
  recovery_code_created_at: Date;
  first_login_completed: boolean;
  created_at: Date;
  updated_at: Date;
}

/**
 * Dados necessários para criar um usuário
 */
export interface CreateUserData {
  name: string;
  email: string;
  password: string; // Já deve vir hasheado
  recovery_code: string; // Já deve vir hasheado
  first_login_completed?: boolean;
}

/**
 * Dados para atualizar um usuário
 */
export interface UpdateUserData {
  id: number;
  name?: string;
  email?: string;
  password?: string; // Já deve vir hasheado
  role?: string;
  first_login_completed?: boolean;
}

/**
 * User sem informações sensíveis (para retornar em APIs)
 */
export interface SafeUser {
  id: number;
  name: string;
  email: string;
  role?: string;
  created_at: Date;
}

/**
 * Converte User para SafeUser (remove password e recovery_code)
 */
export function toSafeUser(user: User): SafeUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    created_at: user.created_at
  };
}
