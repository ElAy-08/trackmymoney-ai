import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UpdateTransactionDto } from './dto/update-transaction.dto.js';
import { AccountService } from '../account/account.service.js';
import { CategoryService } from '../category/category.service.js';
import { TransactionSource, TransactionType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTransactionDto } from './dto/create-transaction.dto.js';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto.js';
import type { Prisma } from '../generated/prisma/client.js';

@Injectable()
export class TransactionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly accounts: AccountService,
        private readonly categories: CategoryService,
    ) { }

    async create(
        userId: string,
        dto: CreateTransactionDto,
        source: TransactionSource = TransactionSource.MANUAL,
    ) {
        await this.accounts.findById(userId, dto.accountId);
        const category = await this.categories.findById(userId, dto.categoryId);

        if (category.archivedAt) {
            throw new BadRequestException('Category is archived');
        }

        return this.prisma.transaction.create({
            data: {
                userId,
                accountId: dto.accountId,
                categoryId: dto.categoryId,
                type: category.type,
                amountCents: dto.amountCents,
                description: dto.description,
                merchant: dto.merchant,
                date: new Date(`${dto.date}T00:00:00.000Z`),
                source,
            },
        });
    }

    async findAll(userId: string, query: ListTransactionsQueryDto) {
        const { from, to, accountId, categoryId, type, search, page, pageSize } = query;

        if (from && to && from > to) {
            throw new BadRequestException('"from" must not be after "to"');
        }

        const where: Prisma.TransactionWhereInput = {
            userId,
            ...(accountId ? { accountId } : {}),
            ...(categoryId ? { categoryId } : {}),
            ...(type ? { type } : {}),
            ...(from || to
                ? {
                    date: {
                        ...(from ? { gte: this.toDate(from) } : {}),
                        ...(to ? { lte: this.toDate(to) } : {}),
                    },
                }
                : {}),
            ...(search
                ? {
                    OR: [
                        { description: { contains: search, mode: 'insensitive' } },
                        { merchant: { contains: search, mode: 'insensitive' } },
                    ],
                }
                : {}),
        };

        const [items, total] = await this.prisma.$transaction([
            this.prisma.transaction.findMany({
                where,
                orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    category: { select: { id: true, name: true, color: true, icon: true } },
                    account: { select: { id: true, name: true } },
                },
            }),
            this.prisma.transaction.count({ where }),
        ]);

        return {
            items,
            total,
            page,
            pageSize,
            totalPages: Math.ceil(total / pageSize),
        };
    }

    private toDate(day: string) {
        return new Date(`${day}T00:00:00.000Z`);
    }

  async findOneOrFail(userId: string, id: string) {
    const transaction = await this.prisma.transaction.findFirst({
      where: { id, userId },
      include: {
        category: { select: { id: true, name: true, color: true, icon: true } },
        account: { select: { id: true, name: true } },
      },
    });
    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }
    return transaction;
  }

  async update(userId: string, id: string, dto: UpdateTransactionDto) {
    const existing = await this.findOneOrFail(userId, id);

    if (dto.accountId && dto.accountId !== existing.accountId) {
      await this.accounts.findById(userId, dto.accountId);
    }

    let type = existing.type;
    if (dto.categoryId && dto.categoryId !== existing.categoryId) {
      const category = await this.categories.findById(userId, dto.categoryId);
      if (category.archivedAt) {
        throw new BadRequestException('Category is archived');
      }
      type = category.type;
    }

    try {
      return await this.prisma.transaction.update({
        where: { id, userId },
        data: {
          accountId: dto.accountId,
          categoryId: dto.categoryId,
          type,
          amountCents: dto.amountCents,
          description: dto.description,
          merchant: dto.merchant,
          date: dto.date ? this.toDate(dto.date) : undefined,
        },
        include: {
          category: { select: { id: true, name: true, color: true, icon: true } },
          account: { select: { id: true, name: true } },
        },
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2025') {
        throw new NotFoundException('Transaction not found');
      }
      throw error;
    }
  }

  async remove(userId: string, id: string) {
    const { count } = await this.prisma.transaction.deleteMany({
      where: { id, userId },
    });
    if (count === 0) {
      throw new NotFoundException('Transaction not found');
    }
  }
}