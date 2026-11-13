import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { credentialsSchema, type Credentials } from '@jinsei/contracts';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { Public, SESSION_COOKIE, type AuthenticatedRequest } from './session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';

export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(PrismaService) private readonly db: PrismaService,
  ) {}

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiZodBody(credentialsSchema)
  async register(
    @Body(new ZodPipe(credentialsSchema)) input: Credentials,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.register(input);
    response.cookie(SESSION_COOKIE, session.token, {
      ...cookieOptions,
      expires: session.expiresAt,
    });
    return { authenticated: true };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiZodBody(credentialsSchema)
  async login(
    @Body(new ZodPipe(credentialsSchema)) input: Credentials,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.login(input);
    response.cookie(SESSION_COOKIE, session.token, {
      ...cookieOptions,
      expires: session.expiresAt,
    });
    return { authenticated: true };
  }

  @Post('logout')
  @HttpCode(200)
  @ApiCookieAuth()
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    await this.db.session.deleteMany({ where: { id: request.sessionId, userId: request.userId } });
    response.clearCookie(SESSION_COOKIE, cookieOptions);
    return { authenticated: false };
  }
}
