import { ApiProperty } from '@nestjs/swagger';
import {
  TransactionSource,
  TransactionType,
} from '../../generated/prisma/enums.js';

export class TransactionCategorySummaryDto {
  id!: string;
  name!: string;

  @ApiProperty({ type: String, nullable: true })
  color!: string | null;

  @ApiProperty({ type: String, nullable: true })
  icon!: string | null;
}

export class TransactionAccountSummaryDto {
  id!: string;
  name!: string;
}

export class TransactionResponseDto {
  id!: string;
  userId!: string;
  accountId!: string;
  categoryId!: string;

  @ApiProperty({ enum: TransactionType, enumName: 'TransactionType' })
  type!: TransactionType;

  /** in cents, always positive; type tells income or expense */
  amountCents!: number;
  description!: string;

  @ApiProperty({ type: String, nullable: true })
  merchant!: string | null;

  /** a plain day; ignore the time part */
  date!: Date;

  @ApiProperty({ enum: TransactionSource, enumName: 'TransactionSource' })
  source!: TransactionSource;

  createdAt!: Date;
  updatedAt!: Date;
  category!: TransactionCategorySummaryDto;
  account!: TransactionAccountSummaryDto;
}

export class PaginatedTransactionsResponseDto {
  items!: TransactionResponseDto[];
  total!: number;
  page!: number;
  pageSize!: number;
  totalPages!: number;
}
