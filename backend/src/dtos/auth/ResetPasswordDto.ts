import { IsString, IsEmail, MinLength, Matches } from 'class-validator';

/**
 * DTO para reset de senha com recovery code
 */
export class ResetPasswordDto {
  @IsEmail({}, { message: 'Email inválido' })
  email!: string;

  @IsString({ message: 'Código de recuperação deve ser uma string' })
  @MinLength(1, { message: 'Código de recuperação é obrigatório' })
  @Matches(/^[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
    message: 'Formato de código de recuperação inválido'
  })
  recoveryCode!: string;

  @IsString({ message: 'Nova senha deve ser uma string' })
  @MinLength(12, { message: 'Nova senha deve ter no mínimo 12 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Nova senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais (@$!%*?&)'
  })
  newPassword!: string;
}
