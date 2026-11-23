import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { hasActiveFilters } from './filters';
import { useAccounts, useCategories } from './hooks';
import { useTransactionFilters } from './use-transaction-filters';

const ALL_VALUE = 'all';

export function TransactionFiltersBar() {
  const { filters, setFilters, clearFilters } = useTransactionFilters();
  const categories = useCategories();
  const accounts = useAccounts();
  const searchInput = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (searchInput.current) {
      searchInput.current.value = filters.search ?? '';
    }
    if (searchTimeout.current !== undefined) {
      window.clearTimeout(searchTimeout.current);
      searchTimeout.current = undefined;
    }
  }, [filters.search]);

  useEffect(() => {
    return () => {
      if (searchTimeout.current !== undefined) {
        window.clearTimeout(searchTimeout.current);
      }
    };
  }, []);

  return (
    <section
      aria-label="Transaction filters"
      className="space-y-4 rounded-lg border p-4"
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-2 lg:col-span-2">
          <label className="text-sm font-medium" htmlFor="transaction-search">
            Search
          </label>
          <Input
            ref={searchInput}
            id="transaction-search"
            type="search"
            defaultValue={filters.search ?? ''}
            maxLength={80}
            placeholder="Search descriptions or merchants"
            onChange={(event) => {
              const nextSearch = event.currentTarget.value.trim().slice(0, 80);
              if (searchTimeout.current !== undefined) {
                window.clearTimeout(searchTimeout.current);
              }
              if (nextSearch === (filters.search ?? '')) {
                searchTimeout.current = undefined;
                return;
              }
              searchTimeout.current = window.setTimeout(() => {
                searchTimeout.current = undefined;
                setFilters({ search: nextSearch || undefined });
              }, 300);
            }}
          />
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Type</span>
          <Select
            value={filters.type ?? ALL_VALUE}
            onValueChange={(value) => {
              if (value === ALL_VALUE) {
                setFilters({ type: undefined });
              } else if (value === 'INCOME' || value === 'EXPENSE') {
                setFilters({ type: value });
              }
            }}
          >
            <SelectTrigger aria-label="Type" className="w-full">
              <SelectValue>
                {filters.type === 'INCOME'
                  ? 'Income'
                  : filters.type === 'EXPENSE'
                    ? 'Expense'
                    : 'All types'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All types</SelectItem>
              <SelectItem value="INCOME">Income</SelectItem>
              <SelectItem value="EXPENSE">Expense</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Category</span>
          <Select
            value={filters.categoryId ?? ALL_VALUE}
            onValueChange={(value) =>
              setFilters({
                categoryId: value === ALL_VALUE ? undefined : value ?? undefined,
              })
            }
          >
            <SelectTrigger aria-label="Category" className="w-full">
              <SelectValue>
                {categories.data?.find(
                  (category) => category.id === filters.categoryId,
                )?.name ?? 'All categories'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All categories</SelectItem>
              {categories.data?.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                  {category.archivedAt ? ' (archived)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {categories.isError ? (
            <p className="text-xs text-destructive" role="status">
              Could not load categories.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <span className="text-sm font-medium">Account</span>
          <Select
            value={filters.accountId ?? ALL_VALUE}
            onValueChange={(value) =>
              setFilters({
                accountId: value === ALL_VALUE ? undefined : value ?? undefined,
              })
            }
          >
            <SelectTrigger aria-label="Account" className="w-full">
              <SelectValue>
                {accounts.data?.find(
                  (account) => account.id === filters.accountId,
                )?.name ?? 'All accounts'}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All accounts</SelectItem>
              {accounts.data?.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {accounts.isError ? (
            <p className="text-xs text-destructive" role="status">
              Could not load accounts.
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="transaction-from">
            From
          </label>
          <Input
            id="transaction-from"
            type="date"
            value={filters.from ?? ''}
            onChange={(event) =>
              setFilters({ from: event.currentTarget.value || undefined })
            }
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="transaction-to">
            To
          </label>
          <Input
            id="transaction-to"
            type="date"
            value={filters.to ?? ''}
            onChange={(event) =>
              setFilters({ to: event.currentTarget.value || undefined })
            }
          />
        </div>

        {hasActiveFilters(filters) ? (
          <div className="flex items-end">
            <Button variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
