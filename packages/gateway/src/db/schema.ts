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
    projectId: text('project_id'),
    prUrl: text('pr_url'),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
  },
  (t) => ({
    statusIdx: index('tasks_status_idx').on(t.status),
    projectIdx: index('tasks_project_idx').on(t.projectId),
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

export const taskLinks = sqliteTable(
  'task_links',
  {
    id: text('id').primaryKey(),
    taskId: text('task_id').notNull(),
    url: text('url').notNull(),
    kind: text('kind').notNull(),
    label: text('label'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    taskIdx: index('task_links_task_idx').on(t.taskId),
  }),
);

export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  tag: text('tag').notNull(),
  color: text('color').notNull(),
  plan: text('plan'),
  planUpdatedAt: text('plan_updated_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const projectSources = sqliteTable(
  'project_sources',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    url: text('url').notNull(),
    kind: text('kind').notNull(),
    title: text('title'),
    faviconUrl: text('favicon_url'),
    fetchedAt: text('fetched_at'),
    createdAt: text('created_at').notNull(),
  },
  (t) => ({
    projectIdx: index('project_sources_project_idx').on(t.projectId),
  }),
);

export type TaskRow = typeof tasks.$inferSelect;
export type TaskInsert = typeof tasks.$inferInsert;
export type TaskEventRow = typeof taskEvents.$inferSelect;
export type TaskEventInsert = typeof taskEvents.$inferInsert;
export type TaskAttachmentRow = typeof taskAttachments.$inferSelect;
export type TaskAttachmentInsert = typeof taskAttachments.$inferInsert;
export type TaskLinkRow = typeof taskLinks.$inferSelect;
export type TaskLinkInsert = typeof taskLinks.$inferInsert;
export type ProjectRow = typeof projects.$inferSelect;
export type ProjectInsert = typeof projects.$inferInsert;
export type ProjectSourceRow = typeof projectSources.$inferSelect;
export type ProjectSourceInsert = typeof projectSources.$inferInsert;
