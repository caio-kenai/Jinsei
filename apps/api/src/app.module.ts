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
    CatalogModule,
    LibraryModule,
    PrismaModule,
    AuthModule,
    UsersModule,
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 180 }]),
  ],
  controllers: [HealthController, ViewsController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AppModule {}
