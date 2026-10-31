import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '../../generated/prisma/client.js';

export class ListCategoriesQueryDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  // Query strings are always text, so "true" has to be converted to a boolean.
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  includeArchived?: boolean;
}