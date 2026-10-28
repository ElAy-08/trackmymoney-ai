import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AccountService } from './account.service.js';
import { AccountController } from './account.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [AccountService],
  exports: [AccountService],
  controllers: [AccountController]
})
export class AccountModule {}
