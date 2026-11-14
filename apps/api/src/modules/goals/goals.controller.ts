import { Body, Controller, Delete, Get, Inject, Param, Patch, Post } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  goalInputSchema,
  goalPatchSchema,
  type GoalInput,
  type GoalPatch,
} from '@jinsei/contracts';
import { CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { GoalsService } from './goals.service';

@ApiTags('Metas')
@ApiCookieAuth()
@Controller('goals')
export class GoalsController {
  constructor(@Inject(GoalsService) private readonly goals: GoalsService) {}
  @Get() list(@CurrentUserId() userId: string) {
    return this.goals.list(userId);
  }
  @Post()
  @ApiZodBody(goalInputSchema)
  create(@CurrentUserId() userId: string, @Body(new ZodPipe(goalInputSchema)) input: GoalInput) {
    return this.goals.create(userId, input);
  }
  @Patch(':id')
  @ApiZodBody(goalPatchSchema)
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(goalPatchSchema)) input: GoalPatch,
  ) {
    return this.goals.update(userId, id, input);
  }
  @Delete(':id') remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.goals.remove(userId, id);
  }
}
