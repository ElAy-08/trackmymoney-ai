import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatDay, formatMoney, formatMonth } from '@/lib/format';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('formatMoney', () => {
  it('formats negative cents as a negative currency amount', () => {
    expect(formatMoney(-12345, 'EUR', 'en-US')).toBe('-€123.45');
  });
});

describe('formatDay', () => {
  it('keeps an API calendar day stable across extreme host timezones', () => {
    const value = '2026-10-30T00:00:00.000Z';
    const expected = new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(value));

    vi.stubEnv('TZ', 'Pacific/Kiritimati');
    const kiritimati = formatDay(value);
    vi.stubEnv('TZ', 'America/Los_Angeles');
    const losAngeles = formatDay(value);

    expect(kiritimati).toBe(expected);
    expect(losAngeles).toBe(expected);
  });
});

describe('formatMonth', () => {
  it('includes a short month name and omits the current UTC year', () => {
    const currentYear = new Date().getUTCFullYear();
    const expected = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(currentYear, 9, 1)));

    expect(formatMonth(`${currentYear}-10`)).toBe(expected);
  });

  it('includes the year when it differs from the current UTC year', () => {
    const differentYear = new Date().getUTCFullYear() - 1;
    const expected = new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(differentYear, 9, 1)));

    expect(formatMonth(`${differentYear}-10`)).toBe(expected);
  });
});
