import { Controller, Get, Inject } from '@nestjs/common';
import { InstanceService } from '../instance/instance.module';
import { ApiTags } from '@nestjs/swagger';
import { env } from '../../config/env';
import { validPixPayload } from './pix';
import { Public } from '../auth/session.guard';

@ApiTags('Apoio voluntário')
@Controller('support')
export class SupportController {
  constructor(@Inject(InstanceService) private readonly instance: InstanceService) {}
  @Public()
  @Get()
  async configuration() {
    if (!(await this.instance.settings()).supportEnabled) return { enabled: false };
    if (!env.DONATION_PIX_KEY || !validPixPayload(env.DONATION_PIX_PAYLOAD))
      return { enabled: false };
    return { enabled: true, payload: env.DONATION_PIX_PAYLOAD, key: env.DONATION_PIX_KEY };
  }
}
