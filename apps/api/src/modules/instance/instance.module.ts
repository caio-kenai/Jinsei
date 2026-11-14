import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Global,
  Inject,
  Injectable,
  Module,
  Patch,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { appVersion, instanceSettingsSchema, type InstanceSettings } from '@jinsei/contracts';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '../../generated/prisma/client';
import { env } from '../../config/env';
import { Public, CurrentUserId } from '../auth/session.guard';
import { ApiZodBody, ZodPipe } from '../../common/zod.pipe';
import { storageEnabled } from '../uploads/storage';

@Injectable()
export class InstanceService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  async settings() {
    const existing = await this.db.instanceSettings.findUnique({ where: { id: 'instance' } });
    if (existing) return existing;
    try {
      return await this.db.instanceSettings.create({
        data: { id: 'instance', name: env.INSTANCE_NAME },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        return this.db.instanceSettings.findUniqueOrThrow({ where: { id: 'instance' } });
      throw error;
    }
  }
  async publicSettings() {
    const record = await this.settings();
    const settings = instanceSettingsSchema.parse({
      name: record.name,
      description: record.description,
      contactEmail: record.contactEmail,
      registrationsEnabled: record.registrationsEnabled,
      externalCatalogEnabled: record.externalCatalogEnabled,
      supportEnabled: record.supportEnabled,
    });
    return {
      ...settings,
      version: appVersion,
      publicUrl: env.WEB_ORIGIN,
      uploadsEnabled: storageEnabled,
    };
  }
  async requireAdmin(userId: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (user?.role !== 'admin')
      throw new ForbiddenException('Esta área é exclusiva do administrador da instância');
  }
  async update(userId: string, input: InstanceSettings) {
    await this.requireAdmin(userId);
    await this.settings();
    await this.db.instanceSettings.update({ where: { id: 'instance' }, data: input });
    return this.publicSettings();
  }
}
@ApiTags('Instância')
@Controller('instance')
export class InstanceController {
  constructor(@Inject(InstanceService) private readonly instance: InstanceService) {}
  @Public() @Get() get() {
    return this.instance.publicSettings();
  }
  @Patch() @ApiZodBody(instanceSettingsSchema) update(
    @CurrentUserId() userId: string,
    @Body(new ZodPipe(instanceSettingsSchema)) input: InstanceSettings,
  ) {
    return this.instance.update(userId, input);
  }
}
@Global()
@Module({
  controllers: [InstanceController],
  providers: [InstanceService],
  exports: [InstanceService],
})
export class InstanceModule {}
