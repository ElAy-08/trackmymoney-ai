export const DEFAULT_ACCOUNT_NAME = 'Main account';

export const DEFAULT_CATEGORIES = [
  { name: 'Groceries', type: 'EXPENSE' },
  { name: 'Dining', type: 'EXPENSE' },
  { name: 'Transport', type: 'EXPENSE' },
  { name: 'Housing', type: 'EXPENSE' },
  { name: 'Health', type: 'EXPENSE' },
  { name: 'Leisure', type: 'EXPENSE' },
  { name: 'Shopping', type: 'EXPENSE' },
  { name: 'Subscriptions', type: 'EXPENSE' },
  { name: 'Education', type: 'EXPENSE' },
  { name: 'Other', type: 'EXPENSE' },
  { name: 'Salary', type: 'INCOME' },
  { name: 'Extra income', type: 'INCOME' },
  { name: 'Other', type: 'INCOME' },
] as const;