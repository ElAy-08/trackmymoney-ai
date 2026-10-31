import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { TransactionType } from '../../generated/prisma/client.js';

export class CreateCategoryDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @IsEnum(TransactionType)
  type!: TransactionType;

  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, {
    message: 'color must be a hex value like #4f46e5',
  })
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  icon?: string;
}