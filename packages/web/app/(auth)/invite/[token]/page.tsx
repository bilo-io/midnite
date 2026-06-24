'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { TeamInvite } from '@midnite/shared';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { acceptInvite, getInvite } from '@/lib/api';

export default function InvitePage({ params }: { params: { token: string } }) {
  const { user, isLoading, jwtEnabled } = useAuth();
  const router = useRouter();
  const { token } = params;

  const [invite, setInvite] = useState<TeamInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState<string | null>(null);

  useEffect(() => {
    getInvite(token)
      .then((inv) => setInvite(inv))
      .catch((err) => setFetchError(err instanceof Error ? err.message : 'Invalid or expired invite'))
      .finally(() => setLoading(false));
  }, [token]);

  // Redirect to login if JWT is enabled but user is not authenticated.
  useEffect(() => {
    if (!isLoading && jwtEnabled && !user) {
      router.push(`/login?return=/invite/${encodeURIComponent(token)}`);
    }
  }, [isLoading, jwtEnabled, user, token, router]);

  const handleAccept = async () => {
    if (!user) {
      router.push(`/login?return=/invite/${encodeURIComponent(token)}`);
      return;
    }
    setAccepting(true);
    setAcceptError(null);
    try {
      await acceptInvite(token);
      router.push('/');
    } catch (err) {
      setAcceptError(err instanceof Error ? err.message : 'Could not accept invite');
      setAccepting(false);
    }
  };

  const isExpired = invite ? new Date(invite.expiresAt) < new Date() : false;
  const isAlreadyAccepted = !!invite?.acceptedAt;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Team invitation</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading invite…</p>
        ) : fetchError ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive">{fetchError}</p>
            <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
              Go to midnite
            </Button>
          </div>
        ) : invite ? (
          <>
            <div className="space-y-1">
              <p className="text-sm">
                You&apos;ve been invited to join a team as{' '}
                <span className="font-medium">{invite.role}</span>.
              </p>
              {invite.email ? (
                <p className="text-xs text-muted-foreground">
                  This invite is for <span className="font-mono">{invite.email}</span>.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Expires {new Date(invite.expiresAt).toLocaleDateString()}.
              </p>
            </div>

            {isAlreadyAccepted ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">This invite has already been accepted.</p>
                <Button className="w-full" onClick={() => router.push('/')}>Go to midnite</Button>
              </div>
            ) : isExpired ? (
              <div className="space-y-2">
                <p className="text-sm text-destructive">This invite has expired.</p>
                <Button variant="outline" className="w-full" onClick={() => router.push('/')}>
                  Go to midnite
                </Button>
              </div>
            ) : !user ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Sign in to accept this invitation.</p>
                <Button
                  className="w-full"
                  onClick={() =>
                    router.push(`/login?return=/invite/${encodeURIComponent(token)}`)
                  }
                >
                  Sign in
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Accepting as <span className="font-medium">{user.name}</span> ({user.email}).
                </p>
                {acceptError ? <p className="text-xs text-destructive">{acceptError}</p> : null}
                <Button
                  className="w-full"
                  disabled={accepting}
                  onClick={() => void handleAccept()}
                >
                  {accepting ? 'Accepting…' : 'Accept invitation'}
                </Button>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
