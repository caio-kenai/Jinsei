import { Module } from '@nestjs/common';
import { GoalsModule } from '../goals/goals.module';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';

@Module({ imports: [GoalsModule], controllers: [ProfilesController], providers: [ProfilesService] })
export class ProfilesModule {}
