import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  collectionInputSchema,
  collectionItemCreateSchema,
  collectionItemPatchSchema,
  collectionPatchSchema,
  type CollectionInput,
  type CollectionItemPatch,
  type CollectionPatch,
} from '@jinsei/contracts';
import { z } from 'zod';
import { CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { CollectionsService } from './collections.service';

@ApiTags('Coleções')
@ApiCookieAuth()
@Controller('collections')
export class CollectionsController {
  constructor(@Inject(CollectionsService) private readonly collections: CollectionsService) {}
  @Get() list(
    @CurrentUserId() userId: string,
    @Query(new ZodPipe(z.object({ entryId: z.string().max(100).optional() }).strict()))
    query: { entryId?: string },
  ) {
    return this.collections.list(userId, query.entryId);
  }
  @Post()
  @ApiZodBody(collectionInputSchema)
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(collectionInputSchema)) input: CollectionInput,
  ) {
    return this.collections.create(userId, input);
  }
  @Get(':id') get(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.collections.get(userId, id);
  }
  @Patch(':id')
  @ApiZodBody(collectionPatchSchema)
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(collectionPatchSchema)) input: CollectionPatch,
  ) {
    return this.collections.update(userId, id, input);
  }
  @Delete(':id') remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.collections.remove(userId, id);
  }
  @Post(':id/items')
  @ApiZodBody(collectionItemCreateSchema)
  addItem(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(collectionItemCreateSchema)) input: { entryId: string; note: string },
  ) {
    return this.collections.addItem(userId, id, input.entryId, input.note);
  }
  @Patch(':id/items/:entryId')
  @ApiZodBody(collectionItemPatchSchema)
  updateItem(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
    @Body(new ZodPipe(collectionItemPatchSchema)) input: CollectionItemPatch,
  ) {
    return this.collections.updateItem(userId, id, entryId, input);
  }
  @Delete(':id/items/:entryId') removeItem(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('entryId') entryId: string,
  ) {
    return this.collections.removeItem(userId, id, entryId);
  }
}
