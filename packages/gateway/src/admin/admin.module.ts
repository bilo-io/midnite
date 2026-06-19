import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { BackupService } from './backup.service';

// Operational endpoints (backup today). DbModule is @Global, so SQLITE_TOKEN
// resolves without an explicit import.
@Module({
  controllers: [AdminController],
  providers: [BackupService],
})
export class AdminModule {}
