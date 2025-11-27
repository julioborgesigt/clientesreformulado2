import { IsString, MinLength, Matches } from 'class-validator';

/**
 * DTO para alteração de senha (usuário autenticado)
 */
export class ChangePasswordDto {
  @IsString({ message: 'Senha atual deve ser uma string' })
  @MinLength(1, { message: 'Senha atual é obrigatória' })
  currentPassword!: string;

  @IsString({ message: 'Nova senha deve ser uma string' })
  @MinLength(12, { message: 'Nova senha deve ter no mínimo 12 caracteres' })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, {
    message: 'Nova senha deve conter letras maiúsculas, minúsculas, números e caracteres especiais (@$!%*?&)'
  })
  newPassword!: string;
}
