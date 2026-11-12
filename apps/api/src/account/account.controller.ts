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
import { AccountService } from './account.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';

@Controller('accounts')
@ApiTags('accounts')
@ApiBearerAuth()
export class AccountController {
    constructor(private readonly accounts: AccountService) { }

    @Get()
    @ApiOperation({ summary: 'List accounts' })
    list(@CurrentUser() user: AuthUser) {
        return this.accounts.findByUserId(user.id);
    }

    @Post()
    @ApiOperation({ summary: 'Create an account' })
    @ApiBadRequestResponse({ description: 'The account details are invalid.' })
    @ApiConflictResponse({ description: 'An account with that name already exists.' })
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateAccountDto) {
        return this.accounts.create(user.id, dto);
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an account' })
    @ApiBadRequestResponse({ description: 'The account ID or details are invalid.' })
    @ApiNotFoundResponse({ description: 'The account was not found.' })
    @ApiConflictResponse({ description: 'An account with that name already exists.' })
    update(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAccountDto,
    ) {
        return this.accounts.update(user.id, id, dto);
    }

    @HttpCode(200)
    @Post(':id/default')
    @ApiOperation({ summary: 'Set the default account' })
    @ApiBadRequestResponse({ description: 'The account ID is invalid.' })
    @ApiNotFoundResponse({ description: 'The account was not found.' })
    setDefault(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.accounts.setDefault(user.id, id);
    }

    @HttpCode(204)
    @Delete(':id')
    @ApiOperation({ summary: 'Delete an account' })
    @ApiBadRequestResponse({ description: 'The account ID is invalid.' })
    @ApiNotFoundResponse({ description: 'The account was not found.' })
    @ApiConflictResponse({ description: 'The default account or an account with transactions cannot be deleted.' })
    async remove(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        await this.accounts.remove(user.id, id);
    }
}