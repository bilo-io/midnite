import { Body, Controller, HttpCode, Inject, Param, Post } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';

// Inbound webhook trigger. The unguessable per-workflow token in the path authenticates
// the call (hashed at rest, constant-time compared) — never trust the body alone.
@Controller('hooks/workflows')
export class WebhookController {
  constructor(@Inject(WorkflowsService) private readonly service: WorkflowsService) {}

  @Post(':id/:token')
  @HttpCode(202)
  trigger(
    @Param('id') id: string,
    @Param('token') token: string,
    @Body() body: unknown,
  ): { ok: true; runId: string } {
    const run = this.service.handleWebhook(id, token, body ?? {});
    return { ok: true, runId: run.id };
  }
}
