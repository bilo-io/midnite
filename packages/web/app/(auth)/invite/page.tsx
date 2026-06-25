'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { InviteAcceptView } from './[token]/invite-accept-view';

function InvitePageContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  return <InviteAcceptView token={token} />;
}

export default function InvitePage() {
  return (
    <Suspense>
      <InvitePageContent />
    </Suspense>
  );
}
