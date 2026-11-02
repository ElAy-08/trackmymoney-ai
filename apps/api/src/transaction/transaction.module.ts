import { Module } from '@nestjs/common';
import { AccountModule } from '../account/account.module.js';
import { CategoryModule } from '../category/category.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TransactionController } from './transaction.controller.js';
import { TransactionService } from './transaction.service.js';

@Module({
  imports: [PrismaModule, AccountModule, CategoryModule],
  controllers: [TransactionController],
  providers: [TransactionService],
  exports: [TransactionService],
})
export class TransactionModule {}