import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  CreateGroupRequestSchema,
  CreateItemRequestSchema,
  CreateRoutineRequestSchema,
  RecordProgressRequestSchema,
  UpdateGroupRequestSchema,
  UpdateItemRequestSchema,
  UpdateRoutineRequestSchema,
  type RoutineProgressListResponse,
  type RoutineProgressResponse,
  type RoutineResponse,
  type RoutinesResponse,
} from '@midnite/shared';
import { RoutinesService } from './routines.service';

@Controller('routines')
export class RoutinesController {
  constructor(@Inject(RoutinesService) private readonly service: RoutinesService) {}

  @Get()
  listRoutines(): RoutinesResponse {
    return { routines: this.service.listRoutines() };
  }

  @Post()
  createRoutine(@Body() body: unknown): RoutineResponse {
    const parsed = CreateRoutineRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { routine: this.service.createRoutine(parsed.data) };
  }

  @Get(':id')
  getRoutine(@Param('id') id: string): RoutineResponse {
    return { routine: this.service.getRoutine(id) };
  }

  @Patch(':id')
  updateRoutine(@Param('id') id: string, @Body() body: unknown): RoutineResponse {
    const parsed = UpdateRoutineRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { routine: this.service.updateRoutine(id, parsed.data) };
  }

  @Delete(':id')
  removeRoutine(@Param('id') id: string): { ok: true } {
    this.service.removeRoutine(id);
    return { ok: true };
  }

  // ---- Groups ----

  @Post(':id/groups')
  addGroup(@Param('id') id: string, @Body() body: unknown): RoutineResponse {
    const parsed = CreateGroupRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { routine: this.service.addGroup(id, parsed.data) };
  }

  @Patch(':id/groups/:gid')
  updateGroup(
    @Param('id') id: string,
    @Param('gid') gid: string,
    @Body() body: unknown,
  ): RoutineResponse {
    const parsed = UpdateGroupRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { routine: this.service.updateGroup(id, gid, parsed.data) };
  }

  @Delete(':id/groups/:gid')
  removeGroup(@Param('id') id: string, @Param('gid') gid: string): RoutineResponse {
    return { routine: this.service.removeGroup(id, gid) };
  }

  // ---- Items ----

  @Post(':id/groups/:gid/items')
  addItem(
    @Param('id') id: string,
    @Param('gid') gid: string,
    @Body() body: unknown,
  ): RoutineResponse {
    const parsed = CreateItemRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { routine: this.service.addItem(id, gid, parsed.data) };
  }

  @Patch(':id/items/:iid')
  updateItem(
    @Param('id') id: string,
    @Param('iid') iid: string,
    @Body() body: unknown,
  ): RoutineResponse {
    const parsed = UpdateItemRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { routine: this.service.updateItem(id, iid, parsed.data) };
  }

  @Delete(':id/items/:iid')
  removeItem(@Param('id') id: string, @Param('iid') iid: string): RoutineResponse {
    return { routine: this.service.removeItem(id, iid) };
  }

  // ---- Progress ----

  @Post(':id/progress')
  recordProgress(@Param('id') id: string, @Body() body: unknown): RoutineProgressResponse {
    const parsed = RecordProgressRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { progress: this.service.recordProgress(id, parsed.data) };
  }

  @Get(':id/progress')
  listProgress(
    @Param('id') id: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ): RoutineProgressListResponse {
    return { progress: this.service.listProgress(id, from, to) };
  }
}
