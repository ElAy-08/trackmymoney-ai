import request from 'supertest';
import { TransactionController } from './transaction.controller.js';
import { TransactionService } from './transaction.service.js';
import { createHttpTestApp } from '../../test/http-test-app.js';

describe('Transaction HTTP API', () => {
  const transactions = {
    findAll: vi.fn(),
    findOneOrFail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  };
  const id = 'd9428888-122b-4c36-9a4e-2b8a5d19b152';
  const validTransaction = {
    accountId: id,
    categoryId: 'd9428888-122b-4c36-9a4e-2b8a5d19b153',
    amountCents: 1200,
    description: 'Lunch',
    date: '2026-01-15',
  };
  let app: Awaited<ReturnType<typeof createHttpTestApp>>['app'];
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    transactions.findAll.mockResolvedValue({ items: [], total: 0 });
    transactions.findOneOrFail.mockResolvedValue({ id });
    transactions.create.mockResolvedValue({ id, ...validTransaction });
    transactions.update.mockResolvedValue({ id, description: 'Dinner' });
    transactions.remove.mockResolvedValue(undefined);
    ({ app, token } = await createHttpTestApp(
      TransactionController,
      TransactionService,
      transactions,
    ));
  });

  afterEach(async () => app.close());

  it('lists and creates transactions with query and body transformation', async () => {
    await request(app.getHttpServer())
      .get('/transactions?page=2&pageSize=10&from=2026-01-01')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ items: [], total: 0 });

    expect(transactions.findAll).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({ page: 2, pageSize: 10 }),
    );

    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send(validTransaction)
      .expect(201)
      .expect({ id, ...validTransaction });
  });

  it('rejects invalid amounts, impossible dates, and client-controlled fields', async () => {
    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTransaction, amountCents: 0 })
      .expect(400);

    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTransaction, date: '2026-02-30' })
      .expect(400);

    await request(app.getHttpServer())
      .post('/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...validTransaction, source: 'AI_TEXT' })
      .expect(400);

    expect(transactions.create).not.toHaveBeenCalled();
  });

  it('returns not found for invalid UUID paths and deletes with status 204', async () => {
    await request(app.getHttpServer())
      .get('/transactions/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .expect(400);

    await request(app.getHttpServer())
      .delete(`/transactions/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
