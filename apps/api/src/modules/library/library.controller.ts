import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  entryCreateSchema,
  entryPatchSchema,
  libraryQuerySchema,
  viewingCreateSchema,
  type EntryCreateInput,
  type EntryPatchInput,
  type LibraryQuery,
  type ViewingCreateInput,
} from '@jinsei/contracts';
import { CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { LibraryService, entryResult } from './library.service';

@ApiTags('Biblioteca')
@ApiCookieAuth()
@Controller('library')
export class LibraryController {
  constructor(@Inject(LibraryService) private readonly library: LibraryService) {}
  @Get('entries') list(
    @CurrentUserId() userId: string,
    @Query(new ZodPipe(libraryQuerySchema)) query: LibraryQuery,
  ) {
    return this.library.list(userId, query);
  }
  @Get('summary') summary(@CurrentUserId() userId: string) {
    return this.library.summary(userId);
  }
  @Get('entries/:id') async get(@CurrentUserId() userId: string, @Param('id') id: string) {
    return entryResult(await this.library.get(userId, id));
  }
  @Post('entries')
  @ApiZodBody(entryCreateSchema)
  create(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(entryCreateSchema)) input: EntryCreateInput,
  ) {
    return this.library.create(userId, input);
  }
  @Patch('entries/:id')
  @ApiZodBody(entryPatchSchema)
  update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(entryPatchSchema)) input: EntryPatchInput,
  ) {
    return this.library.update(userId, id, input);
  }
  @Post('entries/:id/viewings')
  @ApiZodBody(viewingCreateSchema)
  addViewing(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(viewingCreateSchema)) input: ViewingCreateInput,
  ) {
    return this.library.addViewing(userId, id, input);
  }
  @Delete('entries/:id/viewings/:viewingId') removeViewing(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Param('viewingId') viewingId: string,
  ) {
    return this.library.removeViewing(userId, id, viewingId);
  }
  @Delete('entries/:id') remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    return this.library.remove(userId, id);
  }
}
