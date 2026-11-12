import request from 'supertest';
import { CategoryController } from './category.controller.js';
import { CategoryService } from './category.service.js';
import { createHttpTestApp } from '../../test/http-test-app.js';

describe('Category HTTP API', () => {
  const categories = {
    findAll: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    remove: vi.fn(),
  };
  const id = 'd9428888-122b-4c36-9a4e-2b8a5d19b152';
  let app: Awaited<ReturnType<typeof createHttpTestApp>>['app'];
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    categories.findAll.mockResolvedValue([{ id, name: 'Food' }]);
    categories.create.mockResolvedValue({ id, name: 'Food', type: 'EXPENSE' });
    categories.update.mockResolvedValue({ id, name: 'Dining' });
    categories.archive.mockResolvedValue({ id, archivedAt: '2026-01-01' });
    categories.unarchive.mockResolvedValue({ id, archivedAt: null });
    categories.remove.mockResolvedValue(undefined);
    ({ app, token } = await createHttpTestApp(
      CategoryController,
      CategoryService,
      categories,
    ));
  });

  afterEach(async () => app.close());

  it('lists and creates categories with query transformation', async () => {
    await request(app.getHttpServer())
      .get('/categories?includeArchived=true&type=EXPENSE')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([{ id, name: 'Food' }]);

    expect(categories.findAll).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({ includeArchived: true }),
    );

    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Food', type: 'EXPENSE', color: '#123456' })
      .expect(201)
      .expect({ id, name: 'Food', type: 'EXPENSE' });
  });

  it('rejects invalid category input, filters, and client-controlled role', async () => {
    await request(app.getHttpServer())
      .post('/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Food', type: 'INVALID', role: 'ADMIN' })
      .expect(400);

    await request(app.getHttpServer())
      .get('/categories?type=INVALID')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    expect(categories.create).not.toHaveBeenCalled();
  });

  it('archives and deletes a category with the expected statuses', async () => {
    await request(app.getHttpServer())
      .post(`/categories/${id}/archive`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer())
      .delete(`/categories/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
