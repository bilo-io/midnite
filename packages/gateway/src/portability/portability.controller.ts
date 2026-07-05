import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ExportOptionsSchema } from '@midnite/shared';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { PortabilityService } from './portability.service';

/**
 * Phase 49 B — full-store export. Admin-gated (a whole-store archive is sensitive
 * even without secrets — Decision §9). Buffers the zip and sends it as an
 * attachment. Import (Theme C) is the companion endpoint on this controller later.
 */
@Controller('portability')
export class PortabilityController {
  constructor(private readonly service: PortabilityService) {}

  @Get('export')
  @RequiresRole('admin')
  export(
    @Res({ passthrough: false }) reply: FastifyReply,
    @Query('domains') domainsRaw?: string,
  ): void {
    // `domains` is a comma-separated allowlist; omitted = all. (includeSecrets is
    // out of scope this slice — the archive is always secret-free.)
    const parsed = ExportOptionsSchema.safeParse({
      domains: domainsRaw ? domainsRaw.split(',').map((d) => d.trim()).filter(Boolean) : undefined,
    });
    if (!parsed.success) throw new BadRequestException(parsed.error.message);

    const { archive, filename } = this.service.export(parsed.data);
    void reply
      .header('content-type', 'application/zip')
      .header('content-disposition', `attachment; filename="${filename}"`)
      .send(archive);
  }
}
