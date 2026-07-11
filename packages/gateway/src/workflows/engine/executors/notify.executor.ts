import { Inject, Injectable } from '@nestjs/common';
import { NotifyParamsSchema } from '@midnite/shared';

import { NOTIFIER, type Notifier } from '../../../notifications/notifier';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/**
 * midnite.notify — post an in-app notification (Phase 21) so a pipeline can deliver
 * a digest or a notable retro without bespoke code. Thin over the `@Global`
 * `NOTIFIER` port; best-effort (a dispatch failure is logged there, never thrown).
 */
@Injectable()
export class NotifyExecutor implements NodeExecutor {
  readonly typeId = 'midnite.notify';

  constructor(@Inject(NOTIFIER) private readonly notifier: Notifier) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = NotifyParamsSchema.parse(ctx.params);
    const isDigest = params.kind === 'digest.generated';
    const route = params.route ?? (isDigest ? '/ops' : '/tasks');

    const delivered = await this.notifier.notify({
      kind: params.kind,
      severity: params.severity,
      title: params.title,
      body: params.body,
      entityType: isDigest ? 'digest' : 'task',
      entityId: params.entityId ?? params.kind,
      route,
      teamId: null,
    });

    ctx.log(delivered ? 'info' : 'warn', delivered ? `posted ${params.kind} notification` : `${params.kind} notification not delivered (disabled or failed)`);
    return { delivered, kind: params.kind };
  }
}
