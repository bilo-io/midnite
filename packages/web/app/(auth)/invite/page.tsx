'use client';

import { useSearchParams } from 'next/navigation';
import { InviteAcceptView } from './[token]/invite-accept-view';

export default function InvitePage() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  return <InviteAcceptView token={token} />;
}
