import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CategoryService } from './category.service.js';

describe('CategoryService', () => {
  const userId = 'user-id';
  const categoryId = 'category-id';
  const category = {
    id: categoryId,
    userId,
    name: 'Food',
    type: TransactionType.EXPENSE,
    color: '#123456',
    icon: 'food',
    archivedAt: null as Date | null,
  };

  let prisma: {
    category: {
      findMany: ReturnType<typeof vi.fn>;
      findFirst: ReturnType<typeof vi.fn>;
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
  };
  let service: CategoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = {
      category: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
    };
    service = new CategoryService(prisma as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('filters by user and excludes archived categories by default', async () => {
      prisma.category.findMany.mockResolvedValue([category]);

      await service.findAll(userId, {});

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { userId, archivedAt: null },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
    });

    it('applies type and archived filters when requested', async () => {
      const query = {
        type: TransactionType.INCOME,
        includeArchived: true,
      };
      prisma.category.findMany.mockResolvedValue([]);

      await service.findAll(userId, query);

      expect(prisma.category.findMany).toHaveBeenCalledWith({
        where: { userId, type: TransactionType.INCOME },
        orderBy: [{ type: 'asc' }, { name: 'asc' }],
      });
    });
  });

  describe('findById', () => {
    it('finds a category scoped to its owner', async () => {
      prisma.category.findFirst.mockResolvedValue(category);

      await expect(service.findById(userId, categoryId)).resolves.toBe(category);
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { id: categoryId, userId },
      });
    });

    it('returns not found for a missing or other user category', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.findById(userId, categoryId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    const data = {
      name: 'Food',
      type: TransactionType.EXPENSE,
      color: '#123456',
    };

    it('creates a category owned by the user', async () => {
      prisma.category.create.mockResolvedValue(category);

      await expect(service.create(userId, data)).resolves.toBe(category);
      expect(prisma.category.create).toHaveBeenCalledWith({
        data: { ...data, userId },
      });
    });

    it('reports an active duplicate category', async () => {
      prisma.category.create.mockRejectedValue({ code: 'P2002' });
      prisma.category.findFirst.mockResolvedValue(category);

      await expect(service.create(userId, data)).rejects.toThrow(
        'You already have a category with that name',
      );
      expect(prisma.category.findFirst).toHaveBeenCalledWith({
        where: { userId, type: data.type, name: data.name },
      });
    });

    it('asks to restore an archived duplicate category', async () => {
      prisma.category.create.mockRejectedValue({ code: 'P2002' });
      prisma.category.findFirst.mockResolvedValue({
        ...category,
        archivedAt: new Date(),
      });

      await expect(service.create(userId, data)).rejects.toThrow(
        'An archived category with that name exists, restore it instead',
      );
    });

    it('rethrows unexpected errors', async () => {
      const error = new Error('database unavailable');
      prisma.category.create.mockRejectedValue(error);

      await expect(service.create(userId, data)).rejects.toBe(error);
    });
  });

  describe('update', () => {
    it('updates a category scoped to the user', async () => {
      const data = { name: 'Dining' };
      prisma.category.update.mockResolvedValue({ ...category, ...data });

      await expect(
        service.update(userId, categoryId, data),
      ).resolves.toMatchObject(data);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: categoryId, userId },
        data,
      });
    });

    it.each([
      ['P2002', ConflictException],
      ['P2025', NotFoundException],
    ])('maps Prisma error %s', async (code, exception) => {
      prisma.category.update.mockRejectedValue({ code });

      await expect(
        service.update(userId, categoryId, { name: 'Dining' }),
      ).rejects.toThrow(exception);
    });
  });

  describe('archive', () => {
    it('archives an active category', async () => {
      prisma.category.findFirst.mockResolvedValue(category);
      prisma.category.update.mockResolvedValue({
        ...category,
        archivedAt: new Date(),
      });

      await service.archive(userId, categoryId);

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: categoryId, userId },
        data: { archivedAt: expect.any(Date) },
      });
    });

    it('is idempotent for an archived category', async () => {
      const archived = { ...category, archivedAt: new Date() };
      prisma.category.findFirst.mockResolvedValue(archived);

      await expect(service.archive(userId, categoryId)).resolves.toBe(archived);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('unarchive', () => {
    it('unarchives an archived category', async () => {
      prisma.category.findFirst.mockResolvedValue({
        ...category,
        archivedAt: new Date(),
      });
      prisma.category.update.mockResolvedValue(category);

      await expect(service.unarchive(userId, categoryId)).resolves.toBe(category);
      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: categoryId, userId },
        data: { archivedAt: null },
      });
    });

    it('is idempotent for an active category', async () => {
      prisma.category.findFirst.mockResolvedValue(category);

      await expect(service.unarchive(userId, categoryId)).resolves.toBe(category);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a category scoped to the user', async () => {
      prisma.category.findFirst.mockResolvedValue(category);
      prisma.category.delete.mockResolvedValue(category);

      await expect(
        service.remove(userId, categoryId),
      ).resolves.toBeUndefined();
      expect(prisma.category.delete).toHaveBeenCalledWith({
        where: { id: categoryId, userId },
      });
    });

    it('maps a category with transactions to conflict', async () => {
      prisma.category.findFirst.mockResolvedValue(category);
      prisma.category.delete.mockRejectedValue({ code: 'P2003' });

      await expect(service.remove(userId, categoryId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('maps a missing category to not found', async () => {
      prisma.category.findFirst.mockResolvedValue(category);
      prisma.category.delete.mockRejectedValue({ code: 'P2025' });

      await expect(service.remove(userId, categoryId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('does not try to delete a category not owned by the user', async () => {
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.remove(userId, categoryId)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
