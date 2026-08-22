import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Inject,
  Param,
  Post,
} from '@nestjs/common';
import {
  CreateWorkflowCredentialRequestSchema,
  type WorkflowCredentialResponse,
  type WorkflowCredentialsResponse,
} from '@midnite/shared';
import { CurrentUser, type CurrentUserPayload } from '../../auth/decorators/current-user.decorator';
import { WorkflowCredentialsService } from './workflow-credentials.service';

// REST surface for the workflow credential vault. Thin: parse/encode only. The list
// and create responses carry names + types but **never** secret material — the secret
// is write-only over the API and resolved server-side at node-run time.
@Controller('workflow-credentials')
export class WorkflowCredentialsController {
  constructor(
    @Inject(WorkflowCredentialsService)
    private readonly service: WorkflowCredentialsService,
  ) {}

  @Get()
  list(): WorkflowCredentialsResponse {
    return { credentials: this.service.list() };
  }

  @Post()
  create(@Body() body: unknown): WorkflowCredentialResponse {
    const parsed = CreateWorkflowCredentialRequestSchema.safeParse(body);
    if (!parsed.success) throw new BadRequestException(parsed.error.message);
    return { credential: this.service.create(parsed.data) };
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id') id: string, @CurrentUser() user?: CurrentUserPayload | null): void {
    // Owner-checked (Phase 84 Theme A): install-wide credentials stay deletable by anyone,
    // a per-user connection only by the user who made it.
    this.service.removeForUser(id, user?.userId);
  }
}
