'use client';

import { useEffect, useState } from 'react';
import type { SsoIdentity } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentUser, updateMyProfile, updateMyPassword } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong';
}

export function AccountView() {
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [nameSaving, setNameSaving] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaved, setPwSaved] = useState(false);

  // Linked SSO identities (Phase 70 D). `null` = unknown/not applicable (JWT off or
  // the /auth/me read failed) → the section is hidden. `[]` = enabled but none linked.
  const [identities, setIdentities] = useState<SsoIdentity[] | null>(null);
  useEffect(() => {
    getCurrentUser()
      .then((u) => setIdentities(u.identities ?? []))
      .catch(() => setIdentities(null));
  }, []);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    setNameSaving(true);
    try {
      const updated = await updateMyProfile({ name });
      setUser(updated);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      setNameError(errMsg(err));
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPw !== confirmPw) {
      setPwError('New passwords do not match');
      return;
    }
    if (newPw.length < 8) {
      setPwError('Password must be at least 8 characters');
      return;
    }
    setPwSaving(true);
    try {
      await updateMyPassword({ currentPassword: currentPw, newPassword: newPw });
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2000);
    } catch (err) {
      setPwError(errMsg(err));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-md">
      {/* Display name */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">Display name</h2>
          <p className="text-xs text-muted-foreground mt-0.5">How you appear to teammates.</p>
        </div>
        <form onSubmit={(e) => void handleSaveName(e)} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="display-name" className="text-xs text-muted-foreground">Name</label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={nameSaving || !name.trim()}>
              {nameSaving ? 'Saving…' : 'Save'}
            </Button>
            {nameSaved && <span className="text-xs text-muted-foreground">Saved</span>}
          </div>
        </form>
      </section>

      <div className="border-t border-border" />

      {/* Email (read-only) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">Email</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Your sign-in address. Not editable.</p>
        </div>
        <Input value={user?.email ?? ''} readOnly disabled className="max-w-sm" />
      </section>

      <div className="border-t border-border" />

      {/* Change password */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">Change password</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Choose a new password for your account.</p>
        </div>
        <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="current-pw" className="text-xs text-muted-foreground">Current password</label>
            <Input
              id="current-pw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new-pw" className="text-xs text-muted-foreground">New password</label>
            <Input
              id="new-pw"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirm-pw" className="text-xs text-muted-foreground">Confirm new password</label>
            <Input
              id="confirm-pw"
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          {pwError && <p className="text-xs text-destructive">{pwError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={pwSaving || !currentPw || !newPw || !confirmPw}>
              {pwSaving ? 'Updating…' : 'Update password'}
            </Button>
            {pwSaved && <span className="text-xs text-muted-foreground">Password updated</span>}
          </div>
        </form>
      </section>

      {identities !== null ? (
        <>
          <div className="border-t border-border" />

          {/* Linked accounts */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-medium">Linked accounts</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Third-party providers you can sign in with. Linked automatically the first time you
                use &ldquo;Continue with Google / GitHub&rdquo;.
              </p>
            </div>
            {identities.length === 0 ? (
              <p className="text-xs text-muted-foreground">No linked accounts yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {identities.map((id) => (
                  <li
                    key={`${id.provider}-${id.email}`}
                    className="flex items-center gap-2 text-sm text-foreground"
                  >
                    <span className="w-16 shrink-0 font-medium capitalize">{id.provider}</span>
                    <span className="truncate text-muted-foreground" title={id.email}>
                      {id.email}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
