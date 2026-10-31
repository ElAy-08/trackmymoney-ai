import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AccountService {
    constructor(private readonly prisma: PrismaService) { }

    findByUserId(userId: string) {
        return this.prisma.account.findMany({
            where: { userId },
            orderBy: [{ isDefault: 'desc' }, { name: 'asc' }],
        });
    }

    // Returns 404 (not 403) for other users' accounts, so ids can't be probed.
    async findById(userId: string, id: string) {
        const account = await this.prisma.account.findFirst({
            where: { id, userId },
        });
        if (!account) {
            throw new NotFoundException('Account not found');
        }
        return account;
    }

    async create(
        userId: string,
        data: { name: string; currency?: string; openingBalanceCents?: number },
    ) {
        try {
            return await this.prisma.account.create({ data: { ...data, userId } });
        } catch (error) {
            this.rethrowKnown(error);
        }
    }

    async update(
        userId: string,
        id: string,
        data: { name?: string; openingBalanceCents?: number },
    ) {
        try {
            return await this.prisma.account.update({
                where: { id, userId },
                data,
            });
        } catch (error) {
            this.rethrowKnown(error);
        }
    }

    async setDefault(userId: string, id: string) {
        await this.findById(userId, id);
        await this.prisma.$transaction([
            this.prisma.account.updateMany({
                where: { userId, isDefault: true },
                data: { isDefault: false },
            }),
            this.prisma.account.update({
                where: { id, userId },
                data: { isDefault: true },
            }),
        ]);
        return this.findById(userId, id);
    }

    async remove(userId: string, id: string) {
        const account = await this.findById(userId, id);
        if (account.isDefault) {
            throw new ConflictException(
                'Set another account as default before deleting this one',
            );
        }
        try {
            await this.prisma.account.delete({ where: { id, userId } });
        } catch (error) {
            this.rethrowKnown(error);
        }
    }

    private rethrowKnown(error: unknown): never {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            throw new ConflictException('You already have an account with that name');
        }
        if (code === 'P2025') {
            throw new NotFoundException('Account not found');
        }
        if (code === 'P2003') {
            throw new ConflictException('This account still has transactions');
        }
        throw error;
    }
}