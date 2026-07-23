'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { SsoIdentity } from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getCurrentUser, updateMyProfile, updateMyPassword } from '@/lib/api';
import { useAuth } from '@/contexts/auth-context';

function errMsg(e: unknown, fallback: string): string {
  return e instanceof Error ? e.message : fallback;
}

export function AccountView() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
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
      setNameError(errMsg(err, t('profile.genericError')));
    } finally {
      setNameSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    if (newPw !== confirmPw) {
      setPwError(t('profile.passwordsNoMatch'));
      return;
    }
    if (newPw.length < 8) {
      setPwError(t('profile.passwordTooShort'));
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
      setPwError(errMsg(err, t('profile.genericError')));
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-md">
      {/* Display name */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">{t('profile.displayName')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('profile.displayNameHint')}</p>
        </div>
        <form onSubmit={(e) => void handleSaveName(e)} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="display-name" className="text-xs text-muted-foreground">{t('profile.nameLabel')}</label>
            <Input
              id="display-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('profile.namePlaceholder')}
              autoComplete="name"
            />
          </div>
          {nameError && <p className="text-xs text-destructive">{nameError}</p>}
          <div className="flex items-center gap-3">
            <Button type="submit" size="sm" disabled={nameSaving || !name.trim()}>
              {nameSaving ? tc('saving') : tc('save')}
            </Button>
            {nameSaved && <span className="text-xs text-muted-foreground">{tc('saved')}</span>}
          </div>
        </form>
      </section>

      <div className="border-t border-border" />

      {/* Email (read-only) */}
      <section className="space-y-3">
        <div>
          <h2 className="text-sm font-medium">{t('profile.email')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('profile.emailHint')}</p>
        </div>
        <Input value={user?.email ?? ''} readOnly disabled className="max-w-sm" />
      </section>

      <div className="border-t border-border" />

      {/* Change password */}
      <section className="space-y-4">
        <div>
          <h2 className="text-sm font-medium">{t('profile.changePassword')}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{t('profile.changePasswordHint')}</p>
        </div>
        <form onSubmit={(e) => void handleChangePassword(e)} className="space-y-3">
          <div className="space-y-1">
            <label htmlFor="current-pw" className="text-xs text-muted-foreground">{t('profile.currentPassword')}</label>
            <Input
              id="current-pw"
              type="password"
              value={currentPw}
              onChange={(e) => setCurrentPw(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="new-pw" className="text-xs text-muted-foreground">{t('profile.newPassword')}</label>
            <Input
              id="new-pw"
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="confirm-pw" className="text-xs text-muted-foreground">{t('profile.confirmPassword')}</label>
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
              {pwSaving ? t('profile.updating') : t('profile.updatePassword')}
            </Button>
            {pwSaved && <span className="text-xs text-muted-foreground">{t('profile.passwordUpdated')}</span>}
          </div>
        </form>
      </section>

      {identities !== null ? (
        <>
          <div className="border-t border-border" />

          {/* Linked accounts */}
          <section className="space-y-3">
            <div>
              <h2 className="text-sm font-medium">{t('profile.linkedAccounts')}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {t('profile.linkedAccountsHint')}
              </p>
            </div>
            {identities.length === 0 ? (
              <p className="text-xs text-muted-foreground">{t('profile.noLinkedAccounts')}</p>
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
