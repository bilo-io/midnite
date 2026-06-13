import { z } from 'zod';

// ---- Snapshot stored in routine_progress.snapshot (JSON) ----
// Captures the config at recording time so history is stable after edits.

export const ProgressItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  done: z.boolean(),
});

export const ProgressGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  items: z.array(ProgressItemSchema),
});

export const RoutineProgressSnapshotSchema = z.object({
  groups: z.array(ProgressGroupSchema),
});

// ---- Live config types (groups + items as stored in the DB) ----

export const RoutineItemSchema = z.object({
  id: z.string(),
  groupId: z.string(),
  title: z.string(),
  position: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RoutineGroupSchema = z.object({
  id: z.string(),
  routineId: z.string(),
  name: z.string(),
  position: z.number().int().nonnegative(),
  items: z.array(RoutineItemSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const RoutineSchema = z.object({
  id: z.string(),
  name: z.string(),
  groups: z.array(RoutineGroupSchema),
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---- Progress record ----

export const RoutineProgressSchema = z.object({
  id: z.string(),
  routineId: z.string(),
  date: z.string(), // YYYY-MM-DD
  snapshot: RoutineProgressSnapshotSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

// ---- Request schemas ----

export const CreateRoutineRequestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  groups: z
    .array(
      z.object({
        name: z.string().trim().min(1).max(100),
        items: z.array(z.object({ title: z.string().trim().min(1).max(200) })).default([]),
      }),
    )
    .optional(),
});

export const UpdateRoutineRequestSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
});

export const CreateGroupRequestSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const UpdateGroupRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  position: z.number().int().nonnegative().optional(),
});

export const CreateItemRequestSchema = z.object({
  title: z.string().trim().min(1).max(200),
});

export const UpdateItemRequestSchema = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  position: z.number().int().nonnegative().optional(),
});

// itemStatus maps itemId → done boolean for the given date
export const RecordProgressRequestSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  itemStatus: z.record(z.string(), z.boolean()),
});

// ---- Response schemas ----

export const RoutineResponseSchema = z.object({ routine: RoutineSchema });
export const RoutinesResponseSchema = z.object({ routines: z.array(RoutineSchema) });
export const RoutineProgressResponseSchema = z.object({ progress: RoutineProgressSchema });
export const RoutineProgressListResponseSchema = z.object({
  progress: z.array(RoutineProgressSchema),
});

// ---- TypeScript types ----

export type ProgressItem = z.infer<typeof ProgressItemSchema>;
export type ProgressGroup = z.infer<typeof ProgressGroupSchema>;
export type RoutineProgressSnapshot = z.infer<typeof RoutineProgressSnapshotSchema>;
export type RoutineItem = z.infer<typeof RoutineItemSchema>;
export type RoutineGroup = z.infer<typeof RoutineGroupSchema>;
export type Routine = z.infer<typeof RoutineSchema>;
export type RoutineProgress = z.infer<typeof RoutineProgressSchema>;
export type CreateRoutineRequest = z.infer<typeof CreateRoutineRequestSchema>;
export type UpdateRoutineRequest = z.infer<typeof UpdateRoutineRequestSchema>;
export type CreateGroupRequest = z.infer<typeof CreateGroupRequestSchema>;
export type UpdateGroupRequest = z.infer<typeof UpdateGroupRequestSchema>;
export type CreateItemRequest = z.infer<typeof CreateItemRequestSchema>;
export type UpdateItemRequest = z.infer<typeof UpdateItemRequestSchema>;
export type RecordProgressRequest = z.infer<typeof RecordProgressRequestSchema>;
export type RoutineResponse = z.infer<typeof RoutineResponseSchema>;
export type RoutinesResponse = z.infer<typeof RoutinesResponseSchema>;
export type RoutineProgressResponse = z.infer<typeof RoutineProgressResponseSchema>;
export type RoutineProgressListResponse = z.infer<typeof RoutineProgressListResponseSchema>;
