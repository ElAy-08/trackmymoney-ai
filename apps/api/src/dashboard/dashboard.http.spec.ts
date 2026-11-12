import request from 'supertest';
import { DashboardController } from './dashboard.controller.js';
import { DashboardService } from './dashboard.service.js';
import { createHttpTestApp } from '../../test/http-test-app.js';

describe('Dashboard HTTP API', () => {
  const dashboard = {
    summary: vi.fn(),
    byCategory: vi.fn(),
    monthly: vi.fn(),
  };
  let app: Awaited<ReturnType<typeof createHttpTestApp>>['app'];
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    dashboard.summary.mockResolvedValue({
      incomeCents: 5000,
      expenseCents: 2000,
    });
    dashboard.byCategory.mockResolvedValue({ items: [] });
    dashboard.monthly.mockResolvedValue({ months: [] });
    ({ app, token } = await createHttpTestApp(
      DashboardController,
      DashboardService,
      dashboard,
    ));
  });

  afterEach(async () => app.close());

  it('serves summary, category, and monthly routes for an authenticated user', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/summary?from=2026-01-01&to=2026-01-31')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ incomeCents: 5000, expenseCents: 2000 });

    await request(app.getHttpServer())
      .get('/dashboard/by-category?type=EXPENSE')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ items: [] });

    await request(app.getHttpServer())
      .get('/dashboard/monthly?months=3')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ months: [] });

    expect(dashboard.monthly).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({ months: 3 }),
    );
  });

  it('rejects invalid dates, query values, and protected routes without tokens', async () => {
    await request(app.getHttpServer())
      .get('/dashboard/summary?from=2026-02-30')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app.getHttpServer())
      .get('/dashboard/monthly?months=25')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app.getHttpServer()).get('/dashboard/monthly').expect(401);

    expect(dashboard.summary).not.toHaveBeenCalled();
    expect(dashboard.monthly).not.toHaveBeenCalled();
  });
});
