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
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiConflictResponse,
    ApiNotFoundResponse,
    ApiOperation,
    ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { CategoryService } from './category.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { ListCategoriesQueryDto } from './dto/list-categories-query.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Controller('categories')
@ApiTags('categories')
@ApiBearerAuth()
export class CategoryController {
    constructor(private readonly categories: CategoryService) { }

    @Get()
    @ApiOperation({ summary: 'List categories' })
    @ApiBadRequestResponse({ description: 'The query parameters are invalid.' })
    list(
        @CurrentUser() user: AuthUser,
        @Query() query: ListCategoriesQueryDto,
    ) {
        return this.categories.findAll(user.id, query);
    }

    @Post()
    @ApiOperation({ summary: 'Create a category' })
    @ApiBadRequestResponse({ description: 'The category details are invalid.' })
    @ApiConflictResponse({ description: 'A category with that name already exists.' })
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateCategoryDto) {
        return this.categories.create(user.id, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a category' })
    @ApiBadRequestResponse({ description: 'The category ID or details are invalid.' })
    @ApiNotFoundResponse({ description: 'The category was not found.' })
    @ApiConflictResponse({ description: 'A category with that name already exists.' })
    update(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateCategoryDto,
    ) {
        return this.categories.update(user.id, id, dto);
    }

    @HttpCode(200)
    @Post(':id/archive')
    @ApiOperation({ summary: 'Archive a category' })
    @ApiBadRequestResponse({ description: 'The category ID is invalid.' })
    @ApiNotFoundResponse({ description: 'The category was not found.' })
    archive(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.categories.archive(user.id, id);
    }

    @HttpCode(200)
    @Post(':id/unarchive')
    @ApiOperation({ summary: 'Restore an archived category' })
    @ApiBadRequestResponse({ description: 'The category ID is invalid.' })
    @ApiNotFoundResponse({ description: 'The category was not found.' })
    unarchive(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.categories.unarchive(user.id, id);
    }

    @HttpCode(204)
    @Delete(':id')
    @ApiOperation({ summary: 'Delete a category' })
    @ApiBadRequestResponse({ description: 'The category ID is invalid.' })
    @ApiNotFoundResponse({ description: 'The category was not found.' })
    @ApiConflictResponse({ description: 'A category with transactions cannot be deleted.' })
    async remove(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        await this.categories.remove(user.id, id);
    }
}