const DATE_LOCALE = 'en-GB';

export function formatMoney(
  cents: number,
  currency: string,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

export function formatDay(value: string): string {
  return new Intl.DateTimeFormat(DATE_LOCALE, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export function formatMonth(key: string): string {
  const [yearText, monthText] = key.split('-');
  const year = Number(yearText);
  const month = Number(monthText);
  const date = new Date(Date.UTC(year, month - 1, 1));
  const options: Intl.DateTimeFormatOptions = {
    month: 'short',
    timeZone: 'UTC',
  };

  if (year !== new Date().getUTCFullYear()) {
    options.year = 'numeric';
  }

  return new Intl.DateTimeFormat(DATE_LOCALE, options).format(date);
}

export function formatCompactMoney(
  cents: number,
  currency: string,
  locale?: string,
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(cents / 100);
} 

export function formatPercent(percentage: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(percentage / 100);
}