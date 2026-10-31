import {
    ConflictException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { TransactionType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CategoryService {
    constructor(private readonly prisma: PrismaService) { }

    findAll(
        userId: string,
        query: { type?: TransactionType; includeArchived?: boolean },
    ) {
        return this.prisma.category.findMany({
            where: {
                userId,
                ...(query.type ? { type: query.type } : {}),
                ...(query.includeArchived ? {} : { archivedAt: null }),
            },
            orderBy: [{ type: 'asc' }, { name: 'asc' }],
        });
    }

    // Returns 404 (not 403) for other users' categories, so ids can't be probed.
    async findById(userId: string, id: string) {
        const category = await this.prisma.category.findFirst({
            where: { id, userId },
        });
        if (!category) {
            throw new NotFoundException('Category not found');
        }
        return category;
    }

    async create(
        userId: string,
        data: {
            name: string;
            type: TransactionType;
            color?: string;
            icon?: string;
        },
    ) {
        try {
            return await this.prisma.category.create({ data: { ...data, userId } });
        } catch (error) {
            if ((error as { code?: string }).code === 'P2002') {
                const existing = await this.prisma.category.findFirst({
                    where: { userId, type: data.type, name: data.name },
                });
                throw new ConflictException(
                    existing?.archivedAt
                        ? 'An archived category with that name exists, restore it instead'
                        : 'You already have a category with that name',
                );
            }
            this.rethrowKnown(error);
        }
    }

    async update(
        userId: string,
        id: string,
        data: { name?: string; color?: string; icon?: string },
    ) {
        try {
            return await this.prisma.category.update({
                where: { id, userId },
                data,
            });
        } catch (error) {
            this.rethrowKnown(error);
        }
    }

    async archive(userId: string, id: string) {
        const category = await this.findById(userId, id);
        if (category.archivedAt) {
            return category;
        }
        return this.prisma.category.update({
            where: { id, userId },
            data: { archivedAt: new Date() },
        });
    }

    async unarchive(userId: string, id: string) {
        const category = await this.findById(userId, id);
        if (!category.archivedAt) {
            return category;
        }
        return this.prisma.category.update({
            where: { id, userId },
            data: { archivedAt: null },
        });
    }

    async remove(userId: string, id: string) {
        await this.findById(userId, id);
        try {
            await this.prisma.category.delete({ where: { id, userId } });
        } catch (error) {
            this.rethrowKnown(error);
        }
    }

    private rethrowKnown(error: unknown): never {
        const code = (error as { code?: string }).code;
        if (code === 'P2002') {
            throw new ConflictException('You already have a category with that name');
        }
        if (code === 'P2025') {
            throw new NotFoundException('Category not found');
        }
        if (code === 'P2003') {
            throw new ConflictException(
                'This category has transactions, archive it instead',
            );
        }
        throw error;
    }
}