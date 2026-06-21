import type { NodeRunLog } from '@midnite/shared';

// Everything an executor needs to run one node. `params` is the node's params
// after the engine has resolved any `{{expr}}` templates against the run context
// (the executor still re-parses against its own schema for defaults + type
// safety); `input` is the merged output of upstream nodes; `signal` aborts a
// cancelled run.
export interface NodeRunContext {
  // The id of the workflow this run belongs to — used by persistence-backed nodes
  // (storage.*) to scope their reads/writes per workflow.
  workflowId: string;
  input: unknown;
  params: Record<string, unknown>;
  signal: AbortSignal;
  log(level: NodeRunLog['level'], message: string): void;
}

// A pluggable runtime for one node type. The declarative contract (params schema,
// ports, form fields) lives in @midnite/shared NODE_TYPE_DEFINITIONS; this is the code
// that actually runs. Adding an integration = one definition in shared + one executor.
export interface NodeExecutor {
  readonly typeId: string;
  execute(ctx: NodeRunContext): Promise<unknown>;
}

// Multi-provider token: every NodeExecutor is collected into an array under this token,
// then indexed by typeId in ExecutorRegistry.
export const NODE_EXECUTORS = Symbol('NODE_EXECUTORS');
