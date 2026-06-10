import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import type { BrowseDirResponse } from '@midnite/shared';
import { FsService } from './fs.service';

@Controller('fs')
export class FsController {
  constructor(@Inject(FsService) private readonly service: FsService) {}

  // Lists subdirectories of `path` (home dir when omitted). A missing path or a
  // non-directory surfaces as a 400 so the picker can show the message inline.
  @Get('dirs')
  async dirs(@Query('path') path?: string): Promise<BrowseDirResponse> {
    try {
      return await this.service.browseDir(path);
    } catch (err) {
      throw new BadRequestException(err instanceof Error ? err.message : 'cannot read directory');
    }
  }
}
