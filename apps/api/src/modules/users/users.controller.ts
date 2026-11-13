import { Body, Controller, Delete, Get, Header, Inject, Patch, Post, Res } from '@nestjs/common';
import type { Response } from 'express';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  onboardingSchema,
  preferencesPatchSchema,
  passwordChangeSchema,
  accountDeleteSchema,
  type OnboardingInput,
  type PreferencesPatch,
} from '@jinsei/contracts';
import { CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { UsersService } from './users.service';
import { cookieOptions } from '../auth/auth.controller';
import { SESSION_COOKIE } from '../auth/session.guard';

@ApiTags('Conta e preferências')
@ApiCookieAuth()
@Controller('users/me')
export class UsersController {
  constructor(@Inject(UsersService) private readonly users: UsersService) {}
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
