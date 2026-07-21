// Type declarations for the i18n catalog validator (a plain .mjs so it runs with
// only node on the runner). Lets the shared unit test import the pure helpers with
// types instead of tripping noImplicitAny (see importing-untyped-mjs note).

export const CANONICAL_LOCALE: string;

export function keyPaths(obj: Record<string, unknown>, prefix?: string): string[];

export function validateCatalogs(input: {
  catalogs: Record<string, Record<string, unknown>>;
  meta?: Record<string, { complete?: boolean; needsReview?: string[] }>;
}): {
  ok: boolean;
  errors: string[];
  coverage: Record<string, { translated: number; total: number }>;
};

export function loadCatalogs(messagesDir: string): {
  catalogs: Record<string, Record<string, unknown>>;
  meta: Record<string, { complete?: boolean; needsReview?: string[] }>;
};
