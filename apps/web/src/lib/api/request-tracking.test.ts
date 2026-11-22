import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  hasSlowApiRequests,
  trackApiRequest,
} from '@/lib/api/request-tracking';

afterEach(() => {
  vi.useRealTimers();
});

describe('API request tracking', () => {
  it('shows the slow-request state after 3.5 seconds and clears it on resolution', async () => {
    vi.useFakeTimers();
    let resolveRequest!: () => void;
    const request = trackApiRequest(
      () =>
        new Promise<void>((resolve) => {
          resolveRequest = resolve;
        }),
    );

    await vi.advanceTimersByTimeAsync(3_499);
    expect(hasSlowApiRequests()).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(hasSlowApiRequests()).toBe(true);

    resolveRequest();
    await request;
    expect(hasSlowApiRequests()).toBe(false);
  });

  it('clears the slow-request state when a request rejects', async () => {
    vi.useFakeTimers();
    let rejectRequest!: (error: Error) => void;
    const request = trackApiRequest(
      () =>
        new Promise<void>((_resolve, reject) => {
          rejectRequest = reject;
        }),
    );

    await vi.advanceTimersByTimeAsync(3_500);
    expect(hasSlowApiRequests()).toBe(true);

    rejectRequest(new Error('Network failure'));
    await expect(request).rejects.toThrow('Network failure');
    expect(hasSlowApiRequests()).toBe(false);
  });
});
