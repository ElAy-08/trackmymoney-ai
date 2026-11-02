import type { AuthUser } from '../auth/auth-user.js';
import { TransactionController } from './transaction.controller.js';
import type { TransactionService } from './transaction.service.js';

describe('TransactionController', () => {
  const transactions = {
    findAll: vi.fn(),
    findOneOrFail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const controller = new TransactionController(
    transactions as unknown as TransactionService,
  );
  const user: AuthUser = { id: 'user-id', role: 'USER' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists transactions for the authenticated user with filters', () => {
    const query = { page: 2, pageSize: 10 };
    const result = { items: [], total: 0 };
    transactions.findAll.mockReturnValue(result);

    expect(controller.list(user, query)).toBe(result);
    expect(transactions.findAll).toHaveBeenCalledWith(user.id, query);
  });

  it('finds a transaction by id for the authenticated user', () => {
    const id = 'transaction-id';
    const result = { id };
    transactions.findOneOrFail.mockReturnValue(result);

    expect(controller.findOne(user, id)).toBe(result);
    expect(transactions.findOneOrFail).toHaveBeenCalledWith(user.id, id);
  });

  it('creates a transaction for the authenticated user', () => {
    const dto = {
      accountId: 'account-id',
      categoryId: 'category-id',
      amountCents: 1200,
      description: 'Lunch',
      date: '2026-01-15',
    };
    const result = { id: 'transaction-id', ...dto };
    transactions.create.mockReturnValue(result);

    expect(controller.create(user, dto)).toBe(result);
    expect(transactions.create).toHaveBeenCalledWith(user.id, dto);
  });

  it('updates a transaction by id', () => {
    const id = 'transaction-id';
    const dto = { description: 'Dinner' };
    const result = { id, ...dto };
    transactions.update.mockReturnValue(result);

    expect(controller.update(user, id, dto)).toBe(result);
    expect(transactions.update).toHaveBeenCalledWith(user.id, id, dto);
  });

  it('awaits transaction removal', async () => {
    const id = 'transaction-id';

    await expect(controller.remove(user, id)).resolves.toBeUndefined();
    expect(transactions.remove).toHaveBeenCalledWith(user.id, id);
  });
});
