'use client';

import * as React from 'react';
import { useLocalStorage } from '@/lib/use-local-storage';

/**
 * A "feature list request": a parked idea the user has composed but not yet
 * committed to the agent pool. Each draft is a free-form prompt (one task per
 * line, mirroring the composer). Tasks are only crafted when the draft is
 * submitted from its modal — at which point the user chooses Backlog or Todo.
 *
 * Drafts persist client-side (localStorage); they never touch the gateway until
 * submitted. Image attachments are intentionally not part of a draft — they are
 * picked back up in the composer when a draft is committed.
 */
export type FeatureDraft = {
  id: string;
  name: string;
  text: string;
  /** Project the crafted tasks should be assigned to, if any. */
  projectId?: string | null;
  createdAt: number;
};

const STORAGE_KEY = 'midnite.featureDrafts.v1';

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `draft-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
}

/** Derive a short, human pill label from the draft's text. */
export function deriveDraftName(text: string): string {
  const firstLine = text
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  if (!firstLine) return 'Untitled idea';
  return firstLine.length > 48 ? `${firstLine.slice(0, 47).trimEnd()}…` : firstLine;
}

/** Split a draft's text into individual task prompts (one per non-empty line). */
export function draftTasks(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export type FeatureDraftsApi = {
  drafts: FeatureDraft[];
  hydrated: boolean;
  add: (text: string, name?: string, projectId?: string | null) => FeatureDraft;
  update: (id: string, patch: Partial<Pick<FeatureDraft, 'name' | 'text'>>) => void;
  remove: (id: string) => void;
};

export function useFeatureDrafts(): FeatureDraftsApi {
  const [drafts, setDrafts, hydrated] = useLocalStorage<FeatureDraft[]>(STORAGE_KEY, []);

  const add = React.useCallback(
    (text: string, name?: string, projectId?: string | null): FeatureDraft => {
      const draft: FeatureDraft = {
        id: newId(),
        name: (name ?? deriveDraftName(text)).trim() || 'Untitled idea',
        text,
        projectId: projectId ?? null,
        createdAt: Date.now(),
      };
      setDrafts((prev) => [...prev, draft]);
      return draft;
    },
    [setDrafts],
  );

  const update = React.useCallback(
    (id: string, patch: Partial<Pick<FeatureDraft, 'name' | 'text'>>) => {
      setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
    },
    [setDrafts],
  );

  const remove = React.useCallback(
    (id: string) => {
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    },
    [setDrafts],
  );

  return { drafts, hydrated, add, update, remove };
}
