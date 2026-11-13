import { Module } from '@nestjs/common';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { WikidataProvider } from './providers/wikidata.provider';
import { IgdbProvider } from './providers/igdb.provider';

@Module({
  controllers: [CatalogController],
  providers: [CatalogService, WikidataProvider, IgdbProvider],
  exports: [CatalogService],
})
export class CatalogModule {}
