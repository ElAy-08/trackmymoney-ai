import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { TransactionSource } from '../src/generated/prisma/enums.js';
import {
  DEFAULT_ACCOUNT_NAME,
  DEFAULT_CATEGORIES,
} from '../src/users/default-data.js';

const DEMO_EMAIL = 'demo@example.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo-password-123';
const TRANSACTION_BATCH_SIZE = 100;

type CategoryType = (typeof DEFAULT_CATEGORIES)[number]['type'];

type DemoTransaction = {
  userId: string;
  accountId: string;
  categoryId: string;
  type: CategoryType;
  amountCents: number;
  description: string;
  merchant: string;
  date: Date;
  source: typeof TransactionSource.MANUAL;
};

function mulberry32(seed: number): () => number {
  return function next() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function dateAtUtc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month, day));
}

function monthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${date.getUTCMonth()}`;
}

function amountBetween(random: () => number, minimum: number, maximum: number) {
  return Math.round(minimum + random() * (maximum - minimum));
}

async function seedDemo(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL is required to seed demo data.');
    process.exitCode = 1;
    return;
  }

  let database: URL;
  try {
    database = new URL(databaseUrl);
  } catch {
    console.error('DATABASE_URL must be a valid URL.');
    process.exitCode = 1;
    return;
  }

  const host = database.hostname + (database.port ? `:${database.port}` : '');
  console.log(`Database host: ${host}`);

  if (process.env.NODE_ENV === 'production') {
    console.error('Refusing to seed demo data in production.');
    process.exitCode = 1;
    return;
  }

  if (!process.argv.includes('--yes')) {
    console.error(
      'Pass --yes to confirm that the demo account may be replaced.',
    );
    process.exitCode = 1;
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });

  try {
    await prisma.$connect();
    const existing = await prisma.user.findUnique({
      where: { email: DEMO_EMAIL },
    });
    if (existing) {
      await prisma.user.delete({ where: { id: existing.id } });
    }

    const passwordHash = await argon2.hash(DEMO_PASSWORD);
    const user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        name: 'Demo User',
        passwordHash,
      },
    });

    await prisma.account.createMany({
      data: [
        {
          userId: user.id,
          name: DEFAULT_ACCOUNT_NAME,
          isDefault: true,
        },
        {
          userId: user.id,
          name: 'Savings',
          openingBalanceCents: 450000,
        },
      ],
    });

    await prisma.category.createMany({
      data: DEFAULT_CATEGORIES.map((category) => ({
        ...category,
        userId: user.id,
      })),
    });

    const [accounts, categories] = await Promise.all([
      prisma.account.findMany({ where: { userId: user.id } }),
      prisma.category.findMany({ where: { userId: user.id } }),
    ]);
    const defaultAccount = accounts.find(
      (account) => account.name === DEFAULT_ACCOUNT_NAME,
    );
    if (!defaultAccount) {
      throw new Error(
        'Could not find the default demo account after creation.',
      );
    }

    const categoryByNameAndType = new Map(
      categories.map((category) => [
        `${category.type}:${category.name}`,
        category,
      ]),
    );
    const random = mulberry32(0x5eed1234);
    const transactions: DemoTransaction[] = [];
    const today = new Date();
    const todayUtc = dateAtUtc(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate(),
    );
    const firstMonth = dateAtUtc(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth() - 5,
      1,
    );
    const noIncomeMonth = dateAtUtc(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth() - 2,
      1,
    );
    const highSpendingMonth = dateAtUtc(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth() - 1,
      1,
    );

    const addTransaction = (
      day: Date,
      categoryName: string,
      categoryType: CategoryType,
      amountCents: number,
      description: string,
      merchant: string,
    ) => {
      if (day > todayUtc) {
        return;
      }

      const category = categoryByNameAndType.get(
        `${categoryType}:${categoryName}`,
      );
      if (!category) {
        throw new Error(
          `Missing demo category: ${categoryType} ${categoryName}`,
        );
      }

      const adjustedAmount =
        categoryType === 'EXPENSE' &&
        monthKey(day) === monthKey(highSpendingMonth)
          ? Math.round(amountCents * 1.65)
          : amountCents;
      transactions.push({
        userId: user.id,
        accountId: defaultAccount.id,
        categoryId: category.id,
        type: category.type,
        amountCents: adjustedAmount,
        description,
        merchant,
        date: dateAtUtc(
          day.getUTCFullYear(),
          day.getUTCMonth(),
          day.getUTCDate(),
        ),
        source: TransactionSource.MANUAL,
      });
    };

    for (
      let month = firstMonth;
      month <= todayUtc;
      month = dateAtUtc(month.getUTCFullYear(), month.getUTCMonth() + 1, 1)
    ) {
      const year = month.getUTCFullYear();
      const monthIndex = month.getUTCMonth();
      const currentMonthKey = monthKey(month);
      const isNoIncomeMonth = currentMonthKey === monthKey(noIncomeMonth);

      if (!isNoIncomeMonth) {
        addTransaction(
          dateAtUtc(year, monthIndex, 1),
          'Salary',
          'INCOME',
          amountBetween(random, 365000, 425000),
          'Monthly salary',
          'Acme Technologies',
        );
      }

      addTransaction(
        dateAtUtc(year, monthIndex, 3),
        'Housing',
        'EXPENSE',
        amountBetween(random, 125000, 145000),
        'Monthly rent',
        'Greenfield Properties',
      );
      addTransaction(
        dateAtUtc(year, monthIndex, 5),
        'Subscriptions',
        'EXPENSE',
        amountBetween(random, 1199, 1899),
        'Streaming and music subscriptions',
        'StreamPlus',
      );

      if (monthKey(month) === monthKey(highSpendingMonth)) {
        addTransaction(
          dateAtUtc(year, monthIndex, 12),
          'Housing',
          'EXPENSE',
          135000,
          'Unexpected plumbing repair',
          'Reliable Home Repairs',
        );
      }

      const daysInMonth = dateAtUtc(year, monthIndex + 1, 0).getUTCDate();
      for (let weekStart = 1; weekStart <= daysInMonth; weekStart += 7) {
        const groceryTrips = random() < 0.5 ? 2 : 3;
        const weekEnd = Math.min(weekStart + 6, daysInMonth);
        for (let trip = 0; trip < groceryTrips; trip += 1) {
          const dayNumber =
            weekStart + Math.floor(random() * (weekEnd - weekStart + 1));
          const groceryDay = dateAtUtc(year, monthIndex, dayNumber);
          if (groceryDay > todayUtc) {
            continue;
          }
          addTransaction(
            groceryDay,
            'Groceries',
            'EXPENSE',
            amountBetween(random, 2800, 15500),
            random() < 0.5 ? 'Weekly grocery shop' : 'Fresh produce and pantry',
            random() < 0.5 ? 'Green Market' : 'FreshMart',
          );
        }
      }

      const daysToGenerate =
        currentMonthKey === monthKey(todayUtc)
          ? todayUtc.getUTCDate()
          : daysInMonth;
      for (let dayNumber = 1; dayNumber <= daysToGenerate; dayNumber += 1) {
        const day = dateAtUtc(year, monthIndex, dayNumber);
        if (day > todayUtc) {
          continue;
        }
        if (random() < 0.24) {
          addTransaction(
            day,
            'Dining',
            'EXPENSE',
            amountBetween(random, 1400, 6200),
            random() < 0.5 ? 'Dinner with friends' : 'Lunch out',
            random() < 0.5 ? 'Corner Bistro' : 'Noodle House',
          );
        }
        if (random() < 0.3) {
          addTransaction(
            day,
            'Transport',
            'EXPENSE',
            amountBetween(random, 250, 2400),
            random() < 0.5 ? 'Public transport' : 'Ride across town',
            random() < 0.5 ? 'Metro Transit' : 'CityCab',
          );
        }
        if (random() < 0.045) {
          addTransaction(
            day,
            'Shopping',
            'EXPENSE',
            amountBetween(random, 1800, 14000),
            random() < 0.5 ? 'Household essentials' : 'New clothes',
            random() < 0.5 ? 'Everyday Goods' : 'Northside Outfitters',
          );
        }
        if (random() < 0.055) {
          addTransaction(
            day,
            'Leisure',
            'EXPENSE',
            amountBetween(random, 1200, 9500),
            random() < 0.5 ? 'Weekend movie and snacks' : 'Museum tickets',
            random() < 0.5 ? 'Grand Cinema' : 'City Museum',
          );
        }
        if (random() < 0.04) {
          addTransaction(
            day,
            'Health',
            'EXPENSE',
            amountBetween(random, 900, 8500),
            random() < 0.5 ? 'Pharmacy essentials' : 'Clinic visit',
            random() < 0.5 ? 'Care Pharmacy' : 'Family Health Clinic',
          );
        }
      }

      if (!isNoIncomeMonth && random() < 0.25) {
        const dayNumber = Math.min(20 + Math.floor(random() * 9), daysInMonth);
        const extraIncomeDay = dateAtUtc(year, monthIndex, dayNumber);
        if (extraIncomeDay <= todayUtc) {
          addTransaction(
            extraIncomeDay,
            'Extra income',
            'INCOME',
            amountBetween(random, 2500, 25000),
            'Freelance project payment',
            'Independent Client',
          );
        }
      }
    }

    for (
      let offset = 0;
      offset < transactions.length;
      offset += TRANSACTION_BATCH_SIZE
    ) {
      await prisma.transaction.createMany({
        data: transactions.slice(offset, offset + TRANSACTION_BATCH_SIZE),
      });
    }

    console.log(
      `Created 2 accounts, ${categories.length} categories, and ${transactions.length} transactions for ${DEMO_EMAIL}.`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

seedDemo().catch((error: unknown) => {
  const errorName = error instanceof Error ? error.name : 'Unknown error';
  console.error(`Demo seed failed (${errorName}).`);
  process.exitCode = 1;
});
