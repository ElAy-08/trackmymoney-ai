import request from 'supertest';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { createHttpTestApp } from '../../test/http-test-app.js';

describe('Auth HTTP API', () => {
  const auth = {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
    deleteAccount: vi.fn(),
  };
  let app: Awaited<ReturnType<typeof createHttpTestApp>>['app'];
  let token: string;

  beforeEach(async () => {
    vi.clearAllMocks();
    auth.register.mockResolvedValue({ accessToken: 'access-token' });
    auth.login.mockResolvedValue({ accessToken: 'access-token' });
    auth.refresh.mockResolvedValue({ accessToken: 'new-access-token' });
    auth.logout.mockResolvedValue(undefined);
    auth.me.mockResolvedValue({ id: 'user-id', email: 'alex@example.com' });
    auth.deleteAccount.mockResolvedValue(undefined);
    ({ app, token } = await createHttpTestApp(
      AuthController,
      AuthService,
      auth,
    ));
  });

  afterEach(async () => app.close());

  it('registers and logs in through public routes', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'Alex',
        email: 'alex@example.com',
        password: 'secure-password',
      })
      .expect(201)
      .expect({ accessToken: 'access-token' });

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'alex@example.com', password: 'secure-password' })
      .expect(200)
      .expect({ accessToken: 'access-token' });
  });

  it('rejects invalid and forbidden registration fields', async () => {
    await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        name: 'A',
        email: 'not-an-email',
        password: 'short',
        role: 'ADMIN',
      })
      .expect(400);

    expect(auth.register).not.toHaveBeenCalled();
  });

  it('requires a valid bearer token on the current-user route', async () => {
    await request(app.getHttpServer()).get('/auth/me').expect(401);

    await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect({ id: 'user-id', email: 'alex@example.com' });
  });

  it('deletes only the authenticated account and requires authentication', async () => {
    await request(app.getHttpServer()).delete('/auth/me').expect(401);

    await request(app.getHttpServer())
      .delete('/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);

    expect(auth.deleteAccount).toHaveBeenCalledOnce();
    expect(auth.deleteAccount).toHaveBeenCalledWith('user-id');
  });
});
