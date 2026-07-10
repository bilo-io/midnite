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
export async function seedTask(
  prompt: string,
  status: Status = 'todo',
  opts: { projectId?: string } = {},
): Promise<SeededTask> {
  const form = new FormData();
  form.set('prompt', prompt);
  form.set('status', status);
  if (opts.projectId) form.set('projectId', opts.projectId);

  const res = await fetch(`${GATEWAY_ORIGIN}/tasks`, { method: 'POST', body: form });
  if (!res.ok) {
    throw new Error(`seedTask failed (${res.status}): ${await res.text().catch(() => '')}`);
  }

  const { task } = (await res.json()) as { task: SeededTask };
  return { id: task.id, title: task.title, status: task.status };
}

/** Assign a task to a milestone (or clear with null) via `PATCH /tasks/:id/milestone`. */
export async function assignMilestone(taskId: string, milestoneId: string | null): Promise<void> {
  const res = await fetch(`${GATEWAY_ORIGIN}/tasks/${taskId}/milestone`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ milestoneId }),
  });
  if (!res.ok) {
    throw new Error(`assignMilestone failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
}

/** Create a milestone under a project via `POST /projects/:id/milestones`. */
export async function seedMilestone(projectId: string, name: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${GATEWAY_ORIGIN}/projects/${projectId}/milestones`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    throw new Error(`seedMilestone failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  const { milestone } = (await res.json()) as { milestone: { id: string; name: string } };
  return { id: milestone.id, name: milestone.name };
}

/**
 * Add a blocker edge via `POST /tasks/:id/dependencies` — `taskId` depends on
 * (is blocked by) `dependsOnId`. Used to seed a dependency DAG for the graph view.
 */
export async function seedDependency(taskId: string, dependsOnId: string): Promise<void> {
  const res = await fetch(`${GATEWAY_ORIGIN}/tasks/${taskId}/dependencies`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dependsOnId }),
  });
  if (!res.ok) {
    throw new Error(`seedDependency failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
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

/** A memory created over the gateway REST API. */
export type SeededMemory = { id: string; title: string };

/** Create a global memory via `POST /memories` (JSON, as the web client does). */
export async function seedMemory(title: string, content = ''): Promise<SeededMemory> {
  const res = await fetch(`${GATEWAY_ORIGIN}/memories`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, content }),
  });
  if (!res.ok) {
    throw new Error(`seedMemory failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  const { memory } = (await res.json()) as { memory: { id: string; title: string } };
  return { id: memory.id, title: memory.title };
}

/** Register a repo with a GitHub `owner/repo` slug (so it qualifies as a phase-doc sync target). */
export async function seedRepo(name: string, ownerRepo: string): Promise<{ id: string; name: string }> {
  const res = await fetch(`${GATEWAY_ORIGIN}/repos`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name, path: `/tmp/${name}`, ownerRepo }),
  });
  if (!res.ok) {
    throw new Error(`seedRepo failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  const { repo } = (await res.json()) as { repo: { id: string; name: string } };
  return { id: repo.id, name: repo.name };
}

/** An idea created over the gateway REST API. */
export type SeededIdea = { id: string; title: string };

/**
 * Create an idea via `POST /ideas` (JSON, as the web client does). The e2e
 * gateway has no LLM credential, so the chat composer's assistant reply is the
 * deterministic "AI is not configured" fallback — perfect for a flow assertion.
 */
export async function seedIdea(title: string, body?: string): Promise<SeededIdea> {
  const res = await fetch(`${GATEWAY_ORIGIN}/ideas`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title, ...(body ? { body } : {}) }),
  });
  if (!res.ok) {
    throw new Error(`seedIdea failed (${res.status}): ${await res.text().catch(() => '')}`);
  }
  const { idea } = (await res.json()) as { idea: { id: string; title: string } };
  return { id: idea.id, title: idea.title };
}
