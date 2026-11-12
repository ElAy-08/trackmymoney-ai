import { ValidationPipe, type Type } from '@nestjs/common';
import { ByCategoryQueryDto } from '../src/dashboard/dto/by-category-query.dto.js';
import { MonthlyQueryDto } from '../src/dashboard/dto/monthly-query.dto.js';
import { StatsPeriodQueryDto } from '../src/dashboard/dto/stats-period-query.dto.js';
import { LoginDto } from '../src/auth/dto/login.dto.js';
import { RegisterDto } from '../src/auth/dto/register.dto.js';
import { CreateAccountDto } from '../src/account/dto/create-account.dto.js';
import { UpdateAccountDto } from '../src/account/dto/update-account.dto.js';
import { CreateCategoryDto } from '../src/category/dto/create-category.dto.js';
import { ListCategoriesQueryDto } from '../src/category/dto/list-categories-query.dto.js';
import { UpdateCategoryDto } from '../src/category/dto/update-category.dto.js';
import { CreateTransactionDto } from '../src/transaction/dto/create-transaction.dto.js';
import { ListTransactionsQueryDto } from '../src/transaction/dto/list-transactions-query.dto.js';
import { UpdateTransactionDto } from '../src/transaction/dto/update-transaction.dto.js';
import { TransactionType } from '../src/generated/prisma/enums.js';

const validationPipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
});

function validateDto<T>(
  dto: Type<T>,
  value: Record<string, unknown>,
): Promise<T> {
  return validationPipe.transform(value, {
    type: 'body',
    metatype: dto,
    data: '',
  }) as Promise<T>;
}

describe('request DTO validation', () => {
  it('normalizes and validates registration and login credentials', async () => {
    await expect(
      validateDto(RegisterDto, {
        name: 'Alex',
        email: ' Alex@Example.com ',
        password: 'secure-password',
      }),
    ).resolves.toMatchObject({ email: 'alex@example.com' });
    await expect(
      validateDto(RegisterDto, {
        name: 'A',
        email: 'invalid',
        password: 'short',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(LoginDto, {
        email: 'alex@example.com',
        password: 'x',
        role: 'ADMIN',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('validates account fields and rejects client-controlled ownership', async () => {
    await expect(
      validateDto(CreateAccountDto, {
        name: 'Savings',
        currency: 'EUR',
        openingBalanceCents: 500,
      }),
    ).resolves.toMatchObject({ openingBalanceCents: 500 });
    await expect(
      validateDto(CreateAccountDto, {
        name: 'Savings',
        openingBalanceCents: 1.5,
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(UpdateAccountDto, { name: 'Updated', userId: 'other-user' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('validates categories and category query coercion', async () => {
    await expect(
      validateDto(CreateCategoryDto, {
        name: 'Food',
        type: TransactionType.EXPENSE,
        color: '#123456',
      }),
    ).resolves.toMatchObject({ type: TransactionType.EXPENSE });
    await expect(
      validateDto(CreateCategoryDto, {
        name: 'Food',
        type: 'OTHER',
        role: 'ADMIN',
      }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(UpdateCategoryDto, { color: 'red' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(ListCategoriesQueryDto, { includeArchived: 'true' }),
    ).resolves.toMatchObject({ includeArchived: true });
  });

  it('validates transaction amounts and calendar dates, and rejects source/user fields', async () => {
    const valid = {
      accountId: 'd9428888-122b-4c36-9a4e-2b8a5d19b152',
      categoryId: 'd9428888-122b-4c36-9a4e-2b8a5d19b153',
      amountCents: 1200,
      description: 'Lunch',
      date: '2024-02-29',
    };
    await expect(
      validateDto(CreateTransactionDto, valid),
    ).resolves.toMatchObject({
      amountCents: 1200,
    });
    await expect(
      validateDto(CreateTransactionDto, { ...valid, amountCents: 0 }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(CreateTransactionDto, { ...valid, date: '2024-02-30' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(CreateTransactionDto, { ...valid, source: 'AI_TEXT' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(UpdateTransactionDto, { amountCents: -1, userId: 'user-id' }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it('validates transaction and dashboard query dates, amounts, and forbidden fields', async () => {
    await expect(
      validateDto(ListTransactionsQueryDto, {
        from: '2026-01-01',
        to: '2026-01-31',
        page: '2',
        pageSize: '10',
      }),
    ).resolves.toMatchObject({ page: 2, pageSize: 10 });
    await expect(
      validateDto(ListTransactionsQueryDto, { from: '2026-02-30' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(ListTransactionsQueryDto, { userId: 'user-id' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(StatsPeriodQueryDto, { from: '2026-01-01', role: 'ADMIN' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(ByCategoryQueryDto, { type: 'INVALID' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      validateDto(MonthlyQueryDto, { months: '25', source: 'MANUAL' }),
    ).rejects.toMatchObject({ status: 400 });
  });
});
