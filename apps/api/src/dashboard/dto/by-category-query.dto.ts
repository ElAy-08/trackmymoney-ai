import { IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '../../generated/prisma/enums.js';
import { StatsPeriodQueryDto } from './stats-period-query.dto.js';

export class ByCategoryQueryDto extends StatsPeriodQueryDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type: TransactionType = TransactionType.EXPENSE;
}