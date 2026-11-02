import { IsOptional, IsUUID } from 'class-validator';
import { IsCalendarDay } from '../../common/is-calendar-day.decorator.js';

export class StatsPeriodQueryDto {
  @IsOptional()
  @IsCalendarDay()
  from?: string;

  @IsOptional()
  @IsCalendarDay()
  to?: string;

  @IsOptional()
  @IsUUID()
  accountId?: string;
}