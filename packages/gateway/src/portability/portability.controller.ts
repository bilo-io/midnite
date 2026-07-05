import { BadRequestException, Controller, Get, Post, Query, Req, Res } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ExportOptionsSchema, ImportOptionsSchema, type ImportPreview, type ImportResult } from '@midnite/shared';
import { RequiresRole } from '../auth/decorators/require-role.decorator';
import { PortabilityImportService } from './portability-import.service';
import { PortabilityService } from './portability.service';

/**
 * Phase 49 B + C — full-store export + import. Admin-gated (a whole-store archive
 * is sensitive even without secrets — Decision §9). Export buffers the zip and
 * sends it as an attachment; import/preview accept the zip as a multipart upload.
 */
@Controller('portability')
export class PortabilityController {
  constructor(
    private readonly service: PortabilityService,
    private readonly importService: PortabilityImportService,
  ) {}

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

  /** Dry-run: what a restore would do (per-domain counts, id conflicts, version verdict). */
  @Post('import/preview')
  @RequiresRole('admin')
  async importPreview(@Req() req: FastifyRequest): Promise<ImportPreview> {
    const { archive } = await this.readUpload(req);
    return this.importService.preview(archive);
  }

  /** Restore an archive (replace = wipe-then-restore; merge = insert new ids only). */
  @Post('import')
  @RequiresRole('admin')
  async import(@Req() req: FastifyRequest): Promise<ImportResult> {
    const { archive, fields } = await this.readUpload(req);
    const parsed = ImportOptionsSchema.safeParse({
      mode: fields['mode'] || undefined,
      passphrase: fields['passphrase'] || undefined,
    });
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.importService.restore(archive, parsed.data);
  }

  /** Read the multipart body: the `archive` zip (required) + any string fields. */
  private async readUpload(req: FastifyRequest): Promise<{ archive: Buffer; fields: Record<string, string> }> {
    if (!req.isMultipart()) {
      throw new BadRequestException('expected multipart/form-data with an "archive" file part');
    }
    let archive: Buffer | undefined;
    const fields: Record<string, string> = {};
    for await (const part of req.parts()) {
      if (part.type === 'file') {
        // Buffer the archive; drain any other file part so the stream completes.
        if (part.fieldname === 'archive') archive = await part.toBuffer();
        else await part.toBuffer();
      } else {
        fields[part.fieldname] = String(part.value ?? '');
      }
    }
    if (!archive) throw new BadRequestException('missing "archive" file part');
    return { archive, fields };
  }
}
