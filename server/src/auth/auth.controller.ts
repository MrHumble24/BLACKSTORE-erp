import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import type { Response } from 'express';
import type { PublicUser } from '../common/auth-user';
import { CurrentUser, Public } from '../common/decorators';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { UpdateMeDto } from './dto/update-me.dto';

/** Login, logout, current user and self-service settings; login is public and rate-limited. */
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @UseGuards(ThrottlerGuard)
  @Post('login')
  @HttpCode(200)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.auth.login(dto);
    this.auth.setSessionCookie(res, user.id);
    return { user };
  }

  @Get('me')
  me(@CurrentUser() user: PublicUser) {
    return { user };
  }

  @Patch('me')
  async updateMe(@CurrentUser() user: PublicUser, @Body() dto: UpdateMeDto) {
    return { user: await this.auth.updateLanguage(user, dto.language) };
  }

  @Post('logout')
  @HttpCode(204)
  logout(@Res({ passthrough: true }) res: Response): void {
    this.auth.clearSessionCookie(res);
  }
}
