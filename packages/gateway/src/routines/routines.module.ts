import { Module } from '@nestjs/common';
import { RoutinesController } from './routines.controller';
import { RoutinesRepository } from './routines.repository';
import { RoutinesService } from './routines.service';

@Module({
  controllers: [RoutinesController],
  providers: [RoutinesService, RoutinesRepository],
  exports: [RoutinesService],
})
export class RoutinesModule {}
