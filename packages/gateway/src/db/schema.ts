import {
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// NOTE: status/kind validity is enforced at the app layer via zod
// (see @midnite/shared StatusSchema / TaskKindSchema).

export const tasks = sqliteTable(
  'tasks',
  {
    id: text('id').primaryKey(),
    title: text('title').notNull(),
    kind: text('kind').notNull().default('unknown'),
    status: text('status').notNull().default('todo'),
    prompt: text('prompt'),
    repo: text('repo'),
    agentId: text('agent_id'),
    sessionId: text('session_id'),
    prUrl: text('pr_url'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    statusIdx: index('tasks_status_idx').on(t.status),
  }),
);

export const taskEvents = sqliteTable(
  'task_events',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    at: text('at').notNull(),
    kind: text('kind').notNull(),
    data: text('data'),
  },
  (t) => ({
    taskAtIdx: index('task_events_task_at_idx').on(t.taskId, t.at),
  }),
);

export const taskAttachments = sqliteTable(
  'task_attachments',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    path: text('path').notNull(),
    mime: text('mime').notNull(),
    size: integer('size').notNull(),
    originalName: text('original_name'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    taskIdx: index('task_attachments_task_idx').on(t.taskId),
  }),
);

export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
export type TaskEventRow = typeof taskEvents.$inferSelect;
export type TaskEventInsert = typeof taskEvents.$inferInsert;
export type TaskAttachmentRow = typeof taskAttachments.$inferSelect;
export type TaskAttachmentInsert = typeof taskAttachments.$inferInsert;
