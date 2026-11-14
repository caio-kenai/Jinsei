import { Controller, Get, Inject, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RateLimit } from '../../common/rate-limit';
import { catalogQuerySchema } from '@jinsei/contracts';
import { CurrentUserId, Public } from '../auth/session.guard';
import { ZodPipe } from '../../common/zod.pipe';
import { CatalogService } from './catalog.service';

@ApiTags('Catálogo')
@ApiCookieAuth()
@Controller('catalog')
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalog: CatalogService) {}
  @Public()
  @Get('showcase')
  showcase() {
    return this.catalog.showcase();
  }
  @Get('media')
  @RateLimit(30)
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'mediaType', required: false })
  search(
    @CurrentUserId() userId: string,
    @Query(new ZodPipe(catalogQuerySchema))
    query: { q: string; mediaType: 'games' | 'anime' | 'manga' | 'movies' | 'series' },
  ) {
    return this.catalog.search(userId, query.q, query.mediaType);
  }
  @Get('providers') providers() {
    return this.catalog.providers();
  }
}
