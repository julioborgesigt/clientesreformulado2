import { IsString, MinLength } from 'class-validator';

/**
 * DTO para renovação de token
 */
export class RefreshTokenDto {
  @IsString({ message: 'Refresh token deve ser uma string' })
  @MinLength(1, { message: 'Refresh token é obrigatório' })
  refreshToken!: string;
}
