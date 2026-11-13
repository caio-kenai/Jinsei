import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { env } from '../../config/env';
import { validPixPayload } from './pix';

@ApiTags('Apoio voluntário')
@Controller('support')
export class SupportController {
  @Get()
  configuration() {
    if (!env.DONATION_PIX_KEY || !validPixPayload(env.DONATION_PIX_PAYLOAD))
      return { enabled: false };
    return { enabled: true, payload: env.DONATION_PIX_PAYLOAD, key: env.DONATION_PIX_KEY };
  }
}
