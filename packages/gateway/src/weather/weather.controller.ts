import { BadRequestException, Controller, Get, Inject, InternalServerErrorException, Query, Req } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import {
  WeatherGeocodeQuerySchema,
  WeatherQuerySchema,
  type WeatherGeocodeResponse,
  type WeatherLocateResponse,
  type WeatherResponse,
} from '@midnite/shared';
import { publicClientIp } from './lib/client-ip';
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

  /**
   * Coarse location for a client whose browser can't give one — the packaged
   * desktop app (Electron ships no geolocation API key) and any `midnite serve`
   * reached over plain http on a LAN IP (insecure context, no API at all).
   */
  @Get('locate')
  async locate(@Req() req: FastifyRequest): Promise<WeatherLocateResponse> {
    const forwardedFor = req.headers['x-forwarded-for'];
    const clientIp = publicClientIp(
      Array.isArray(forwardedFor) ? forwardedFor.join(',') : forwardedFor,
      req.socket?.remoteAddress,
    );
    try {
      return await this.service.locate(clientIp);
    } catch (err) {
      throw new InternalServerErrorException(err instanceof Error ? err.message : 'location unavailable');
    }
  }

  @Get('geocode')
  async geocode(@Query() query: unknown): Promise<WeatherGeocodeResponse> {
    const parsed = WeatherGeocodeQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return await this.service.geocode(parsed.data.q);
    } catch (err) {
      throw new InternalServerErrorException(err instanceof Error ? err.message : 'geocoding unavailable');
    }
  }
}
