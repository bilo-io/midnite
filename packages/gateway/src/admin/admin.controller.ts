import { BadRequestException, Body, Controller, Get, Inject, Post } from '@nestjs/common';
import {
  type AdminTeamSummary,
  type AdminUserSummary,
  BackupRequestSchema,
  type BackupResponse,
  type PlatformOverview,
} from '@midnite/shared';
import { RequiresOperator } from '../auth/decorators/require-operator.decorator';
import { AdminReadService } from './admin-read.service';
import { BackupService } from './backup.service';

@Controller('admin')
export class AdminController {
  constructor(
    @Inject(BackupService) private readonly backup: BackupService,
    @Inject(AdminReadService) private readonly read: AdminReadService,
  ) {}

  // POST /admin/backup  { dir?: string }
  @Post('backup')
  async createBackup(@Body() body: unknown): Promise<BackupResponse> {
    const parsed = BackupRequestSchema.safeParse(body ?? {});
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.backup.backup(parsed.data.dir);
  }

  // GET /admin/users — every user on the platform (operator-only, cross-tenant).
  @Get('users')
  @RequiresOperator()
  listUsers(): AdminUserSummary[] {
    return this.read.listUsers();
  }

  // GET /admin/teams — every team on the platform (operator-only, cross-tenant).
  @Get('teams')
  @RequiresOperator()
  listTeams(): AdminTeamSummary[] {
    return this.read.listTeams();
  }

  // GET /admin/overview — platform KPIs (operator-only).
  @Get('overview')
  @RequiresOperator()
  overview(): PlatformOverview {
    return this.read.overview();
  }
}
