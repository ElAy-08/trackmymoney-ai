import { describe, expect, it } from 'vitest';
import {
  isPeriodPreset,
  PERIOD_LABELS,
  resolvePeriod,
  type PeriodPreset,
} from '@/lib/period';

const validPresets: PeriodPreset[] = [
  'this-month',
  'last-month',
  'last-3-months',
  'this-year',
];

describe('resolvePeriod', () => {
  it('resolves last month across the January year boundary', () => {
    expect(resolvePeriod('last-month', new Date(2028, 0, 15))).toEqual({
      from: '2027-12-01',
      to: '2027-12-31',
    });
  });

  it('handles leap and non-leap February', () => {
    expect(resolvePeriod('this-month', new Date(2028, 1, 12))).toEqual({
      from: '2028-02-01',
      to: '2028-02-29',
    });
    expect(resolvePeriod('this-month', new Date(2027, 1, 12))).toEqual({
      from: '2027-02-01',
      to: '2027-02-28',
    });
  });

  it('handles both 30-day and 31-day months', () => {
    expect(resolvePeriod('this-month', new Date(2026, 3, 10))).toEqual({
      from: '2026-04-01',
      to: '2026-04-30',
    });
    expect(resolvePeriod('this-month', new Date(2026, 4, 10))).toEqual({
      from: '2026-05-01',
      to: '2026-05-31',
    });
  });

  it('starts the three-month period in the previous year when needed', () => {
    expect(resolvePeriod('last-3-months', new Date(2027, 0, 8))).toEqual({
      from: '2026-11-01',
      to: '2027-01-31',
    });
  });

  it('resolves the full local calendar year', () => {
    expect(resolvePeriod('this-year', new Date(2026, 6, 19))).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });
});

describe('isPeriodPreset', () => {
  it('uses title-cased display labels', () => {
    expect(PERIOD_LABELS['this-year']).toBe('This Year');
  });

  it.each(validPresets)('accepts %s', (value) => {
    expect(isPeriodPreset(value)).toBe(true);
    expect(PERIOD_LABELS[value]).toBeTruthy();
  });

  it.each([undefined, null, 3, {}, 'past-week', ''])(
    'rejects invalid value %s',
    (value) => {
      expect(isPeriodPreset(value)).toBe(false);
    },
  );
});
