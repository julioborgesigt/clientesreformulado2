import { IsString, IsOptional, IsISO8601, IsNumber, MinLength, MaxLength, Matches, Min } from 'class-validator';

/**
 * DTO para criação de cliente
 *
 * Valida os dados de entrada ao criar um novo cliente
 */
export class CreateClienteDto {
  @IsString({ message: 'Nome deve ser uma string' })
  @MinLength(2, { message: 'Nome deve ter no mínimo 2 caracteres' })
  @MaxLength(100, { message: 'Nome deve ter no máximo 100 caracteres' })
  name!: string;

  @IsOptional()
  @IsISO8601({}, { message: 'Data de vencimento inválida (use formato ISO8601)' })
  vencimento?: string;

  @IsString({ message: 'Serviço deve ser uma string' })
  @MinLength(1, { message: 'Serviço é obrigatório' })
  servico!: string;

  @IsOptional()
  @IsString({ message: 'WhatsApp deve ser uma string' })
  @Matches(/^[0-9]{10,15}$/, { message: 'WhatsApp deve conter 10-15 dígitos' })
  whatsapp?: string;

  @IsOptional()
  @IsString({ message: 'Observações devem ser uma string' })
  observacoes?: string;

  @IsOptional()
  @IsNumber({}, { message: 'Valor cobrado deve ser um número' })
  @Min(0, { message: 'Valor cobrado deve ser positivo' })
  valor_cobrado?: number;

  @IsOptional()
  @IsNumber({}, { message: 'Custo deve ser um número' })
  @Min(0, { message: 'Custo deve ser positivo' })
  custo?: number;
}
