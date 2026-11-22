import { Body, Controller, Delete, Get, HttpCode, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { AuthUser } from './auth-user.js';
import { AuthService } from './auth.service.js';
import { CurrentUser } from './current-user.decorator.js';
import { DeleteAccountDto } from './dto/delete-account.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { RefreshTokenDto } from './dto/refresh-token.dto.js';
import { RegisterDto } from './dto/register.dto.js';
import {
  AuthResponseDto,
  PublicUserDto,
  TokensResponseDto,
} from './dto/auth-response.dto.js';
import { Public } from './public.decorator.js';

@Controller('auth')
@ApiTags('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } }) // 10 per hour
  @Post('register')
  @ApiOperation({ summary: 'Register a user' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'The registration details are invalid.' })
  @ApiConflictResponse({ description: 'A user with this email already exists.' })
  @ApiTooManyRequestsResponse({ description: 'The registration rate limit was exceeded.' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60 * 1000 } }) // 5 per minute
  @HttpCode(200)
  @Post('login')
  @ApiOperation({ summary: 'Log in' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiBadRequestResponse({ description: 'The login details are invalid.' })
  @ApiUnauthorizedResponse({ description: 'The email or password is incorrect.' })
  @ApiTooManyRequestsResponse({ description: 'The login rate limit was exceeded.' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Public()
  @HttpCode(200)
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access and refresh tokens' })
  @ApiOkResponse({ type: TokensResponseDto })
  @ApiBadRequestResponse({ description: 'The refresh token is missing or invalid.' })
  @ApiUnauthorizedResponse({ description: 'The refresh token is invalid, revoked, or expired.' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @Public()
  @HttpCode(204)
  @Post('logout')
  @ApiOperation({ summary: 'Log out' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'The refresh token does not meet the required constraints.' })
  async logout(@Body() dto: RefreshTokenDto) {
    await this.auth.logout(dto.refreshToken);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user' })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @HttpCode(204)
  @Delete('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete the current user account' })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'The password is missing or invalid.' })
  @ApiForbiddenResponse({ description: 'The password confirmation is incorrect.' })
  @ApiUnauthorizedResponse({ description: 'Missing, invalid or expired access token.' })
  async deleteAccount(
    @CurrentUser() user: AuthUser,
    @Body() dto: DeleteAccountDto,
  ) {
    await this.auth.deleteAccount(user.id, dto.password);
  }
}
