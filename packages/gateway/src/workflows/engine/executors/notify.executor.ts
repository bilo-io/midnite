import { Inject, Injectable } from '@nestjs/common';
import { NotifyParamsSchema } from '@midnite/shared';
import { NOTIFIER, type Notifier } from '../../../notifications/notifier';
import type { NodeExecutor, NodeRunContext } from '../node-executor';

/** Default client route per notification kind. */
const DEFAULT_ROUTE: Record<'digest.generated' | 'retro.notable', string> = {
  'digest.generated': '/digests',
  'retro.notable': '/tasks',
};

/**
 * midnite.notify — post an in-app notification (Phase 62 C reporting kinds:
 * `digest.generated` / `retro.notable`). Reaches the Phase 21 dispatcher through
 * the `NOTIFIER` port (no `NotificationsModule` import). Best-effort dispatch is
 * owned by the notifications service; this node reports what it posted.
 */
@Injectable()
export class NotifyExecutor implements NodeExecutor {
  readonly typeId = 'midnite.notify';

  constructor(@Inject(NOTIFIER) private readonly notifier: Notifier) {}

  async execute(ctx: NodeRunContext): Promise<unknown> {
    const params = NotifyParamsSchema.parse(ctx.params);
    const entityId = params.entityId?.trim() || params.kind;
    const route = params.route?.trim() || DEFAULT_ROUTE[params.kind];

    await this.notifier.notify({
      kind: params.kind,
      severity: params.severity,
      title: params.title,
      body: params.body,
      entityId,
      route,
    });
    ctx.log('info', `notified: ${params.kind} — ${params.title}`);

    return { kind: params.kind, title: params.title, entityId, route, notified: true };
  }
}
