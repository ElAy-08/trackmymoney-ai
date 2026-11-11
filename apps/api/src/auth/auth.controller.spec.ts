import { AuthController } from './auth.controller.js';
import type { AuthService } from './auth.service.js';
import type { AuthUser } from './auth-user.js';

describe('AuthController', () => {
  const auth = {
    register: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
    me: vi.fn(),
  };
  const controller = new AuthController(auth as unknown as AuthService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes registration data to the auth service', () => {
    const dto = {
      name: 'Alex',
      email: 'alex@example.com',
      password: 'secure-password',
    };
    const result = { accessToken: 'access-token' };
    auth.register.mockReturnValue(result);

    expect(controller.register(dto)).toBe(result);
    expect(auth.register).toHaveBeenCalledWith(dto);
  });

  it('passes login data to the auth service', () => {
    const dto = { email: 'alex@example.com', password: 'secure-password' };
    const result = { accessToken: 'access-token' };
    auth.login.mockReturnValue(result);

    expect(controller.login(dto)).toBe(result);
    expect(auth.login).toHaveBeenCalledWith(dto);
  });

  it('passes the refresh token to the auth service', () => {
    const dto = { refreshToken: 'refresh-token' };
    const result = { accessToken: 'new-access-token' };
    auth.refresh.mockReturnValue(result);

    expect(controller.refresh(dto)).toBe(result);
    expect(auth.refresh).toHaveBeenCalledWith(dto.refreshToken);
  });

  it('awaits logout with the refresh token', async () => {
    const dto = { refreshToken: 'refresh-token' };

    await expect(controller.logout(dto)).resolves.toBeUndefined();
    expect(auth.logout).toHaveBeenCalledWith(dto.refreshToken);
  });

  it('looks up the authenticated user by id', () => {
    const user: AuthUser = { id: 'user-id', role: 'USER' };
    const result = { id: user.id, email: 'alex@example.com' };
    auth.me.mockReturnValue(result);

    expect(controller.me(user)).toBe(result);
    expect(auth.me).toHaveBeenCalledWith(user.id);
  });
});
