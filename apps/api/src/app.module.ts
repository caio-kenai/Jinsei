import { Controller, Get, Inject, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule, PrismaService } from './prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { Public, SessionGuard } from './modules/auth/session.guard';
import { CatalogModule } from './modules/catalog/catalog.module';
import { LibraryModule } from './modules/library/library.module';
import { ViewsController } from './modules/views/views.controller';
import { SupportController } from './modules/support/support.controller';
import { InstanceModule } from './modules/instance/instance.module';
import { CollectionsModule } from './modules/collections/collections.module';

@Controller('health')
class HealthController {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  @Public()
  @Get()
  async check() {
    await this.db.$queryRaw`SELECT 1`;
    return { status: 'ok', service: 'jinsei-api' };
  }
}

@Module({
  imports: [
    InstanceModule,
    CatalogModule,
    LibraryModule,
    CollectionsModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 180 }]),
  ],
  controllers: [HealthController, ViewsController, SupportController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
