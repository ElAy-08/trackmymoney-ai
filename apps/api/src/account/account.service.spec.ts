import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AccountService } from './account.service.js';

describe('AccountService', () => {
  const userId = 'user-id';
  const accountId = 'account-id';
  const account = {
    id: accountId,
    userId,
    name: 'Main',
    currency: 'EUR',
    openingBalanceCents: 0,
    isDefault: false,
  };

  let prisma: {
    account: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      updateMany: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: AccountService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = {
      account: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        updateMany: vi.fn(),
        delete: vi.fn(),
      },
      $transaction: vi.fn().mockResolvedValue([]),
    };
    service = new AccountService(prisma as unknown as PrismaService);
  });

  describe('findByUserId', () => {
    it('filters by user and orders default accounts first', async () => {
      const accounts = [account];
      prisma.account.findMany.mockResolvedValue(accounts);

      await expect(service.findByUserId(userId)).resolves.toBe(accounts);
      expect(prisma.account.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      });
    });
  });

  describe('findById', () => {
    it('finds an account scoped to its owner', async () => {
      prisma.account.findFirst.mockResolvedValue(account);

      await expect(service.findById(userId, accountId)).resolves.toBe(account);
      expect(prisma.account.findFirst).toHaveBeenCalledWith({
        where: { id: accountId, userId },
      });
    });

    it('returns not found for a missing or other user account', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(service.findById(userId, accountId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('creates an account owned by the user', async () => {
      const data = { name: 'Savings', currency: 'EUR' };
      prisma.account.create.mockResolvedValue(account);

      await expect(service.create(userId, data)).resolves.toBe(account);
      expect(prisma.account.create).toHaveBeenCalledWith({
        data: { ...data, userId },
      });
    });

    it('maps a duplicate account name to conflict', async () => {
      prisma.account.create.mockRejectedValue({ code: 'P2002' });

      await expect(
        service.create(userId, { name: account.name }),
      ).rejects.toThrow(ConflictException);
    });

    it('rethrows unexpected errors', async () => {
      const error = new Error('database unavailable');
      prisma.account.create.mockRejectedValue(error);

      await expect(
        service.create(userId, { name: account.name }),
      ).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('updates an account scoped to the user', async () => {
      const data = { name: 'Updated' };
      prisma.account.update.mockResolvedValue({ ...account, ...data });

      await expect(
        service.update(userId, accountId, data),
      ).resolves.toMatchObject(data);
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: accountId, userId },
        data,
      });
    });

    it.each([
      ['P2002', ConflictException],
      ['P2025', NotFoundException],
    ])('maps Prisma error %s', async (code, exception) => {
      prisma.account.update.mockRejectedValue({ code });

      await expect(
        service.update(userId, accountId, { name: 'Updated' }),
      ).rejects.toThrow(exception);
    });
  });

  describe('setDefault', () => {
    it('clears the previous default, sets the selected one, and returns it', async () => {
      prisma.account.findFirst
        .mockResolvedValueOnce(account)
        .mockResolvedValueOnce({ ...account, isDefault: true });

      const result = await service.setDefault(userId, accountId);

      expect(prisma.account.updateMany).toHaveBeenCalledWith({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
      expect(prisma.account.update).toHaveBeenCalledWith({
        where: { id: accountId, userId },
        data: { isDefault: true },
      });
      expect(prisma.$transaction).toHaveBeenCalledWith([
        prisma.account.updateMany.mock.results[0].value,
        prisma.account.update.mock.results[0].value,
      ]);
      expect(result).toMatchObject({ id: accountId, isDefault: true });
    });

    it('does not change defaults when the account is not owned by the user', async () => {
      prisma.account.findFirst.mockResolvedValue(null);

      await expect(service.setDefault(userId, accountId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a non-default account scoped to the user', async () => {
      prisma.account.findFirst.mockResolvedValue(account);
      prisma.account.delete.mockResolvedValue(account);

      await expect(service.remove(userId, accountId)).resolves.toBeUndefined();
      expect(prisma.account.delete).toHaveBeenCalledWith({
        where: { id: accountId, userId },
      });
    });

    it('prevents deleting the default account', async () => {
      prisma.account.findFirst.mockResolvedValue({ ...account, isDefault: true });

      await expect(service.remove(userId, accountId)).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.account.delete).not.toHaveBeenCalled();
    });

    it('maps an account with transactions to conflict', async () => {
      prisma.account.findFirst.mockResolvedValue(account);
      prisma.account.delete.mockRejectedValue({ code: 'P2003' });

      await expect(service.remove(userId, accountId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('maps a missing account to not found', async () => {
      prisma.account.findFirst.mockResolvedValue(account);
      prisma.account.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.remove(userId, accountId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
