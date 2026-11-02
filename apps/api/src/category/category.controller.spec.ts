import { CategoryController } from './category.controller.js';
import type { CategoryService } from './category.service.js';
import type { AuthUser } from '../auth/auth-user.js';

describe('CategoryController', () => {
  const categories = {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    remove: vi.fn(),
  };
  const controller = new CategoryController(
    categories as unknown as CategoryService,
  );
  const user: AuthUser = { id: 'user-id', role: 'USER' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists categories for the user with the supplied filters', () => {
    const query = { includeArchived: true };
    const result = [{ id: 'category-id' }];
    categories.findAll.mockReturnValue(result);

    expect(controller.list(user, query)).toBe(result);
    expect(categories.findAll).toHaveBeenCalledWith(user.id, query);
  });

  it('creates a category for the user', () => {
    const dto = { name: 'Food', type: 'EXPENSE' as const };
    const result = { id: 'category-id', ...dto };
    categories.create.mockReturnValue(result);

    expect(controller.create(user, dto)).toBe(result);
    expect(categories.create).toHaveBeenCalledWith(user.id, dto);
  });

  it('updates the requested category', () => {
    const id = 'category-id';
    const dto = { name: 'Dining' };
    const result = { id, ...dto };
    categories.update.mockReturnValue(result);

    expect(controller.update(user, id, dto)).toBe(result);
    expect(categories.update).toHaveBeenCalledWith(user.id, id, dto);
  });

  it('archives the requested category', () => {
    const id = 'category-id';
    const result = { id, archivedAt: new Date() };
    categories.archive.mockReturnValue(result);

    expect(controller.archive(user, id)).toBe(result);
    expect(categories.archive).toHaveBeenCalledWith(user.id, id);
  });

  it('unarchives the requested category', () => {
    const id = 'category-id';
    const result = { id, archivedAt: null };
    categories.unarchive.mockReturnValue(result);

    expect(controller.unarchive(user, id)).toBe(result);
    expect(categories.unarchive).toHaveBeenCalledWith(user.id, id);
  });

  it('awaits removal of the requested category', async () => {
    const id = 'category-id';

    await expect(controller.remove(user, id)).resolves.toBeUndefined();
    expect(categories.remove).toHaveBeenCalledWith(user.id, id);
  });
});
