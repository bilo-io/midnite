'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import type { TeamInvite } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { acceptInvite, getInvite } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

export function InviteAcceptView({ token }: { token: string }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<TeamInvite | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    getInvite(token)
      .then(setInvite)
      .catch((e) => setFetchError(errMsg(e)));
  }, [token]);

  const handleAccept = async () => {
    if (!user) {
      router.push(`/login?return=/invite?token=${encodeURIComponent(token)}`);
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    try {
      await acceptInvite(token);
      setAccepted(true);
      setTimeout(() => router.push('/'), 1500);
    } catch (e) {
      setAcceptError(errMsg(e));
    } finally {
      setAccepting(false);
    }
  };

  if (isLoading || (!invite && !fetchError)) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-center">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-center space-y-3">
        <p className="text-sm font-medium">Invite not found</p>
        <p className="text-xs text-muted-foreground">{fetchError}</p>
        <Button variant="outline" size="sm" onClick={() => router.push('/')}>Go home</Button>
      </div>
    );
  }

  if (accepted) {
    return (
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm text-center space-y-2">
        <p className="text-sm font-medium text-success">You've joined the team!</p>
        <p className="text-xs text-muted-foreground">Redirecting…</p>
      </div>
    );
  }

  const expired = invite ? new Date(invite.expiresAt) < new Date() : false;

  return (
    <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 shadow-sm space-y-6">
      <div className="text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          <Users className="h-6 w-6 text-accent-foreground" />
        </div>
        <h1 className="text-lg font-semibold">You've been invited</h1>
        <p className="text-sm text-muted-foreground">
          Join as <strong>{invite?.role}</strong>
          {invite?.email ? ` (${invite.email})` : ''}
        </p>
        {invite && (
          <p className="text-xs text-muted-foreground">
            Expires {new Date(invite.expiresAt).toLocaleDateString()}
          </p>
        )}
      </div>

      {expired && (
        <p className="text-sm text-destructive text-center">This invite has expired.</p>
      )}

      {acceptError && <p className="text-sm text-destructive text-center">{acceptError}</p>}

      {!expired && (
        <div className="space-y-2">
          <Button className="w-full" onClick={() => void handleAccept()} disabled={accepting}>
            {accepting ? 'Accepting…' : user ? 'Accept invitation' : 'Sign in to accept'}
          </Button>
          {!user && (
            <p className="text-xs text-center text-muted-foreground">
              You'll be redirected to sign in, then returned here.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
