import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Put,
} from '@nestjs/common';
import {
  LlmProviderSchema,
  UpdateActiveProviderRequestSchema,
  UpdateProviderCredentialRequestSchema,
  type ProviderResponse,
  type ProvidersResponse,
} from '@midnite/shared';
import { ProvidersService } from './providers.service';

@Controller('providers')
export class ProvidersController {
  constructor(@Inject(ProvidersService) private readonly service: ProvidersService) {}

  @Get()
  list(): ProvidersResponse {
    return this.service.list();
  }

  @Put('active')
  async setActive(@Body() body: unknown): Promise<ProvidersResponse> {
    const parsed = UpdateActiveProviderRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.setActiveProvider(parsed.data.activeProvider);
  }

  @Put(':provider')
  async update(@Param('provider') provider: string, @Body() body: unknown): Promise<ProviderResponse> {
    const p = LlmProviderSchema.safeParse(provider);
    if (!p.success) throw new BadRequestException(p.error.message);
    const parsed = UpdateProviderCredentialRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.updateProvider(p.data, parsed.data);
  }
}
