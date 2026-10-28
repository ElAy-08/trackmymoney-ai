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
import type { AuthUser } from '../auth/auth-user.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { AccountService } from './account.service.js';
import { CreateAccountDto } from './dto/create-account.dto.js';
import { UpdateAccountDto } from './dto/update-account.dto.js';

@Controller('accounts')
export class AccountController {
    constructor(private readonly accounts: AccountService) { }

    @Get()
    list(@CurrentUser() user: AuthUser) {
        return this.accounts.findByUserId(user.id);
    }

    @Post()
    create(@CurrentUser() user: AuthUser, @Body() dto: CreateAccountDto) {
        return this.accounts.create(user.id, dto);
    }

    @Patch(':id')
    update(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateAccountDto,
    ) {
        return this.accounts.update(user.id, id, dto);
    }

    @HttpCode(200)
    @Post(':id/default')
    setDefault(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        return this.accounts.setDefault(user.id, id);
    }

    @HttpCode(204)
    @Delete(':id')
    async remove(
        @CurrentUser() user: AuthUser,
        @Param('id', ParseUUIDPipe) id: string,
    ) {
        await this.accounts.remove(user.id, id);
    }
}