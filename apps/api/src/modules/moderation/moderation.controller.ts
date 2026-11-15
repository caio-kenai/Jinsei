import { Body, Controller, Get, HttpCode, Inject, Param, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  reportResolutionSchema,
  roleInputSchema,
  suspensionInputSchema,
  type ReportResolution,
} from '@jinsei/contracts';
import { CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { ModerationService } from './moderation.service';

@ApiTags('Moderação')
@ApiCookieAuth()
@Controller('admin/moderation')
export class ModerationController {
  constructor(@Inject(ModerationService) private readonly moderation: ModerationService) {}

  @Get('summary') summary(@CurrentUserId() userId: string) {
    return this.moderation.summary(userId);
  }
  @Get('reports') reports(@CurrentUserId() userId: string, @Query('status') status?: string) {
    const value = ['open', 'resolved', 'dismissed'].includes(status ?? '') ? status : 'open';
    return this.moderation.reports(userId, value);
  }
  @Post('reports/:id/resolve')
  @HttpCode(200)
  @ApiZodBody(reportResolutionSchema)
  resolve(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(reportResolutionSchema)) input: ReportResolution,
  ) {
    return this.moderation.resolve(userId, id, input);
  }
  @Get('users') users(@CurrentUserId() userId: string, @Query('q') query?: string) {
    return this.moderation.users(userId, (query ?? '').slice(0, 80));
  }
  @Post('users/:id/suspend')
  @HttpCode(200)
  @ApiZodBody(suspensionInputSchema)
  suspend(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(suspensionInputSchema)) input: { reason: string },
  ) {
    return this.moderation.suspend(userId, id, input.reason);
  }
  @Post('users/:id/unsuspend')
  @HttpCode(200)
  unsuspend(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.moderation.unsuspend(userId, id);
  }
  @Post('users/:id/role')
  @HttpCode(200)
  @ApiZodBody(roleInputSchema)
  role(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(roleInputSchema)) input: { role: 'user' | 'admin' },
  ) {
    return this.moderation.setRole(userId, id, input.role);
  }
  @Get('log') log(@CurrentUserId() userId: string) {
    return this.moderation.history(userId);
  }
}
