import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import { PutPreferencesRequestSchema } from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { PreferencesService } from './preferences.service';

/** Authed read/write of the current user's synced preferences (Phase 43). */
@Controller('users/me/preferences')
export class PreferencesController {
  constructor(private readonly preferences: PreferencesService) {}

  @Get()
  get(@CurrentUser() currentUser: CurrentUserPayload | null) {
    if (!currentUser?.userId) throw new UnauthorizedException('not authenticated');
    return this.preferences.get(currentUser.userId);
  }

  @Put()
  put(@CurrentUser() currentUser: CurrentUserPayload | null, @Body() body: unknown) {
    if (!currentUser?.userId) throw new UnauthorizedException('not authenticated');
    const parsed = PutPreferencesRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return this.preferences.save(currentUser.userId, parsed.data);
  }
}
