import { BadRequestException, Controller, Get, Inject, InternalServerErrorException, Query } from '@nestjs/common';
import { WeatherQuerySchema, type WeatherResponse } from '@midnite/shared';
import { WeatherService } from './weather.service';

@Controller('weather')
export class WeatherController {
  constructor(@Inject(WeatherService) private readonly service: WeatherService) {}

  @Get()
  async getWeather(@Query() query: unknown): Promise<WeatherResponse> {
    const parsed = WeatherQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return await this.service.forecast(parsed.data.lat, parsed.data.lon);
    } catch (err) {
      throw new InternalServerErrorException(err instanceof Error ? err.message : 'weather unavailable');
    }
  }
}
