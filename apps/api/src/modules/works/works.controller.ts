import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { rankingQuerySchema, type RankingQuery } from '@jinsei/contracts';
import { Public } from '../auth/session.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { RateLimit } from '../../common/rate-limit';
import { WorksService } from './works.service';

@ApiTags('Obras públicas')
@Controller('works')
export class WorksController {
  constructor(@Inject(WorksService) private readonly works: WorksService) {}
  @Public() @Get('sitemap') sitemap() {
    return this.works.sitemap();
  }
  @Public() @Get('rankings') rankings(@Query(new ZodPipe(rankingQuerySchema)) query: RankingQuery) {
    return this.works.rankings(query);
  }
  // Details may call external catalogs on a cache miss, so this route is rate limited.
  @Public() @RateLimit(60) @Get(':id') page(@Param('id') id: string) {
    return this.works.page(id);
  }
}
