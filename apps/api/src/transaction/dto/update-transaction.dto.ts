import { Transform } from 'class-transformer';
import {
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { IsCalendarDay } from '../../common/is-calendar-day.decorator.js';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

// Every field is optional, but a field that IS sent must be valid.
// ValidateIf is used instead of IsOptional, because IsOptional also lets
// `null` through, and null would crash the database update for required columns.
export class UpdateTransactionDto {
  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  accountId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsUUID()
  categoryId?: string;

  @ValidateIf((_, value) => value !== undefined)
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  amountCents?: number;

  @ValidateIf((_, value) => value !== undefined)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  description?: string;

  // Send null to clear the merchant.
  @ValidateIf((_, value) => value !== undefined && value !== null)
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  merchant?: string | null;

  @ValidateIf((_, value) => value !== undefined)
  @IsCalendarDay()
  date?: string;
}