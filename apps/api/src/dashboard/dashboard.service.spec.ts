import { BadRequestException } from '@nestjs/common';
import { AccountService } from '../account/account.service.js';
import { TransactionType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DashboardService } from './dashboard.service.js';

describe('DashboardService', () => {
  const userId = 'user-id';
  const accountId = 'account-id';

  let prisma: {
    transaction: { groupBy: ReturnType<typeof vi.fn> };
    account: { findMany: ReturnType<typeof vi.fn> };
    category: { findMany: ReturnType<typeof vi.fn> };
    $queryRaw: ReturnType<typeof vi.fn>;
  };
  let accounts: { findById: ReturnType<typeof vi.fn> };
  let service: DashboardService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = {
      transaction: { groupBy: vi.fn() },
      account: { findMany: vi.fn().mockResolvedValue([]) },
      category: { findMany: vi.fn().mockResolvedValue([]) },
      $queryRaw: vi.fn().mockResolvedValue([]),
    };
    accounts = { findById: vi.fn().mockResolvedValue({ id: accountId }) };
    service = new DashboardService(
      prisma as unknown as PrismaService,
      accounts as unknown as AccountService,
    );
  });

  describe('summary', () => {
    it('computes totals, net, counts, and balances', async () => {
      const account = {
        id: accountId,
        name: 'Main',
        currency: 'EUR',
        openingBalanceCents: 10000,
      };
      prisma.transaction.groupBy
        .mockResolvedValueOnce([
          {
            type: TransactionType.INCOME,
            _sum: { amountCents: 5000 },
            _count: { _all: 2 },
          },
          {
            type: TransactionType.EXPENSE,
            _sum: { amountCents: 1800 },
            _count: { _all: 3 },
          },
        ])
        .mockResolvedValueOnce([
          {
            accountId,
            type: TransactionType.INCOME,
            _sum: { amountCents: 6000 },
          },
          {
            accountId,
            type: TransactionType.EXPENSE,
            _sum: { amountCents: 2500 },
          },
          {
            accountId: 'empty-account',
            type: TransactionType.INCOME,
            _sum: { amountCents: null },
          },
        ]);
      prisma.account.findMany.mockResolvedValue([
        account,
        {
          id: 'empty-account',
          name: 'Empty',
          currency: 'EUR',
          openingBalanceCents: 200,
        },
      ]);

      await expect(
        service.summary(userId, {
          from: '2026-01-10',
          to: '2026-01-20',
          accountId,
        }),
      ).resolves.toEqual({
        period: { from: '2026-01-10', to: '2026-01-20' },
        incomeCents: 5000,
        expenseCents: 1800,
        netCents: 3200,
        transactionCount: 5,
        balances: [
          {
            accountId,
            name: 'Main',
            currency: 'EUR',
            balanceCents: 13500,
          },
          {
            accountId: 'empty-account',
            name: 'Empty',
            currency: 'EUR',
            balanceCents: 200,
          },
        ],
      });
      expect(accounts.findById).toHaveBeenCalledWith(userId, accountId);
      expect(prisma.transaction.groupBy).toHaveBeenNthCalledWith(1, {
        by: ['type'],
        where: {
          userId,
          date: {
            gte: new Date('2026-01-10T00:00:00.000Z'),
            lte: new Date('2026-01-20T00:00:00.000Z'),
          },
          accountId,
        },
        _sum: { amountCents: true },
        _count: { _all: true },
      });
    });

    it('uses the complete month when only one boundary is supplied', async () => {
      prisma.transaction.groupBy
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await service.summary(userId, { from: '2024-02-12' });

      expect(result.period).toEqual({ from: '2024-02-12', to: '2024-02-29' });
      expect(result.netCents).toBe(0);
      expect(result.transactionCount).toBe(0);
    });

    it('rejects an inverted period before querying', async () => {
      await expect(
        service.summary(userId, { from: '2026-02-02', to: '2026-02-01' }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.transaction.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('byCategory', () => {
    it('sorts category totals and calculates percentages', async () => {
      prisma.transaction.groupBy.mockResolvedValue([
        {
          categoryId: 'category-small',
          _sum: { amountCents: 1000 },
          _count: { _all: 2 },
        },
        {
          categoryId: 'category-large',
          _sum: { amountCents: 3000 },
          _count: { _all: 1 },
        },
      ]);
      prisma.category.findMany.mockResolvedValue([
        { id: 'category-small', name: 'Coffee', color: '#111111' },
        { id: 'category-large', name: 'Rent', color: '#222222' },
      ]);

      await expect(
        service.byCategory(userId, {
          from: '2026-03-01',
          to: '2026-03-31',
          type: TransactionType.EXPENSE,
        }),
      ).resolves.toEqual({
        period: { from: '2026-03-01', to: '2026-03-31' },
        type: TransactionType.EXPENSE,
        totalCents: 4000,
        items: [
          {
            categoryId: 'category-large',
            name: 'Rent',
            color: '#222222',
            totalCents: 3000,
            count: 1,
            percentage: 75,
          },
          {
            categoryId: 'category-small',
            name: 'Coffee',
            color: '#111111',
            totalCents: 1000,
            count: 2,
            percentage: 25,
          },
        ],
      });
      expect(prisma.transaction.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          by: ['categoryId'],
          where: {
            userId,
            date: {
              gte: new Date('2026-03-01T00:00:00.000Z'),
              lte: new Date('2026-03-31T00:00:00.000Z'),
            },
            type: TransactionType.EXPENSE,
          },
        }),
      );
      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: {
          userId,
          id: { in: ['category-small', 'category-large'] },
        },
        select: { id: true, name: true, color: true },
      });
    });

    it('returns zero percentages and fallback names when no category details exist', async () => {
      prisma.transaction.groupBy.mockResolvedValue([
        {
          categoryId: 'deleted-category',
          _sum: { amountCents: null },
          _count: { _all: 0 },
        },
      ]);

      await expect(service.byCategory(userId, {})).resolves.toMatchObject({
        totalCents: 0,
        items: [
          {
            categoryId: 'deleted-category',
            name: 'Unknown',
            color: null,
            totalCents: 0,
            count: 0,
            percentage: 0,
          },
        ],
      });
    });

    it('validates the requested account belongs to the user', async () => {
      prisma.transaction.groupBy.mockResolvedValue([]);
      accounts.findById.mockRejectedValue(new Error('not found'));

      await expect(
        service.byCategory(userId, { accountId }),
      ).rejects.toThrow('not found');
      expect(prisma.transaction.groupBy).not.toHaveBeenCalled();
    });
  });

  describe('monthly', () => {
    it('returns ordered months, converts BigInt totals, and fills gaps with zeros', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-15T12:00:00.000Z'));
      prisma.$queryRaw.mockResolvedValue([
        { month: '2025-12', income: 2500n, expense: 400n },
        { month: '2026-01', income: 7000n, expense: 1200n },
      ]);

      try {
        await expect(
          service.monthly(userId, { months: 3 }),
        ).resolves.toEqual({
          months: [
            { month: '2025-11', incomeCents: 0, expenseCents: 0 },
            { month: '2025-12', incomeCents: 2500, expenseCents: 400 },
            { month: '2026-01', incomeCents: 7000, expenseCents: 1200 },
          ],
        });
      } finally {
        vi.useRealTimers();
      }

      expect(prisma.$queryRaw).toHaveBeenCalledOnce();
      expect(prisma.$queryRaw.mock.calls[0][0][0]).toContain(
        'SELECT to_char(date_trunc',
      );
      expect(prisma.$queryRaw.mock.calls[0].slice(1)).toContain(userId);
      expect(prisma.$queryRaw.mock.calls[0].slice(1)).toContain('2025-11-01');
      expect(prisma.$queryRaw.mock.calls[0].slice(1)).toContain('2026-02-01');
    });

    it('validates the requested account belongs to the user', async () => {
      accounts.findById.mockRejectedValue(new Error('not found'));

      await expect(
        service.monthly(userId, { months: 3, accountId }),
      ).rejects.toThrow('not found');
      expect(prisma.$queryRaw).not.toHaveBeenCalled();
    });
  });
});
