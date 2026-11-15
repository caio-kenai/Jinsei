import { Module } from '@nestjs/common';
import { AccountEmailService } from './account-email.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { MfaService } from './mfa.service';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AccountEmailService, MfaService],
  exports: [AuthService, AccountEmailService, MfaService],
})
export class AuthModule {}
