import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';

@Module({
  imports: [PrismaModule, AccountModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}