import { z } from 'zod';

export const MAX_NOTE_CONTENT = 2_000;

export const NoteSchema = z.object({
  id: z.string(),
  content: z.string(),
  completed: z.boolean(),
  position: z.number().int().nonnegative(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export const CreateNoteRequestSchema = z.object({
  content: z.string().trim().min(1, 'content is required').max(MAX_NOTE_CONTENT),
});

export const UpdateNoteRequestSchema = z.object({
  content: z.string().trim().min(1).max(MAX_NOTE_CONTENT).optional(),
  completed: z.boolean().optional(),
});

export const NoteResponseSchema = z.object({ note: NoteSchema });
export const NotesResponseSchema = z.object({ notes: z.array(NoteSchema) });

export type Note = z.infer<typeof NoteSchema>;
export type CreateNoteRequest = z.infer<typeof CreateNoteRequestSchema>;
export type UpdateNoteRequest = z.infer<typeof UpdateNoteRequestSchema>;
export type NoteResponse = z.infer<typeof NoteResponseSchema>;
export type NotesResponse = z.infer<typeof NotesResponseSchema>;
