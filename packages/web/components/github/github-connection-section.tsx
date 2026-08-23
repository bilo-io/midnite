'use client';

import { GithubConnectionCard } from '@/components/github/github-connection-card';

/**
 * Wrapper so the Integrations page mounts one component rather than knowing the
 * card's internals — and so the card can be dropped elsewhere (the Repos page's
 * banner links here) without dragging page-level layout along with it.
 */
export function GithubConnectionSection() {
  return <GithubConnectionCard />;
}
