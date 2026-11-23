import { describe, expect, it } from 'vitest';
import { ApiError, unwrap } from '@/lib/api/unwrap';

describe('unwrap', () => {
  it('returns successful response data', async () => {
    const data = { incomeCents: 120000 };
    const request = Promise.resolve({
      data,
      response: new Response(null, { status: 200 }),
    });

    await expect(unwrap(request)).resolves.toBe(data);
  });

  it('throws an ApiError with the HTTP status and normalized message', async () => {
    const request = Promise.resolve({
      error: { message: ['Date range is invalid', 'Try again'] },
      response: new Response(null, { status: 400, statusText: 'Bad Request' }),
    });

    await expect(unwrap(request)).rejects.toEqual(
      new ApiError(400, 'Date range is invalid, Try again'),
    );
  });

  it('throws when a response has neither data nor an error body', async () => {
    const request = Promise.resolve({
      response: new Response(null, { status: 401, statusText: 'Unauthorized' }),
    });

    await expect(unwrap(request)).rejects.toEqual(
      new ApiError(401, 'Unauthorized'),
    );
  });
});
