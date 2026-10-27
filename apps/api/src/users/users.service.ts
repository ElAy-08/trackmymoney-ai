import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { DEFAULT_ACCOUNT_NAME, DEFAULT_CATEGORIES } from './default-data.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  createWithDefaults(data: {
    name: string;
    email: string;
    passwordHash: string;
  }) {
    // One transaction: if any insert fails, nothing is saved.
    return this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({ data });

      await tx.account.create({
        data: { userId: user.id, name: DEFAULT_ACCOUNT_NAME, isDefault: true },
      });

      await tx.category.createMany({
        data: DEFAULT_CATEGORIES.map((category) => ({
          ...category,
          userId: user.id,
        })),
      });

      return user;
    });
  }
}