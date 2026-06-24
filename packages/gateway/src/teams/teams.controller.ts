import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  NotFoundException,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import {
  CreateInviteRequestSchema,
  CreateTeamRequestSchema,
  SetMemberRoleRequestSchema,
  UpdateTeamRequestSchema,
  type TeamRole,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../auth/decorators/current-user.decorator.js';
import {
  InsufficientTeamRoleError,
  TeamDoesNotExistError,
  TeamInviteDoesNotExistError,
  TeamInviteExpiredError,
  TeamMembershipDoesNotExistError,
  TeamSlugTakenError,
  TeamsService,
} from './teams.service.js';

@Controller()
export class TeamsController {
  constructor(private readonly svc: TeamsService) {}

  @Post('teams')
  createTeam(@Body() body: unknown, @CurrentUser() user: CurrentUserPayload) {
    this.requireAuth(user);
    const parsed = CreateTeamRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return this.svc.createTeam(parsed.data, user!.userId);
    } catch (err) {
      if (err instanceof TeamSlugTakenError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  @Get('teams')
  listTeams(@CurrentUser() user: CurrentUserPayload) {
    this.requireAuth(user);
    return this.svc.listTeamsForUser(user!.userId);
  }

  @Get('teams/:id')
  getTeam(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    this.requireAuth(user);
    try {
      return this.svc.getTeam(id);
    } catch (err) {
      if (err instanceof TeamDoesNotExistError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  @Patch('teams/:id')
  updateTeam(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: CurrentUserPayload) {
    this.requireAuth(user);
    const parsed = UpdateTeamRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return this.svc.updateTeam(id, parsed.data, user!.userId);
    } catch (err) {
      if (err instanceof TeamDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof InsufficientTeamRoleError) throw new ForbiddenException(err.message);
      throw err;
    }
  }

  @Delete('teams/:id')
  @HttpCode(204)
  deleteTeam(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    this.requireAuth(user);
    try {
      this.svc.deleteTeam(id, user!.userId);
    } catch (err) {
      if (err instanceof TeamDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof InsufficientTeamRoleError) throw new ForbiddenException(err.message);
      throw err;
    }
  }

  // ---- Membership ----

  @Patch('teams/:id/members/:userId/role')
  setRole(
    @Param('id') teamId: string,
    @Param('userId') userId: string,
    @Body() body: unknown,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    this.requireAuth(user);
    const parsed = SetMemberRoleRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      this.svc.setMemberRole(teamId, userId, parsed.data.role as TeamRole, user!.userId);
      return { ok: true };
    } catch (err) {
      if (err instanceof TeamDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof TeamMembershipDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof InsufficientTeamRoleError) throw new ForbiddenException(err.message);
      throw err;
    }
  }

  @Delete('teams/:id/members/:userId')
  @HttpCode(204)
  removeMember(
    @Param('id') teamId: string,
    @Param('userId') userId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    this.requireAuth(user);
    try {
      this.svc.removeMember(teamId, userId, user!.userId);
    } catch (err) {
      if (err instanceof TeamDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof TeamMembershipDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof InsufficientTeamRoleError) throw new ForbiddenException(err.message);
      throw err;
    }
  }

  // ---- Invites ----

  @Post('teams/:id/invites')
  createInvite(@Param('id') teamId: string, @Body() body: unknown, @CurrentUser() user: CurrentUserPayload) {
    this.requireAuth(user);
    const parsed = CreateInviteRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    try {
      return this.svc.createInvite(teamId, parsed.data, user!.userId);
    } catch (err) {
      if (err instanceof TeamDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof InsufficientTeamRoleError) throw new ForbiddenException(err.message);
      throw err;
    }
  }

  @Get('teams/:id/invites')
  listInvites(@Param('id') teamId: string, @CurrentUser() user: CurrentUserPayload) {
    this.requireAuth(user);
    try {
      return this.svc.listInvites(teamId, user!.userId);
    } catch (err) {
      if (err instanceof TeamDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof InsufficientTeamRoleError) throw new ForbiddenException(err.message);
      throw err;
    }
  }

  @Delete('teams/:id/invites/:inviteId')
  @HttpCode(204)
  revokeInvite(
    @Param('id') teamId: string,
    @Param('inviteId') inviteId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    this.requireAuth(user);
    try {
      this.svc.revokeInvite(teamId, inviteId, user!.userId);
    } catch (err) {
      if (err instanceof TeamDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof InsufficientTeamRoleError) throw new ForbiddenException(err.message);
      throw err;
    }
  }

  // ---- Public invite resolution ----

  @Get('invites/:token')
  getInvite(@Param('token') token: string) {
    try {
      return this.svc.getInvite(token);
    } catch (err) {
      if (err instanceof TeamInviteDoesNotExistError) throw new NotFoundException(err.message);
      throw err;
    }
  }

  @Post('invites/:token/accept')
  @HttpCode(200)
  acceptInvite(@Param('token') token: string, @CurrentUser() user: CurrentUserPayload) {
    this.requireAuth(user);
    try {
      this.svc.acceptInvite(token, user!.userId);
      return { ok: true };
    } catch (err) {
      if (err instanceof TeamInviteDoesNotExistError) throw new NotFoundException(err.message);
      if (err instanceof TeamInviteExpiredError) throw new BadRequestException(err.message);
      throw err;
    }
  }

  private requireAuth(user: CurrentUserPayload): void {
    if (!user) throw new ForbiddenException('authentication required');
  }
}
