import { IsString, IsEmail, MinLength, Matches } from 'class-validator';

/**
 * DTO para primeiro login (validação com recovery code)
 */
export class FirstLoginDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString({ message: 'Senha deve ser uma string' })
  @MinLength(1, { message: 'Senha é obrigatória' })
  password!: string;

  @IsString({ message: 'Código de recuperação deve ser uma string' })
  @MinLength(1, { message: 'Código de recuperação é obrigatório' })
  @Matches(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
    message: 'Formato de código de recuperação inválido. Use o formato XXXX-XXXX-XXXX-XXXX'
  })
  recoveryCode!: string;
}
