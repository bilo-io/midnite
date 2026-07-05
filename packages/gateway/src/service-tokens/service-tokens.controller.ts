import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Post,
  Body,
} from '@nestjs/common';
import {
  CreateServiceTokenRequestSchema,
  type CreateServiceTokenResponse,
  type ListServiceTokensResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { ServiceTokensService } from './service-tokens.service';

@Controller('service-tokens')
export class ServiceTokensController {
  constructor(
    @Inject(ServiceTokensService) private readonly service: ServiceTokensService,
  ) {}

  @Get()
  list(@CurrentUser() user?: CurrentUserPayload | null): ListServiceTokensResponse {
    const teamId = user?.teamId ?? null;
    return { tokens: this.service.list(teamId ?? undefined) };
  }

  @Post()
  create(
    @Body() body: unknown,
    @CurrentUser() user?: CurrentUserPayload | null,
  ): CreateServiceTokenResponse {
    const parsed = CreateServiceTokenRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.service.create(parsed.data.name, {
      expiresAt: parsed.data.expiresAt,
      createdBy: user?.userId,
      teamId: user?.teamId ?? null,
    });
  }

  @Delete(':id')
  revoke(@Param('id') id: string): void {
    this.service.revoke(id);
  }
}
