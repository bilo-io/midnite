// Type declarations for the Vercel "Ignored Build Step" script (a plain .mjs so
// it runs dependency-free on Vercel's Node image). Lets the shared drift-guard
// test import the pure helpers with types instead of tripping noImplicitAny.

export const SUBTREES: Record<string, string[]>;
export const ALWAYS_BUILD: string[];
export const NEVER_DEPLOY: string[];
export const PRODUCTION_BRANCH: string;

export function decideVercelBuild(o: {
  app: 'web' | 'docs' | string;
  env?: string;
  ref?: string;
  changedFiles: string[] | null;
  productionBranch?: string;
}): { build: boolean; reason: string };

export function gitChangedFiles(run?: (args: string[]) => string): string[] | null;
