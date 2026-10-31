import {
    Body,
    Controller,
    Delete,
    Get,
    HttpCode,
    Param,
    ParseUUIDPipe,
    Patch,
    Post,
    Query,
} from '@nestjs/common';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CategoryService } from './category.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Controller('categories')
export class CategoryController {
    constructor(private readonly categories: CategoryService) { }

    @Get()
    list(
        @CurrentUser() user: AuthUser,
        @Query() query: ListCategoriesQueryDto,
    ) {
        return this.categories.findAll(user.id, query);
    }

    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
        return this.categories.create(user.id, dto);
    }

    @Patch(':id')
    update(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCategoryDto,
    ) {
        return this.categories.update(user.id, id, dto);
    }

    @HttpCode(200)
    @Post(':id/archive')
    archive(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.categories.archive(user.id, id);
    }

    @HttpCode(200)
    @Post(':id/unarchive')
    unarchive(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.categories.unarchive(user.id, id);
    }

    @HttpCode(204)
    @Delete(':id')
    async remove(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        await this.categories.remove(user.id, id);
    }
}