import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { IsCalendarDay } from '../../common/is-calendar-day.decorator.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateTransactionDto {
  @IsUUID()
  accountId!: string;

  @IsUUID()
  categoryId!: string;

  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  amountCents!: number;

  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  merchant?: string;

  @IsCalendarDay()
  date!: string;
}