import { TransactionFiltersBar } from '@/features/transactions/transaction-filters-bar';
import { TransactionsPagination } from '@/features/transactions/transactions-pagination';
import { TransactionsTable } from '@/features/transactions/transactions-table';

export function TransactionsPage() {
  return (
    <div className="space-y-6">
      <title>Transactions · TrackMyMoney AI</title>
      <h1 className="text-2xl font-semibold">Transactions</h1>
      <TransactionFiltersBar />
      <TransactionsTable />
      <TransactionsPagination />
    </div>
  );
}
