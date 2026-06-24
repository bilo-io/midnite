import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdatePasswordRequestSchema, UpdateUserRequestSchema, UserSchema } from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator';
import { InvalidCredentialsError, UserDoesNotExistError, UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  me(@CurrentUser() currentUser: CurrentUserPayload | null) {
    if (!currentUser?.userId) throw new UnauthorizedException('not authenticated');
    try {
      return { user: UserSchema.parse(this.users.getUser(currentUser.userId)) };
    } catch (err) {
      if (err instanceof UserDoesNotExistError) throw new UnauthorizedException('not authenticated');
      throw err;
    }
  }

  @Patch('me')
  async updateMe(@CurrentUser() currentUser: CurrentUserPayload | null, @Body() body: unknown) {
    if (!currentUser?.userId) throw new UnauthorizedException('not authenticated');
    const parsed = UpdateUserRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      const user = await this.users.updateProfile(currentUser.userId, parsed.data.name);
      return { user: UserSchema.parse(user) };
    } catch (err) {
      if (err instanceof UserDoesNotExistError) throw new UnauthorizedException('not authenticated');
      throw err;
    }
  }

  @Patch('me/password')
  async updatePassword(
    @CurrentUser() currentUser: CurrentUserPayload | null,
    @Body() body: unknown,
  ) {
    if (!currentUser?.userId) throw new UnauthorizedException('not authenticated');
    const parsed = UpdatePasswordRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      await this.users.updatePassword(
        currentUser.userId,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );
      return { ok: true };
    } catch (err) {
      if (err instanceof InvalidCredentialsError)
        throw new BadRequestException('current password is incorrect');
      if (err instanceof UserDoesNotExistError) throw new UnauthorizedException('not authenticated');
      throw err;
    }
  }
}
