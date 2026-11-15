import { Body, Controller, HttpCode, Inject, Post, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { RateLimit } from '../../common/rate-limit';
import {
  credentialsSchema,
  forgotPasswordSchema,
  loginMfaSchema,
  registrationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  type Credentials,
  type ForgotPasswordInput,
  type LoginMfaInput,
  type RegistrationInput,
  type ResetPasswordInput,
  type VerifyEmailInput,
} from '@jinsei/contracts';
import type { Request, Response } from 'express';
import { AccountEmailService } from './account-email.service';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';
import { Public, SESSION_COOKIE, type AuthenticatedRequest } from './session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';

export const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production' && env.WEB_ORIGIN.startsWith('https://'),
  sameSite: 'lax' as const,
  path: '/',
};

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(AccountEmailService) private readonly accountEmail: AccountEmailService,
    @Inject(MfaService) private readonly mfa: MfaService,
    @Inject(PrismaService) private readonly db: PrismaService,
  ) {}

  @Public()
  @Post('register')
  @RateLimit(5)
  @ApiZodBody(registrationSchema)
  async register(
    @Body(new ZodPipe(registrationSchema)) input: RegistrationInput,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const session = await this.auth.register(input, request.get('user-agent') ?? '');
    void this.accountEmail.sendVerification(session.userId).catch(() => undefined);
    response.cookie(SESSION_COOKIE, session.token, {
      ...cookieOptions,
      expires: session.expiresAt,
    });
    return { authenticated: true };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @RateLimit(10)
  @ApiZodBody(credentialsSchema)
  async login(
    @Body(new ZodPipe(credentialsSchema)) input: Credentials,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.login(input, request.get('user-agent') ?? '');
    if ('challenge' in result) return { mfaRequired: true, challenge: result.challenge };
    response.cookie(SESSION_COOKIE, result.session.token, {
      ...cookieOptions,
      expires: result.session.expiresAt,
    });
    return { authenticated: true };
  }

  @Public()
  @Post('login/mfa')
  @HttpCode(200)
  @RateLimit(10)
  @ApiZodBody(loginMfaSchema)
  async loginMfa(
    @Body(new ZodPipe(loginMfaSchema)) input: LoginMfaInput,
    @Res({ passthrough: true }) response: Response,
  ) {
    const { userId, userAgent } = await this.mfa.completeChallenge(input.challenge, input.code);
    const session = await this.auth.createSession(userId, userAgent);
    response.cookie(SESSION_COOKIE, session.token, {
      ...cookieOptions,
      expires: session.expiresAt,
    });
    return { authenticated: true };
  }

  @Public()
  @Post('password/forgot')
  @HttpCode(200)
  @RateLimit(5)
  @ApiZodBody(forgotPasswordSchema)
  forgot(@Body(new ZodPipe(forgotPasswordSchema)) input: ForgotPasswordInput) {
    return this.accountEmail.forgot(input.email);
  }

  @Public()
  @Post('password/reset')
  @HttpCode(200)
  @RateLimit(10)
  @ApiZodBody(resetPasswordSchema)
  reset(@Body(new ZodPipe(resetPasswordSchema)) input: ResetPasswordInput) {
    return this.accountEmail.reset(input.token, input.password);
  }

  @Public()
  @Post('email/verify')
  @HttpCode(200)
  @RateLimit(20)
  @ApiZodBody(verifyEmailSchema)
  verifyEmail(@Body(new ZodPipe(verifyEmailSchema)) input: VerifyEmailInput) {
    return this.accountEmail.verify(input.token);
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
