import { Module } from '@nestjs/common';
import { TransactionService } from './transaction.service.js';
import { TransactionController } from './transaction.controller.js';

@Module({
  providers: [TransactionService],
  controllers: [TransactionController]
})
export class TransactionModule {}
