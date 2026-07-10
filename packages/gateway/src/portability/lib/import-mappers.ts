import { getTableColumns } from 'drizzle-orm';
import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import {
  approvalRules,
  councilMembers,
  councils,
  ideas,
  media,
  memories,
  memorySources,
  notes,
  projects,
  repos,
  routineGroups,
  routineItems,
  routines,
  taskAttachments,
  taskDependencies,
  taskEvents,
  taskLinks,
  tasks,
  workflows,
} from '../../db/schema';

/**
 * Phase 49 C — de-hydration: turn the hydrated domain objects an export archive
 * carries back into raw table rows for a faithful restore. Rather than hand-map
 * every column, {@link buildRow} reflects the Drizzle table's real columns and
 * maps generically — which also **drops derived fields** the export embeds
 * (`prStatus`, `checkRunStatus`, `archived`, `taskCount`, `consultationCount`,
 * nested child arrays) since they aren't columns. Two domains need a pre-transform
 * the generic pass can't infer (workflow graph split, `archived`→`archivedAt`).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic over any Drizzle table
type AnyTable = SQLiteTable<any>;
type Obj = Record<string, unknown>;

/**
 * Build an insert row for `table` from a hydrated object: only real columns,
 * JSON-encode object/array values (the schema stores JSON as `text`), and coerce
 * booleans to 0/1 (works for both raw-integer and `mode:'boolean'` columns).
 */
export function buildRow(table: AnyTable, obj: Obj): Obj {
  const cols = getTableColumns(table);
  const row: Obj = {};
  for (const key of Object.keys(cols)) {
    if (!(key in obj)) continue;
    const v = obj[key];
    if (v === undefined) continue;
    row[key] =
      v === null
        ? null
        : typeof v === 'object'
          ? JSON.stringify(v)
          : typeof v === 'boolean'
            ? (v ? 1 : 0)
            : v;
  }
  return row;
}

/** A child collection nested on a parent object → its own table + FK column. */
export interface ChildSpec {
  /** Field on the parent object holding the child array. */
  field: string;
  table: AnyTable;
  /** FK column (JS key) on the child pointing back at the parent's id. */
  fk: string;
  /** Grandchildren (e.g. routine group → items). */
  children?: ChildSpec[];
}

/** A blocker-style edge table (composite key, no own id) — e.g. task dependencies. */
export interface EdgeSpec {
  /** Field on the parent holding the array of "other" ids (strings). */
  field: string;
  table: AnyTable;
  /** Column for the parent id. */
  selfFk: string;
  /** Column for the referenced id. */
  otherFk: string;
}

export interface DomainSpec {
  name: string;
  parent: AnyTable;
  children?: ChildSpec[];
  edges?: EdgeSpec[];
  /** Pre-map transform for shapes the generic pass can't infer. Returns a shallow
   *  copy safe to mutate. */
  transform?: (obj: Obj) => Obj;
}

/** `archived: boolean` → `archivedAt` (the real column). The export is lossy on
 *  the exact timestamp, so preserve the *state*: archived ⇒ a non-null stamp
 *  (best-effort from updatedAt/createdAt), else null. */
function archivedToTimestamp(obj: Obj): Obj {
  if (!('archived' in obj)) return obj;
  const stamp = (obj['updatedAt'] as string) ?? (obj['createdAt'] as string) ?? new Date(0).toISOString();
  return { ...obj, archivedAt: obj['archived'] ? stamp : null };
}

/** Workflows carry `nodes`/`edges`/`trigger` (+ `archived`); the table wants a
 *  single `graph` JSON, a `triggerType`, and `archivedAt`. */
function workflowTransform(obj: Obj): Obj {
  const trigger = obj['trigger'] as { type?: string } | undefined;
  return archivedToTimestamp({
    ...obj,
    graph: { nodes: obj['nodes'] ?? [], edges: obj['edges'] ?? [] },
    triggerType: trigger?.type ?? 'manual',
  });
}

/**
 * Every domain the export produces, in **insert (dependency) order** — parents
 * before children, and cross-domain (a task's projectId → projects already
 * inserted earlier). Derived/volatile + auth tables are never here (never
 * imported). The reverse of this order is the `replace`-mode wipe order.
 */
export const IMPORT_DOMAINS: DomainSpec[] = [
  { name: 'repos', parent: repos },
  { name: 'projects', parent: projects, transform: archivedToTimestamp },
  { name: 'memories', parent: memories, transform: archivedToTimestamp, children: [{ field: 'sources', table: memorySources, fk: 'memoryId' }] },
  {
    name: 'tasks',
    parent: tasks,
    children: [
      { field: 'events', table: taskEvents, fk: 'taskId' },
      { field: 'attachments', table: taskAttachments, fk: 'taskId' },
      { field: 'links', table: taskLinks, fk: 'taskId' },
    ],
    edges: [{ field: 'dependsOn', table: taskDependencies, selfFk: 'taskId', otherFk: 'dependsOnTaskId' }],
  },
  { name: 'notes', parent: notes },
  {
    name: 'routines',
    parent: routines,
    children: [{ field: 'groups', table: routineGroups, fk: 'routineId', children: [{ field: 'items', table: routineItems, fk: 'groupId' }] }],
  },
  { name: 'media', parent: media },
  { name: 'councils', parent: councils, transform: archivedToTimestamp, children: [{ field: 'members', table: councilMembers, fk: 'councilId' }] },
  { name: 'ideas', parent: ideas },
  { name: 'approvalRules', parent: approvalRules },
  { name: 'workflows', parent: workflows, transform: workflowTransform },
];

/** The archive's domain names, in insert order (for iterating payloads). */
export const IMPORT_DOMAIN_ORDER = IMPORT_DOMAINS.map((d) => d.name);
