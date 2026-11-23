export type TransactionFilters = {
  from?: string;
  to?: string;
  accountId?: string;
  categoryId?: string;
  type?: 'INCOME' | 'EXPENSE';
  search?: string;
  page: number;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isCalendarDay(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isUuid(value: string | null): value is string {
  return value !== null && UUID_PATTERN.test(value);
}

function parsePage(value: string | null): number {
  if (!value || !/^\d+$/.test(value)) {
    return 1;
  }

  const page = Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

export function parseFilters(params: URLSearchParams): TransactionFilters {
  const fromValue = params.get('from');
  const toValue = params.get('to');
  const from = isCalendarDay(fromValue) ? fromValue : undefined;
  let to = isCalendarDay(toValue) ? toValue : undefined;

  if (from && to && from > to) {
    to = undefined;
  }

  const accountIdValue = params.get('accountId');
  const categoryIdValue = params.get('categoryId');
  const typeValue = params.get('type');
  const search = params.get('search')?.trim().slice(0, 80) || undefined;

  return {
    ...(from ? { from } : {}),
    ...(to ? { to } : {}),
    ...(isUuid(accountIdValue) ? { accountId: accountIdValue } : {}),
    ...(isUuid(categoryIdValue) ? { categoryId: categoryIdValue } : {}),
    ...(typeValue === 'INCOME' || typeValue === 'EXPENSE'
      ? { type: typeValue }
      : {}),
    ...(search ? { search } : {}),
    page: parsePage(params.get('page')),
  };
}

export function filtersToParams(
  filters: TransactionFilters,
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.from !== undefined) params.set('from', filters.from);
  if (filters.to !== undefined) params.set('to', filters.to);
  if (filters.accountId !== undefined) params.set('accountId', filters.accountId);
  if (filters.categoryId !== undefined) {
    params.set('categoryId', filters.categoryId);
  }
  if (filters.type !== undefined) params.set('type', filters.type);
  if (filters.search !== undefined) params.set('search', filters.search);
  if (filters.page !== 1) params.set('page', String(filters.page));

  return params;
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return Boolean(
    filters.from ||
      filters.to ||
      filters.accountId ||
      filters.categoryId ||
      filters.type ||
      filters.search,
  );
}
