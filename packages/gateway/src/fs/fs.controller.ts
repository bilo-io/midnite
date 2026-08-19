import {
  BadRequestException,
  Body,
  Controller,
  ForbiddenException,
  Get,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { type BrowseDirResponse, CreateDirRequestSchema } from '@midnite/shared';
import { FsService } from './fs.service';
import { PathNotAllowedError } from './path-jail';

/**
 * A path refused by `gateway.fs.allowedRoots` is a 403, not the 400 every other
 * failure here maps to: the request was well-formed and the client can't fix it
 * by editing the path into something the policy would accept.
 */
function toHttp(err: unknown, fallback: string): Error {
  if (err instanceof PathNotAllowedError) return new ForbiddenException(err.message);
  return new BadRequestException(err instanceof Error ? err.message : fallback);
}

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
      throw toHttp(err, 'cannot read directory');
    }
  }

  // Creates `path` (recursively) and returns its listing. Backs the picker's
  // "create folder" option when the user types a path that doesn't exist yet.
  // A failure (e.g. permission denied) surfaces as a 400, like `dirs`.
  @Post('dirs')
  async create(@Body() body: unknown): Promise<BrowseDirResponse> {
    const parsed = CreateDirRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return await this.service.createDir(parsed.data.path);
    } catch (err) {
      throw toHttp(err, 'cannot create directory');
    }
  }
}
