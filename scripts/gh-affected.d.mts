// Type declarations for the GitHub Actions affected-detection script (a plain
// .mjs so it runs with only moon + node on the runner). Lets the shared test
// import the pure helpers with types instead of tripping noImplicitAny.

export const PACKAGES: string[];
export const WEB_VISUAL: string[];

export function computeAffected(o: {
  affectedIds: string[];
  failOpen: boolean;
}): Record<string, 'true' | 'false'>;

export function queryAffected(
  run?: (args: string[]) => string,
): { ids: string[]; rootTouched: boolean };
