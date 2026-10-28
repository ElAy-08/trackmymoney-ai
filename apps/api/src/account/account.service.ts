import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AccountService {
    constructor(private readonly prisma: PrismaService) { }

    findByUserId(userId: string) {
        return this.prisma.account.findMany({ where: { userId } })
    }

    findById(id: string) {
        return this.prisma.account.findUnique({ where: { id } });
    }

    create(data: {
        userId: string;
        name: string;
        currency: string;
        isDefault: boolean;
    }) {
        return this.prisma.account.create({ data });
    }

    update(data: {
        userId: string;
        name: string;
        currency: string;
        isDefault: boolean;
    }, id: string) {
        return this.prisma.account.update({
            where: { id },
            data: data,
        });
    }

    delete(id: string){
        return this.prisma.account.delete({where: {id}})
    }
}
