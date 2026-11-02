import type { AuthUser } from '../auth/auth-user.js';
import { DashboardController } from './dashboard.controller.js';
import type { DashboardService } from './dashboard.service.js';

describe('DashboardController', () => {
  const dashboard = {
    summary: vi.fn(),
    byCategory: vi.fn(),
    monthly: vi.fn(),
  };
  const controller = new DashboardController(
    dashboard as unknown as DashboardService,
  );
  const user: AuthUser = { id: 'user-id', role: 'USER' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests a summary for the authenticated user and period', () => {
    const query = { from: '2026-01-01', to: '2026-01-31' };
    const result = { incomeCents: 5000, expenseCents: 2000 };
    dashboard.summary.mockReturnValue(result);

    expect(controller.summary(user, query)).toBe(result);
    expect(dashboard.summary).toHaveBeenCalledWith(user.id, query);
  });

  it('requests category totals for the authenticated user and filters', () => {
    const query = { type: 'EXPENSE' as const };
    const result = { items: [] };
    dashboard.byCategory.mockReturnValue(result);

    expect(controller.byCategory(user, query)).toBe(result);
    expect(dashboard.byCategory).toHaveBeenCalledWith(user.id, query);
  });

  it('requests monthly totals for the authenticated user and options', () => {
    const query = { months: 12, accountId: 'account-id' };
    const result = { months: [] };
    dashboard.monthly.mockReturnValue(result);

    expect(controller.monthly(user, query)).toBe(result);
    expect(dashboard.monthly).toHaveBeenCalledWith(user.id, query);
  });
});
