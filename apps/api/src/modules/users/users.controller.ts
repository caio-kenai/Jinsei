import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  onboardingSchema,
  preferencesPatchSchema,
  passwordChangeSchema,
  accountDeleteSchema,
  mfaCodeInputSchema,
  mfaDisableSchema,
  type MfaCodeInput,
  type MfaDisableInput,
  type OnboardingInput,
  type PreferencesPatch,
} from '@jinsei/contracts';
import { CurrentUserId, type AuthenticatedRequest } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { UsersService } from './users.service';
import { AccountEmailService } from '../auth/account-email.service';
import { MfaService } from '../auth/mfa.service';
import { RateLimit } from '../../common/rate-limit';
import { cookieOptions } from '../auth/auth.controller';
import { SESSION_COOKIE } from '../auth/session.guard';

@ApiTags('Conta e preferências')
@ApiCookieAuth()
@Controller('users/me')
export class UsersController {
  constructor(
    @Inject(UsersService) private readonly users: UsersService,
    @Inject(AccountEmailService) private readonly accountEmail: AccountEmailService,
    @Inject(MfaService) private readonly mfa: MfaService,
  ) {}
  @Get()
  me(@CurrentUserId() userId: string) {
    return this.users.me(userId);
  }

  @Post('onboarding')
  @ApiZodBody(onboardingSchema)
  onboard(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(onboardingSchema)) input: OnboardingInput,
  ) {
    return this.users.update(userId, input, true);
  }

  @Patch('preferences')
  @ApiZodBody(preferencesPatchSchema)
  update(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(preferencesPatchSchema)) input: PreferencesPatch,
  ) {
    return this.users.update(userId, input);
  }

  @Get('export')
  @Header('Content-Disposition', 'attachment; filename="jinsei-data.json"')
  export(@CurrentUserId() userId: string) {
    return this.users.export(userId);
  }

  @Get('mfa')
  async mfaStatus(@CurrentUserId() userId: string) {
    const me = await this.users.me(userId);
    return {
      enabled: me.mfaEnabled,
      remainingRecoveryCodes: me.mfaEnabled ? await this.mfa.remainingCodes(userId) : 0,
    };
  }

  @Post('mfa/setup')
  @RateLimit(10)
  mfaSetup(@CurrentUserId() userId: string) {
    return this.mfa.setup(userId);
  }

  @Post('mfa/enable')
  @RateLimit(10)
  @ApiZodBody(mfaCodeInputSchema)
  mfaEnable(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(mfaCodeInputSchema)) input: MfaCodeInput,
  ) {
    return this.mfa.enable(userId, input.code);
  }

  @Post('mfa/recovery-codes')
  @RateLimit(5)
  @ApiZodBody(mfaCodeInputSchema)
  mfaRecoveryCodes(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(mfaCodeInputSchema)) input: MfaCodeInput,
  ) {
    return this.mfa.regenerate(userId, input.code);
  }

  @Post('mfa/disable')
  @RateLimit(5)
  @ApiZodBody(mfaDisableSchema)
  mfaDisable(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(mfaDisableSchema)) input: MfaDisableInput,
  ) {
    return this.mfa.disable(userId, input.password, input.code);
  }

  @Post('email/verification')
  @RateLimit(3)
  resendVerification(@CurrentUserId() userId: string) {
    return this.accountEmail.sendVerification(userId);
  }

  @Get('sessions')
  sessions(@Req() request: AuthenticatedRequest) {
    return this.users.sessions(request.userId, request.sessionId);
  }

  @Delete('sessions')
  endOtherSessions(@Req() request: AuthenticatedRequest) {
    return this.users.endOtherSessions(request.userId, request.sessionId);
  }

  @Delete('sessions/:id')
  endSession(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    return this.users.endSession(request.userId, request.sessionId, id);
  }

  @Patch('password')
  @ApiZodBody(passwordChangeSchema)
  async password(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(passwordChangeSchema))
    input: { currentPassword: string; newPassword: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.users.changePassword(
      userId,
      input.currentPassword,
      input.newPassword,
    );
    response.clearCookie(SESSION_COOKIE, cookieOptions);
    return result;
  }

  @Delete()
  @ApiZodBody(accountDeleteSchema)
  async remove(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(accountDeleteSchema)) input: { password: string },
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.users.remove(userId, input.password);
    response.clearCookie(SESSION_COOKIE, cookieOptions);
    return result;
  }
}
