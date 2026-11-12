import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { TransactionService } from './transaction.service.js';

@Controller('transactions')
@ApiTags('transactions')
@ApiBearerAuth()
export class TransactionController {
  constructor(private readonly transactions: TransactionService) {}

  @Get()
  @ApiOperation({ summary: 'List transactions' })
  @ApiBadRequestResponse({ description: 'The query parameters are invalid.' })
  list(
    @CurrentUser() user: AuthUser,
    @Query() query: ListTransactionsQueryDto,
  ) {
    return this.transactions.findAll(user.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transaction' })
  @ApiBadRequestResponse({ description: 'The transaction ID is invalid.' })
  @ApiNotFoundResponse({ description: 'The transaction was not found.' })
  findOne(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.transactions.findOneOrFail(user.id, id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a transaction' })
  @ApiBadRequestResponse({ description: 'The transaction details are invalid or the category is archived.' })
  @ApiNotFoundResponse({ description: 'The account or category was not found.' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateTransactionDto) {
    return this.transactions.create(user.id, dto); // source defaults to MANUAL
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a transaction' })
  @ApiBadRequestResponse({ description: 'The transaction ID or details are invalid, or the category is archived.' })
  @ApiNotFoundResponse({ description: 'The transaction, account, or category was not found.' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransactionDto,
  ) {
    return this.transactions.update(user.id, id, dto);
  }

  @HttpCode(204)
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a transaction' })
  @ApiBadRequestResponse({ description: 'The transaction ID is invalid.' })
  @ApiNotFoundResponse({ description: 'The transaction was not found.' })
  async remove(
    @CurrentUser() user: AuthUser,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.transactions.remove(user.id, id);
  }
}