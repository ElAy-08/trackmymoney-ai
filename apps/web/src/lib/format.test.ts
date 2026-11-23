import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  formatCompactMoney,
  formatDay,
  formatMoney,
  formatMonth,
  formatPercent,
} from '@/lib/format';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('formatMoney', () => {
  it('formats negative cents as a negative currency amount', () => {
    expect(formatMoney(-12345, 'EUR', 'en-US')).toBe('-€123.45');
  });
});

describe('formatCompactMoney', () => {
  it('formats 150000 EUR compactly for en-IE', () => {
    expect(formatCompactMoney(150000, 'EUR', 'en-IE')).toContain('1.5');
  });

  it('formats zero cents as a zero amount', () => {
    expect(formatCompactMoney(0, 'EUR', 'en-IE')).toContain('0');
  });

  it('rounds a very small amount sensibly', () => {
    expect(formatCompactMoney(99, 'EUR', 'en-US')).toBe('€1');
  });

  it('never throws for negative amounts', () => {
    expect(() => formatCompactMoney(-12345, 'EUR', 'en-US')).not.toThrow();
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

describe('formatPercent', () => {
  it('formats percentages with one decimal place', () => {
    expect(formatPercent(36.5, 'en-US')).toBe('36.5%');
    expect(formatPercent(0, 'en-US')).toBe('0.0%');
    expect(formatPercent(100, 'en-US')).toBe('100.0%');
  });
});
