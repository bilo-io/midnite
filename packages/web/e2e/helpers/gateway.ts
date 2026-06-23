import type { Status } from '@midnite/shared';

import { GATEWAY_ORIGIN } from '../config';

/**
 * Seed helpers for the e2e gateway. The gateway boots with its agent pool
 * disabled and no LLM credentials (see `fixtures/midnite.e2e.json`), so creating
 * a task never spawns a real agent and classification degrades to a placeholder
 * whose title is the prompt's first line — i.e. for a single-line prompt the
 * `prompt` IS the resulting task title, which makes board assertions deterministic.
 */

/** A task created over the gateway REST API. */
export type SeededTask = { id: string; title: string; status: Status };

/**
 * Create a task via `POST /tasks` (multipart, exactly as the web client does).
 * `status` places it straight into a column without a follow-up status PATCH.
 */
export async function seedTask(prompt: string, status: Status = 'todo'): Promise<SeededTask> {
  const form = new FormData();
  form.set('prompt', prompt);
  form.set('status', status);

  const res = await fetch(`${GATEWAY_ORIGIN}/tasks`, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`seedTask failed (${res.status}): ${await res.text().catch(() => '')}`);
  }

  const { task } = (await res.json()) as { task: SeededTask };
  return { id: task.id, title: task.title, status: task.status };
}

/** A project created over the gateway REST API. */
export type SeededProject = { id: string; name: string };

/**
 * Create a project via `POST /projects` (JSON, as the web client does). The
 * `description` doubles as the breakdown "goal" — with the LLM disabled in e2e,
 * `draft-breakdown` falls back to a single task whose title IS that description,
 * which keeps the breakdown-flow assertion deterministic.
 */
export async function seedProject(name: string, description: string): Promise<SeededProject> {
  const res = await fetch(`${GATEWAY_ORIGIN}/projects`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, description, tag: 'E2E', color: '#3366ff' }),
  });
  if (!res.ok) {
    throw new Error(`seedProject failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  const { project } = (await res.json()) as { project: { id: string; name: string } };
  return { id: project.id, name: project.name };
}
