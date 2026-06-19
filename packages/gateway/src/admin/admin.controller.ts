import { BadRequestException, Body, Controller, Inject, Post } from '@nestjs/common';
import { BackupRequestSchema, type BackupResponse } from '@midnite/shared';
import { BackupService } from './backup.service';

@Controller('admin')
export class AdminController {
  constructor(@Inject(BackupService) private readonly backup: BackupService) {}

  // POST /admin/backup  { dir?: string }
  @Post('backup')
  async createBackup(@Body() body: unknown): Promise<BackupResponse> {
    const parsed = BackupRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.backup.backup(parsed.data.dir);
  }
}
