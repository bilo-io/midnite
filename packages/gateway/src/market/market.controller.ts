import { BadRequestException, Controller, Get, Inject, InternalServerErrorException, Query } from '@nestjs/common';
import {
  AssetSearchQuerySchema,
  MarketHistoryQuerySchema,
  MarketQuoteQuerySchema,
  type AssetSearchResponse,
  type MarketHistoryResponse,
  type MarketQuote,
} from '@midnite/shared';
import { MarketService } from './market.service';

@Controller('market')
export class MarketController {
  constructor(@Inject(MarketService) private readonly service: MarketService) {}

  @Get('search')
  async search(@Query() query: unknown): Promise<AssetSearchResponse> {
    const parsed = AssetSearchQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return { results: await this.service.search(parsed.data.kind, parsed.data.query) };
    } catch (err) {
      throw new InternalServerErrorException(err instanceof Error ? err.message : 'search unavailable');
    }
  }

  @Get('quote')
  async quote(@Query() query: unknown): Promise<MarketQuote> {
    const parsed = MarketQuoteQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return await this.service.quote(parsed.data.kind, parsed.data.symbol);
    } catch (err) {
      throw new InternalServerErrorException(err instanceof Error ? err.message : 'quote unavailable');
    }
  }

  @Get('history')
  async history(@Query() query: unknown): Promise<MarketHistoryResponse> {
    const parsed = MarketHistoryQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return await this.service.history(parsed.data.kind, parsed.data.symbol, parsed.data.timeframe);
    } catch (err) {
      throw new InternalServerErrorException(err instanceof Error ? err.message : 'history unavailable');
    }
  }
}
