import { Module } from '@nestjs/common';
import { MarketCacheRepository } from './market-cache.repository';
import { MarketController } from './market.controller';
import { MarketService } from './market.service';

@Module({
  controllers: [MarketController],
  providers: [MarketService, MarketCacheRepository],
  exports: [MarketService],
})
export class MarketModule {}
