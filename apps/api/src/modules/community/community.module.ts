import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CommunityController } from './community.controller';
import { CommunityService } from './community.service';
import { SafetyService } from './safety.service';

@Module({
  imports: [AuthModule],
  controllers: [CommunityController],
  providers: [CommunityService, SafetyService],
})
export class CommunityModule {}
