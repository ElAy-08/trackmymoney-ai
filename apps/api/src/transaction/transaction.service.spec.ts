import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TransactionSource, TransactionType } from '../generated/prisma/enums.js';
import { AccountService } from '../account/account.service.js';
import { CategoryService } from '../category/category.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TransactionService } from './transaction.service.js';

describe('TransactionService', () => {
  const userId = 'user-id';
  const transactionId = 'transaction-id';
  const accountId = 'account-id';
  const categoryId = 'category-id';
  const category = {
    id: categoryId,
    type: TransactionType.EXPENSE,
    archivedAt: null,
  };
  const transaction = {
    id: transactionId,
    userId,
    accountId,
    categoryId,
    type: TransactionType.EXPENSE,
    amountCents: 1200,
    date: new Date('2026-01-15T00:00:00.000Z'),
  };

  let prisma: {
    transaction: {
      create: ReturnType<typeof vi.fn>;
      findMany: ReturnType<typeof vi.fn>;
      count: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let accounts: { findById: ReturnType<typeof vi.fn> };
  let categories: { findById: ReturnType<typeof vi.fn> };
  let service: TransactionService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = {
      transaction: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
      },
      $transaction: vi.fn(),
    };
    accounts = { findById: vi.fn().mockResolvedValue({ id: accountId }) };
    categories = { findById: vi.fn().mockResolvedValue(category) };
    service = new TransactionService(
      prisma as unknown as PrismaService,
      accounts as unknown as AccountService,
      categories as unknown as CategoryService,
    );
  });

  describe('create', () => {
    const dto = {
      accountId,
      categoryId,
      amountCents: 1200,
      description: 'Lunch',
      merchant: 'Cafe',
      date: '2026-01-15',
    };

    it('validates account and category and creates a manual transaction', async () => {
      prisma.transaction.create.mockResolvedValue(transaction);

      await expect(service.create(userId, dto)).resolves.toBe(transaction);
      expect(accounts.findById).toHaveBeenCalledWith(userId, accountId);
      expect(categories.findById).toHaveBeenCalledWith(userId, categoryId);
      expect(prisma.transaction.create).toHaveBeenCalledWith({
        data: {
          userId,
          accountId,
          categoryId,
          type: TransactionType.EXPENSE,
          amountCents: dto.amountCents,
          description: dto.description,
          merchant: dto.merchant,
          date: new Date('2026-01-15T00:00:00.000Z'),
          source: TransactionSource.MANUAL,
        },
      });
    });

    it('uses the supplied transaction source', async () => {
      prisma.transaction.create.mockResolvedValue(transaction);

      await service.create(userId, dto, TransactionSource.AI_TEXT);

      expect(prisma.transaction.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: TransactionSource.AI_TEXT }),
        }),
      );
    });

    it('rejects transactions for archived categories', async () => {
      categories.findById.mockResolvedValue({
        ...category,
        archivedAt: new Date(),
      });

      await expect(service.create(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.transaction.create).not.toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    const query = {
      from: '2026-01-01',
      to: '2026-01-31',
      accountId,
      categoryId,
      type: TransactionType.EXPENSE,
      search: 'cafe',
      page: 2,
      pageSize: 10,
    };

    it('filters, searches, sorts, and paginates results', async () => {
      const items = [transaction];
      prisma.transaction.findMany.mockResolvedValue(items);
      prisma.transaction.count.mockResolvedValue(21);
      prisma.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      );

      await expect(service.findAll(userId, query)).resolves.toEqual({
        items,
        total: 21,
        page: 2,
        pageSize: 10,
        totalPages: 3,
      });
      const where = {
        userId,
        accountId,
        categoryId,
        type: TransactionType.EXPENSE,
        date: {
          gte: new Date('2026-01-01T00:00:00.000Z'),
          lte: new Date('2026-01-31T00:00:00.000Z'),
        },
        OR: [
          { description: { contains: 'cafe', mode: 'insensitive' } },
          { merchant: { contains: 'cafe', mode: 'insensitive' } },
        ],
      };
      expect(prisma.transaction.findMany).toHaveBeenCalledWith({
        where,
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: 10,
        take: 10,
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          account: { select: { id: true, name: true } },
        },
      });
      expect(prisma.transaction.count).toHaveBeenCalledWith({ where });
    });

    it('supports open-ended date filters', async () => {
      const openEndedQuery = {
        from: '2026-02-01',
        page: 1,
        pageSize: 20,
      };
      prisma.transaction.findMany.mockResolvedValue([]);
      prisma.transaction.count.mockResolvedValue(0);
      prisma.$transaction.mockImplementation((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      );

      await service.findAll(userId, openEndedQuery);

      expect(prisma.transaction.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId,
            date: { gte: new Date('2026-02-01T00:00:00.000Z') },
          },
        }),
      );
    });

    it('rejects a date range where from is after to', async () => {
      await expect(
        service.findAll(userId, {
          from: '2026-02-02',
          to: '2026-02-01',
          page: 1,
          pageSize: 20,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('findOneOrFail', () => {
    it('finds a transaction scoped to its user with relations', async () => {
      prisma.transaction.findFirst.mockResolvedValue(transaction);

      await expect(
        service.findOneOrFail(userId, transactionId),
      ).resolves.toBe(transaction);
      expect(prisma.transaction.findFirst).toHaveBeenCalledWith({
        where: { id: transactionId, userId },
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          account: { select: { id: true, name: true } },
        },
      });
    });

    it('returns not found for a missing or other user transaction', async () => {
      prisma.transaction.findFirst.mockResolvedValue(null);

      await expect(
        service.findOneOrFail(userId, transactionId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    beforeEach(() => {
      prisma.transaction.findFirst.mockResolvedValue(transaction);
      prisma.transaction.update.mockResolvedValue(transaction);
    });

    it('validates changed account/category and updates the derived type and date', async () => {
      const newCategoryId = 'income-category-id';
      categories.findById.mockResolvedValue({
        id: newCategoryId,
        type: TransactionType.INCOME,
        archivedAt: null,
      });
      const dto = {
        accountId: 'new-account-id',
        categoryId: newCategoryId,
        amountCents: 5000,
        date: '2026-02-01',
      };

      await service.update(userId, transactionId, dto);

      expect(accounts.findById).toHaveBeenCalledWith(userId, dto.accountId);
      expect(categories.findById).toHaveBeenCalledWith(
        userId,
        newCategoryId,
      );
      expect(prisma.transaction.update).toHaveBeenCalledWith({
        where: { id: transactionId, userId },
        data: {
          accountId: dto.accountId,
          categoryId: newCategoryId,
          type: TransactionType.INCOME,
          amountCents: dto.amountCents,
          description: undefined,
          merchant: undefined,
          date: new Date('2026-02-01T00:00:00.000Z'),
        },
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          account: { select: { id: true, name: true } },
        },
      });
    });

    it('retains the current type when the category is not changed', async () => {
      await service.update(userId, transactionId, { description: 'Updated' });

      expect(categories.findById).not.toHaveBeenCalled();
      expect(prisma.transaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: TransactionType.EXPENSE,
            description: 'Updated',
          }),
        }),
      );
    });

    it('rejects a changed category that is archived', async () => {
      categories.findById.mockResolvedValue({
        id: 'archived-category-id',
        type: TransactionType.INCOME,
        archivedAt: new Date(),
      });

      await expect(
        service.update(userId, transactionId, {
          categoryId: 'archived-category-id',
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transaction.update).not.toHaveBeenCalled();
    });

    it('returns not found when the transaction disappears during update', async () => {
      prisma.transaction.update.mockRejectedValue({ code: 'P2025' });

      await expect(
        service.update(userId, transactionId, { description: 'Updated' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('rethrows unexpected update errors', async () => {
      const error = new Error('database unavailable');
      prisma.transaction.update.mockRejectedValue(error);

      await expect(
        service.update(userId, transactionId, { description: 'Updated' }),
      ).rejects.toBe(error);
    });
  });

  describe('remove', () => {
    it('deletes only the transaction owned by the user', async () => {
      prisma.transaction.deleteMany.mockResolvedValue({ count: 1 });

      await expect(
        service.remove(userId, transactionId),
      ).resolves.toBeUndefined();
      expect(prisma.transaction.deleteMany).toHaveBeenCalledWith({
        where: { id: transactionId, userId },
      });
    });

    it('returns not found if no owned transaction was deleted', async () => {
      prisma.transaction.deleteMany.mockResolvedValue({ count: 0 });

      await expect(
        service.remove(userId, transactionId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
