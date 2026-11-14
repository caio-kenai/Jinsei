import { Body, Controller, Get, Inject, Put } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { activeTitleSchema } from '@jinsei/contracts';
import { CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { ProgressionService } from './progression.service';

@ApiTags('Jornada')
@ApiCookieAuth()
@Controller('progression')
export class ProgressionController {
  constructor(@Inject(ProgressionService) private readonly progression: ProgressionService) {}
  @Get() get(@CurrentUserId() userId: string) {
    return this.progression.evaluate(userId);
  }
  @Put('title')
  @ApiZodBody(activeTitleSchema)
  title(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(activeTitleSchema)) input: { title: string | null },
  ) {
    return this.progression.setTitle(userId, input.title);
  }
}
