import { IsString, IsEmail, MinLength, MaxLength, Matches } from 'class-validator';

/**
 * DTO para registro de novo usuário
 */
export class RegisterDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  @Matches(/^[a-zA-ZÀ-ÿ\s]+$/, { message: 'Nome deve conter apenas letras' })
  name!: string;

  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(12, { message: 'Senha deve ter no mínimo 12 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais (@$!%*?&)'
  })
  password!: string;
}
