import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_ACCOUNT_NAME, DEFAULT_CATEGORIES } from './default-data.js';
import { UsersService } from './users.service.js';

describe('UsersService', () => {
  const user = {
    id: 'user-id',
    email: 'alex@example.com',
    name: 'Alex',
    passwordHash: 'password-hash',
  };

  let prisma: {
    user: { findUnique: ReturnType<typeof vi.fn> };
    $transaction: ReturnType<typeof vi.fn>;
  };
  let service: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    prisma = {
      user: { findUnique: vi.fn() },
      $transaction: vi.fn(),
    };
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('finds a user by email', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findByEmail(user.email)).resolves.toBe(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { email: user.email },
    });
  });

  it('finds a user by id', async () => {
    prisma.user.findUnique.mockResolvedValue(user);

    await expect(service.findById(user.id)).resolves.toBe(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: user.id },
    });
  });

  it('creates a user, default account, and default categories in one transaction', async () => {
    const data = {
      name: user.name,
      email: user.email,
      passwordHash: user.passwordHash,
    };
    const tx = {
      user: { create: vi.fn().mockResolvedValue(user) },
      account: { create: vi.fn().mockResolvedValue({ id: 'account-id' }) },
      category: { createMany: vi.fn().mockResolvedValue({ count: 13 }) },
    };
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof tx) => Promise<typeof user>) =>
        callback(tx),
    );

    await expect(service.createWithDefaults(data)).resolves.toBe(user);

    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(tx.user.create).toHaveBeenCalledWith({ data });
    expect(tx.account.create).toHaveBeenCalledWith({
      data: {
        userId: user.id,
        name: DEFAULT_ACCOUNT_NAME,
        isDefault: true,
      },
    });
    expect(tx.category.createMany).toHaveBeenCalledWith({
      data: DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        userId: user.id,
      })),
    });
  });

  it('propagates transaction errors and does not continue creating defaults', async () => {
    const error = new Error('account creation failed');
    const tx = {
      user: { create: vi.fn().mockResolvedValue(user) },
      account: { create: vi.fn().mockRejectedValue(error) },
      category: { createMany: vi.fn() },
    };
    prisma.$transaction.mockImplementation(
      (callback: (transaction: typeof tx) => Promise<typeof user>) =>
        callback(tx),
    );

    await expect(
      service.createWithDefaults({
        name: user.name,
        email: user.email,
        passwordHash: user.passwordHash,
      }),
    ).rejects.toBe(error);
    expect(tx.category.createMany).not.toHaveBeenCalled();
  });
});
