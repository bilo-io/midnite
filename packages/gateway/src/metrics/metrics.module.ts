import { Global, Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsRepository } from './metrics.repository';
import { MetricsService } from './metrics.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsRepository],
  exports: [MetricsService],
})
export class MetricsModule {}
