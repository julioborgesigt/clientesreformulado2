/**
 * Extensões de tipos do Express
 *
 * Permite adicionar propriedades customizadas aos objetos Request do Express
 */

import { Request } from 'express';

/**
 * Dados do usuário autenticado (extraídos do JWT)
 */
export interface UserData {
  id: number;
  email: string;
  name: string;
  role?: string;
}

/**
 * Estende o namespace Express para adicionar userData ao Request
 */
declare global {
  namespace Express {
    interface Request {
      /**
       * Dados do usuário autenticado
       * Definido pelo authMiddleware após validação do JWT
       */
      userData?: UserData;
    }
  }
}

// Necessário para que o módulo seja tratado como um módulo TypeScript
export {};
