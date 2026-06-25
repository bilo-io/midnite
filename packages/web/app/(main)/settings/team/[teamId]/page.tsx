'use client';

import { use } from 'react';
import { TeamDetailView } from './team-detail-view';

// generateStaticParams returns [] so next build (output:export) succeeds.
// Client-side navigation still works; direct-URL access requires the file
// server to fall back to the app shell (index.html).
export async function generateStaticParams() {
  return [];
}

export default function SettingsTeamDetailPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  return <TeamDetailView teamId={teamId} />;
}
