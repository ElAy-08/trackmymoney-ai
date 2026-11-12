import { Controller, Get, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { DashboardService } from './dashboard.service.js';
import { ByCategoryQueryDto } from './dto/by-category-query.dto.js';
import { MonthlyQueryDto } from './dto/monthly-query.dto.js';
import { StatsPeriodQueryDto } from './dto/stats-period-query.dto.js';

@Controller('dashboard')
@ApiTags('dashboard')
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Get dashboard summary' })
  @ApiBadRequestResponse({ description: 'The query parameters or date range are invalid.' })
  @ApiNotFoundResponse({ description: 'The account was not found.' })
  summary(
    @CurrentUser() user: AuthUser,
    @Query() query: StatsPeriodQueryDto,
  ) {
    return this.dashboard.summary(user.id, query);
  }

  @Get('by-category')
  @ApiOperation({ summary: 'Get transaction totals by category' })
  @ApiBadRequestResponse({ description: 'The query parameters or date range are invalid.' })
  @ApiNotFoundResponse({ description: 'The account was not found.' })
  byCategory(
    @CurrentUser() user: AuthUser,
    @Query() query: ByCategoryQueryDto,
  ) {
    return this.dashboard.byCategory(user.id, query);
  }

  @Get('monthly')
  @ApiOperation({ summary: 'Get monthly income and expense totals' })
  @ApiBadRequestResponse({ description: 'The query parameters are invalid.' })
  @ApiNotFoundResponse({ description: 'The account was not found.' })
  monthly(@CurrentUser() user: AuthUser, @Query() query: MonthlyQueryDto) {
    return this.dashboard.monthly(user.id, query);
  }
}