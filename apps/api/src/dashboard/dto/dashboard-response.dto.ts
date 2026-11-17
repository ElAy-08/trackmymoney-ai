import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '../../generated/prisma/enums.js';

export class PeriodDto {
  /** Calendar day in YYYY-MM-DD format. */
  from!: string;

  /** Calendar day in YYYY-MM-DD format. */
  to!: string;
}

export class AccountBalanceDto {
  accountId!: string;
  name!: string;
  currency!: string;
  balanceCents!: number;
}

export class SummaryResponseDto {
  period!: PeriodDto;
  incomeCents!: number;
  expenseCents!: number;
  netCents!: number;
  transactionCount!: number;
  balances!: AccountBalanceDto[];
}

export class CategoryTotalDto {
  categoryId!: string;
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  color!: string | null;

  totalCents!: number;
  count!: number;
  percentage!: number;
}

export class ByCategoryResponseDto {
  period!: PeriodDto;

  @ApiProperty({ enum: TransactionType, enumName: 'TransactionType' })
  type!: TransactionType;

  totalCents!: number;
  items!: CategoryTotalDto[];
}

export class MonthlyTotalDto {
  /** Month in YYYY-MM format. */
  month!: string;
  incomeCents!: number;
  expenseCents!: number;
}

export class MonthlyResponseDto {
  months!: MonthlyTotalDto[];
}
