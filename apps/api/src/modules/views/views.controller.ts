import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  Inject,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  savedViewConfigSchema,
  savedViewCreateSchema,
  savedViewPatchSchema,
  viewScopeSchema,
  type SavedView,
  type SavedViewPatch,
  type ViewScope,
} from '@jinsei/contracts';
import { z } from 'zod';
import { CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';

const MAX_VIEWS = 20;
type Row = { id: string; scope: string; name: string; position: number; config: unknown };
const viewResult = (row: Row): SavedView => ({
  id: row.id,
  scope: row.scope as ViewScope,
  name: row.name,
  position: row.position,
  config: savedViewConfigSchema.parse(row.config),
});
const conflict = (error: unknown) => {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
    throw new ConflictException('Já existe uma visualização com esse nome');
  throw error;
};

@ApiTags('Visualizações')
@ApiCookieAuth()
@Controller('saved-views')
export class ViewsController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  @Get()
  async list(
    @CurrentUserId() userId: string,
    @Query(new ZodPipe(z.object({ scope: viewScopeSchema }).strict())) query: { scope: ViewScope },
  ) {
    const rows = await this.db.savedView.findMany({
      where: { userId, scope: query.scope },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return { views: rows.map(viewResult) };
  }
  @Post()
  @ApiZodBody(savedViewCreateSchema)
  async create(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(savedViewCreateSchema)) input: z.infer<typeof savedViewCreateSchema>,
  ) {
    const existing = await this.db.savedView.aggregate({
      where: { userId, scope: input.scope },
      _count: true,
      _max: { position: true },
    });
    if (existing._count >= MAX_VIEWS)
      throw new BadRequestException(`Cada espaço aceita até ${MAX_VIEWS} visualizações`);
    const row = await this.db.savedView
      .create({
        data: {
          userId,
          scope: input.scope,
          name: input.name,
          config: input.config,
          position: Math.min(1000, (existing._max.position ?? -1) + 1),
        },
      })
      .catch(conflict);
    return viewResult(row);
  }
  @Patch(':id')
  @ApiZodBody(savedViewPatchSchema)
  async update(
    @CurrentUserId() userId: string,
    @Param('id') id: string,
    @Body(new ZodPipe(savedViewPatchSchema)) input: SavedViewPatch,
  ) {
    if (!(await this.db.savedView.findFirst({ where: { id, userId }, select: { id: true } })))
      throw new NotFoundException('Visualização não encontrada');
    const row = await this.db.savedView
      .update({ where: { id, userId }, data: input })
      .catch(conflict);
    return viewResult(row);
  }
  @Delete(':id')
  async remove(@CurrentUserId() userId: string, @Param('id') id: string) {
    const removed = await this.db.savedView.deleteMany({ where: { id, userId } });
    if (!removed.count) throw new NotFoundException('Visualização não encontrada');
    return { deleted: true };
  }
}
