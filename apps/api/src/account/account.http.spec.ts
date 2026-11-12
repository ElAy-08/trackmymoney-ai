import request from 'supertest';
import { AccountController } from './account.controller.js';
import { AccountService } from './account.service.js';
import { createHttpTestApp } from '../../test/http-test-app.js';

describe('Account HTTP API', () => {
  const accounts = {
    findByUserId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    setDefault: vi.fn(),
    remove: vi.fn(),
  };
  const id = 'd9428888-122b-4c36-9a4e-2b8a5d19b152';
  let app: Awaited<ReturnType<typeof createHttpTestApp>>['app'];
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    accounts.findByUserId.mockResolvedValue([{ id }]);
    accounts.create.mockResolvedValue({ id, name: 'Savings' });
    accounts.update.mockResolvedValue({ id, name: 'Updated' });
    accounts.setDefault.mockResolvedValue({ id, isDefault: true });
    accounts.remove.mockResolvedValue(undefined);
    ({ app, token } = await createHttpTestApp(
      AccountController,
      AccountService,
      accounts,
    ));
  });

  afterEach(async () => app.close());

  it('lists and creates accounts for an authenticated user', async () => {
    await request(app.getHttpServer())
      .get('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect([{ id }]);

    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Savings', currency: 'EUR', openingBalanceCents: 500 })
      .expect(201)
      .expect({ id, name: 'Savings' });

    expect(accounts.create).toHaveBeenCalledWith(
      'user-id',
      expect.objectContaining({ name: 'Savings', openingBalanceCents: 500 }),
    );
  });

  it('validates account input and UUID path parameters', async () => {
    await request(app.getHttpServer())
      .post('/accounts')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Savings', openingBalanceCents: 1.5, userId: 'other-user' })
      .expect(400);

    await request(app.getHttpServer())
      .patch('/accounts/not-a-uuid')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated' })
      .expect(400);

    expect(accounts.create).not.toHaveBeenCalled();
  });

  it('sets the default and removes an account with the expected statuses', async () => {
    await request(app.getHttpServer())
      .post(`/accounts/${id}/default`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ id, isDefault: true });

    await request(app.getHttpServer())
      .delete(`/accounts/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
