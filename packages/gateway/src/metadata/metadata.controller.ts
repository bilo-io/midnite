import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { LinkMetadataQuerySchema, type LinkMetadataResponse } from '@midnite/shared';
import { MetadataService } from './metadata.service';

@Controller('metadata')
export class MetadataController {
  constructor(@Inject(MetadataService) private readonly service: MetadataService) {}

  @Get()
  async getMetadata(@Query() query: unknown): Promise<LinkMetadataResponse> {
    const parsed = LinkMetadataQuerySchema.safeParse(query);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    // fetchSourceMetadata never throws — unsafe/unreachable URLs yield `{}`.
    return this.service.fetch(parsed.data.url);
  }
}
