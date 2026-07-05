import { BadRequestException, Controller, Get, Query, Res } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ExportOptionsSchema, type BackupStatus } from '@midnite/shared';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { BackupSchedulerService } from './backup-scheduler.service';
import { PortabilityService } from './portability.service';

/**
 * Phase 49 B — full-store export. Admin-gated (a whole-store archive is sensitive
 * even without secrets — Decision §9). Buffers the zip and sends it as an
 * attachment. Import (Theme C) is the companion endpoint on this controller later.
 */
@Controller('portability')
export class PortabilityController {
  constructor(
    private readonly service: PortabilityService,
    private readonly backups: BackupSchedulerService,
  ) {}

  /** Phase 49 F — scheduled auto-backup status for the Settings → Data page
   *  (enabled/interval/dir/retention + last/next run + recent archives). */
  @Get('backup/status')
  @RequiresRole('admin')
  backupStatus(): Promise<BackupStatus> {
    return this.backups.status();
  }

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

    const { archive, filename, summary } = this.service.export(parsed.data);
    void reply
      .header('content-type', 'application/zip')
      .header('content-disposition', `attachment; filename="${filename}"`)
      // Per-domain summary (Phase 49 D) so a client can report what it downloaded
      // without unzipping. Single-line JSON — header-safe. Exposed via CORS so a
      // browser download (Theme E) can read it too.
      .header('x-midnite-backup-manifest', JSON.stringify(summary))
      .header('access-control-expose-headers', 'x-midnite-backup-manifest, content-disposition')
      .send(archive);
  }
}
