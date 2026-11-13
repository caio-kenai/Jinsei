import { Body, Controller, Get, Inject, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  mediaTypeSchema,
  saveViewSchema,
  savedViewConfigSchema,
  type MediaType,
  type SavedViewConfig,
} from '@jinsei/contracts';
import { z } from 'zod';
import { CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('Visualizações')
@ApiCookieAuth()
@Controller('saved-views')
export class ViewsController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  @Get()
  async get(
    @CurrentUserId() userId: string,
    @Query(new ZodPipe(z.object({ mediaType: mediaTypeSchema }).strict()))
    query: { mediaType: MediaType },
  ) {
    const result = await this.db.savedView.findUnique({
      where: { userId_mediaTypeId: { userId, mediaTypeId: query.mediaType } },
    });
    return { config: result ? savedViewConfigSchema.parse(result.config) : null };
  }
  @Put()
  @ApiZodBody(saveViewSchema)
  async save(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(saveViewSchema)) input: { mediaType: MediaType; config: SavedViewConfig },
  ) {
    await this.db.savedView.upsert({
      where: { userId_mediaTypeId: { userId, mediaTypeId: input.mediaType } },
      create: { userId, mediaTypeId: input.mediaType, config: input.config },
      update: { config: input.config },
    });
    return { config: input.config };
  }
}
