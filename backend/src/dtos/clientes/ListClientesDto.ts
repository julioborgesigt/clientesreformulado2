import { IsOptional, IsString, IsInt, IsBoolean, Min } from 'class-validator';
import { Transform } from 'class-transformer';

/**
 * DTO para listagem de clientes (query parameters)
 *
 * Define filtros e paginação para a rota GET /clientes/list
 */
export class ListClientesDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Página deve ser um número inteiro' })
  @Min(1, { message: 'Página deve ser maior que 0' })
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt({ message: 'Limit deve ser um número inteiro' })
  limit?: number;

  @IsOptional()
  @IsString({ message: 'Status deve ser uma string' })
  status?: 'vencidos' | 'vence3' | 'emdias' | string;

  @IsOptional()
  @IsString({ message: 'Search deve ser uma string' })
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean({ message: 'ShowArchived deve ser boolean' })
  showArchived?: boolean = false;
}
