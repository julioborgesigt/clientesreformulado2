import { IsString, IsEmail, MinLength } from 'class-validator';

/**
 * DTO para login de usuário
 */
export class LoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(1, { message: 'Senha é obrigatória' })
  password!: string;
}
