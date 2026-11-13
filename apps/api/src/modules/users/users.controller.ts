import { Body, Controller, Get, Inject, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  onboardingSchema,
  preferencesPatchSchema,
  type OnboardingInput,
  type PreferencesPatch,
} from '@jinsei/contracts';
import { CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { UsersService } from './users.service';

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
}
