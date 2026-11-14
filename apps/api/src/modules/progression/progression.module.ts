import { Module } from '@nestjs/common';
import { GoalsModule } from '../goals/goals.module';
import { ProgressionController } from './progression.controller';
import { ProgressionService } from './progression.service';

@Module({
  imports: [GoalsModule],
  controllers: [ProgressionController],
  providers: [ProgressionService],
})
export class ProgressionModule {}
