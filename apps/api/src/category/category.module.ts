import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { CategoryService } from './category.service.js';
import { CategoryController } from './category.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [CategoryService],
    exports: [CategoryService],
  controllers: [CategoryController]
})
export class CategoryModule {}
