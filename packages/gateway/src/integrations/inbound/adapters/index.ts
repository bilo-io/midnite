import type { InboundProvider } from '@midnite/shared';
import { githubAdapter } from './github.adapter';
import { linearAdapter } from './linear.adapter';
import { genericAdapter } from './generic.adapter';
import type { InboundAdapter } from './types';

/** Provider → adapter registry for the receiver. */
export const INBOUND_ADAPTERS: Record<InboundProvider, InboundAdapter> = {
  github: githubAdapter,
  linear: linearAdapter,
  generic: genericAdapter,
};

export type { InboundAdapter, InboundRequest, MappedTask } from './types';
