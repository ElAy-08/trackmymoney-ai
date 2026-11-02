import { BadRequestException, Injectable } from '@nestjs/common';
import { AccountService } from '../account/account.service.js';
import type { Prisma } from '../generated/prisma/client.js';
import { TransactionType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { ByCategoryQueryDto } from './dto/by-category-query.dto.js';
import { MonthlyQueryDto } from './dto/monthly-query.dto.js';
import { StatsPeriodQueryDto } from './dto/stats-period-query.dto.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountService,
  ) {}

  async summary(userId: string, query: StatsPeriodQueryDto) {
    const period = this.resolvePeriod(query.from, query.to);
    if (query.accountId) {
      await this.accounts.findById(userId, query.accountId);
    }
    const where = this.buildWhere(userId, period, query.accountId);

    const [totals, balances] = await Promise.all([
      this.prisma.transaction.groupBy({
        by: ['type'],
        where,
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      this.balances(userId),
    ]);

    let incomeCents = 0;
    let expenseCents = 0;
    let transactionCount = 0;
    for (const row of totals) {
      const sum = row._sum.amountCents ?? 0;
      if (row.type === TransactionType.INCOME) {
        incomeCents = sum;
      } else {
        expenseCents = sum;
      }
      transactionCount += row._count._all;
    }

    return {
      period,
      incomeCents,
      expenseCents,
      netCents: incomeCents - expenseCents,
      transactionCount,
      balances,
    };
  }

  async byCategory(userId: string, query: ByCategoryQueryDto) {
    const period = this.resolvePeriod(query.from, query.to);
    if (query.accountId) {
      await this.accounts.findById(userId, query.accountId);
    }
    const where = this.buildWhere(userId, period, query.accountId, query.type);

    const groups = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where,
      _sum: { amountCents: true },
      _count: { _all: true },
    });

    // groupBy only gives ids, so the names come from a second query,
    // scoped to the same user.
    const categories = await this.prisma.category.findMany({
      where: { userId, id: { in: groups.map((group) => group.categoryId) } },
      select: { id: true, name: true, color: true },
    });
    const categoryById = new Map(categories.map((c) => [c.id, c]));

    const totalCents = groups.reduce(
      (sum, group) => sum + (group._sum.amountCents ?? 0),
      0,
    );

    const items = groups
      .map((group) => {
        const category = categoryById.get(group.categoryId);
        const groupTotal = group._sum.amountCents ?? 0;
        return {
          categoryId: group.categoryId,
          name: category?.name ?? 'Unknown',
          color: category?.color ?? null,
          totalCents: groupTotal,
          count: group._count._all,
          percentage:
            totalCents > 0
              ? Math.round((groupTotal / totalCents) * 1000) / 10
              : 0,
        };
      })
      .sort((a, b) => b.totalCents - a.totalCents);

    return { period, type: query.type, totalCents, items };
  }

  async monthly(userId: string, query: MonthlyQueryDto) {
    const { months } = query;
    if (query.accountId) {
      await this.accounts.findById(userId, query.accountId);
    }

    // Month keys from oldest to newest, e.g. ['2026-05', ..., '2026-10'].
    const now = new Date();
    const keys: string[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      keys.push(month.toISOString().slice(0, 7));
    }
    const startDay = `${keys[0]}-01`;
    const endDay = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
    )
      .toISOString()
      .slice(0, 10); 

    // Raw SQL, because groupBy can't group by "the month of a date".
    const rows = await this.prisma.$queryRaw<
      { month: string; income: bigint; expense: bigint }[]
    >`
      SELECT to_char(date_trunc('month', "date"), 'YYYY-MM') AS month,
             COALESCE(SUM("amountCents") FILTER (WHERE "type" = 'INCOME'), 0) AS income,
             COALESCE(SUM("amountCents") FILTER (WHERE "type" = 'EXPENSE'), 0) AS expense
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND "date" >= ${startDay}::date
        AND "date" < ${endDay}::date
        AND (${query.accountId ?? null}::text IS NULL OR "accountId" = ${query.accountId ?? null})
      GROUP BY 1
      ORDER BY 1
    `;

    // Postgres returns sums as BigInt, which JSON can't serialize.
    const byMonth = new Map(
      rows.map((row) => [
        row.month,
        { incomeCents: Number(row.income), expenseCents: Number(row.expense) },
      ]),
    );

    // Months with no transactions aren't in the result, so fill them with zeros.
    return {
      months: keys.map((month) => ({
        month,
        incomeCents: byMonth.get(month)?.incomeCents ?? 0,
        expenseCents: byMonth.get(month)?.expenseCents ?? 0,
      })),
    };
  }

  // Balance = opening balance + income - expenses, over ALL time and ALL accounts.
  private async balances(userId: string) {
    const [accounts, totals] = await Promise.all([
      this.prisma.account.findMany({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
      }),
      this.prisma.transaction.groupBy({
        by: ['accountId', 'type'],
        where: { userId },
        _sum: { amountCents: true },
      }),
    ]);

    const netByAccount = new Map<string, number>();
    for (const row of totals) {
      const sum = row._sum.amountCents ?? 0;
      const signed = row.type === TransactionType.INCOME ? sum : -sum;
      netByAccount.set(
        row.accountId,
        (netByAccount.get(row.accountId) ?? 0) + signed,
      );
    }

    // Accounts with no transactions still appear, with just the opening balance.
    return accounts.map((account) => ({
      accountId: account.id,
      name: account.name,
      currency: account.currency,
      balanceCents: account.openingBalanceCents + (netByAccount.get(account.id) ?? 0),
    }));
  }

  private resolvePeriod(from?: string, to?: string) {
    if (from && to && from > to) {
      throw new BadRequestException('"from" must not be after "to"');
    }
    const anchor = from ?? to ?? new Date().toISOString().slice(0, 10);
    return {
      from: from ?? `${anchor.slice(0, 7)}-01`,
      to: to ?? this.lastDayOfMonth(anchor),
    };
  }

  private lastDayOfMonth(day: string) {
    const [year, month] = day.split('-').map(Number);
    // Day 0 of the next month is the last day of this one.
    return new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
  }

  // userId first, always. The rest narrows it down.
  private buildWhere(
    userId: string,
    period: { from: string; to: string },
    accountId?: string,
    type?: TransactionType,
  ): Prisma.TransactionWhereInput {
    return {
      userId,
      date: {
        gte: this.toDate(period.from),
        lte: this.toDate(period.to),
      },
      ...(accountId ? { accountId } : {}),
      ...(type ? { type } : {}),
    };
  }

  private toDate(day: string) {
    return new Date(`${day}T00:00:00.000Z`);
  }
}