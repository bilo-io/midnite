'use client';

import { use } from 'react';
import { InviteAcceptView } from './invite-accept-view';

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  return <InviteAcceptView token={token} />;
}
