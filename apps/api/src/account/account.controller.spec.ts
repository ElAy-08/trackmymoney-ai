import { AccountController } from './account.controller.js';
import type { AccountService } from './account.service.js';
import type { AuthUser } from '../auth/auth-user.js';

describe('AccountController', () => {
  const accounts = {
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setDefault: vi.fn(),
    remove: vi.fn(),
  };
  const controller = new AccountController(
    accounts as unknown as AccountService,
  );
  const user: AuthUser = { id: 'user-id', role: 'USER' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists accounts for the authenticated user', () => {
    const result = [{ id: 'account-id' }];
    accounts.findByUserId.mockReturnValue(result);

    expect(controller.list(user)).toBe(result);
    expect(accounts.findByUserId).toHaveBeenCalledWith(user.id);
  });

  it('creates an account for the authenticated user', () => {
    const dto = { name: 'Savings', currency: 'EUR' };
    const result = { id: 'account-id', ...dto };
    accounts.create.mockReturnValue(result);

    expect(controller.create(user, dto)).toBe(result);
    expect(accounts.create).toHaveBeenCalledWith(user.id, dto);
  });

  it('updates the requested account', () => {
    const id = 'account-id';
    const dto = { name: 'Updated savings' };
    const result = { id, ...dto };
    accounts.update.mockReturnValue(result);

    expect(controller.update(user, id, dto)).toBe(result);
    expect(accounts.update).toHaveBeenCalledWith(user.id, id, dto);
  });

  it('sets the requested account as default', () => {
    const id = 'account-id';
    const result = { id, isDefault: true };
    accounts.setDefault.mockReturnValue(result);

    expect(controller.setDefault(user, id)).toBe(result);
    expect(accounts.setDefault).toHaveBeenCalledWith(user.id, id);
  });

  it('awaits removal of the requested account', async () => {
    const id = 'account-id';

    await expect(controller.remove(user, id)).resolves.toBeUndefined();
    expect(accounts.remove).toHaveBeenCalledWith(user.id, id);
  });
});
