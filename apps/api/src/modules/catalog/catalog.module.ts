import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { WikidataProvider } from './providers/wikidata.provider';
import { IgdbProvider } from './providers/igdb.provider';
import { TvmazeProvider } from './providers/tvmaze.provider';
import { OpenlibraryProvider } from './providers/openlibrary.provider';
import { TmdbProvider } from './providers/tmdb.provider';

@Module({
  controllers: [CatalogController],
  providers: [
    CatalogService,
    WikidataProvider,
    IgdbProvider,
    TvmazeProvider,
    OpenlibraryProvider,
    TmdbProvider,
  ],
  exports: [CatalogService],
})
export class CatalogModule {}
