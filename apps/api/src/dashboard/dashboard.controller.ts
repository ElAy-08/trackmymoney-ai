import { Controller, Get, Query } from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';
import { ByCategoryQueryDto } from './dto/by-category-query.dto.js';
import { MonthlyQueryDto } from './dto/monthly-query.dto.js';
import { StatsPeriodQueryDto } from './dto/stats-period-query.dto.js';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  summary(
    @CurrentUser() user: AuthUser,
    @Query() query: StatsPeriodQueryDto,
  ) {
    return this.dashboard.summary(user.id, query);
  }

  @Get('by-category')
  byCategory(
    @CurrentUser() user: AuthUser,
    @Query() query: ByCategoryQueryDto,
  ) {
    return this.dashboard.byCategory(user.id, query);
  }

  @Get('monthly')
  monthly(@CurrentUser() user: AuthUser, @Query() query: MonthlyQueryDto) {
    return this.dashboard.monthly(user.id, query);
  }
}