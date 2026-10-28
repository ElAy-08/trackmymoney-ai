import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAccountDto {
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(-2_000_000_000)
  @Max(2_000_000_000)
  openingBalanceCents?: number;
}   