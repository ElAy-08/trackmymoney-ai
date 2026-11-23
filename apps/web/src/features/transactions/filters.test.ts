import { describe, expect, it } from 'vitest';
import {
  filtersToParams,
  hasActiveFilters,
  parseFilters,
} from './filters';

const ACCOUNT_ID = '123e4567-e89b-42d3-a456-426614174000';
const CATEGORY_ID = '123e4567-e89b-42d3-a456-426614174001';

describe('transaction filters', () => {
  it.each([
    '2026-02-30',
    '2026-13-01',
    '30/10/2026',
    '2026-10-30T00:00:00.000Z',
  ])('drops invalid calendar day %s', (from) => {
    expect(parseFilters(new URLSearchParams({ from })).from).toBeUndefined();
  });

  it('drops invalid UUIDs and invalid page values', () => {
    for (const page of ['abc', '0', '-1', '1.5']) {
      expect(parseFilters(new URLSearchParams({ page })).page).toBe(1);
    }

    expect(
      parseFilters(new URLSearchParams({ accountId: 'not-a-uuid' })).accountId,
    ).toBeUndefined();
    expect(
      parseFilters(new URLSearchParams({ categoryId: '1234' })).categoryId,
    ).toBeUndefined();
    expect(parseFilters(new URLSearchParams({ page: '2' })).page).toBe(2);
  });

  it('drops to when the from day is later', () => {
    const filters = parseFilters(
      new URLSearchParams({ from: '2026-11-20', to: '2026-11-01' }),
    );

    expect(filters.from).toBe('2026-11-20');
    expect(filters.to).toBeUndefined();
  });

  it('trims search and limits it to 80 characters', () => {
    expect(
      parseFilters(new URLSearchParams({ search: '  coffee shop  ' })).search,
    ).toBe('coffee shop');
    expect(
      parseFilters(new URLSearchParams({ search: 'x'.repeat(90) })).search,
    ).toBe('x'.repeat(80));
    expect(parseFilters(new URLSearchParams({ search: '   ' })).search).toBeUndefined();
  });

  it('detects active filters but not the page alone', () => {
    expect(hasActiveFilters({ page: 3 })).toBe(false);
    expect(hasActiveFilters({ page: 1, type: 'EXPENSE' })).toBe(true);
  });

  it('round-trips normalized filters and omits the default page', () => {
    const filters = {
      from: '2026-10-01',
      to: '2026-10-31',
      accountId: ACCOUNT_ID,
      categoryId: CATEGORY_ID,
      type: 'INCOME' as const,
      search: 'salary',
      page: 2,
    };

    expect(parseFilters(filtersToParams(filters))).toEqual(filters);
    expect(filtersToParams({ page: 1 }).has('page')).toBe(false);
    expect(filtersToParams({ page: 1 }).size).toBe(0);
  });
});
