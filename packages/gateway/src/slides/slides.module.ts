import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SlidesController } from './slides.controller';
import { SlidesService } from './slides.service';
import { SlidesRepository } from './slides.repository';

@Module({
  imports: [AuthModule],
  controllers: [SlidesController],
  providers: [SlidesService, SlidesRepository],
  exports: [SlidesService],
})
export class SlidesModule {}
