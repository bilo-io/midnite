'use client';

import { useRef, useState } from 'react';
import { Check, KeyRound, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { User } from '@midnite/shared';
import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/auth-context';
import { updateMyProfile, updateMyPassword } from '@/lib/api';
import { cn } from '@/lib/utils';

function SavedBadge({ visible }: { visible: boolean }) {
  const tc = useTranslations('common');
  return (
    <span
      aria-live="polite"
      className={cn(
        'flex items-center gap-1 text-xs text-muted-foreground transition-opacity',
        visible ? 'opacity-100' : 'opacity-0',
      )}
    >
      <Check className="h-3.5 w-3.5" />
      {tc('saved')}
    </span>
  );
}

function AvatarInitial({ user }: { user: User | null }) {
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?';
  return (
    <div
      aria-hidden
      className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-accent text-xl font-semibold text-accent-foreground"
    >
      {initials}
    </div>
  );
}

function DisplayNameSection({ user }: { user: User | null }) {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const isDirty = name.trim() !== (user?.name ?? '').trim() && name.trim().length > 0;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    setError(null);
    try {
      await updateMyProfile({ name: name.trim() });
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.couldNotSaveName'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-5">
      <div className="flex items-center gap-4">
        <AvatarInitial user={user} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{user?.name ?? '—'}</p>
          <p className="truncate text-sm text-muted-foreground">{user?.email ?? '—'}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="display-name" className="text-sm font-medium">{t('profile.displayName')}</label>
        <div className="flex gap-2">
          <Input
            id="display-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('profile.namePlaceholder')}
            maxLength={120}
            className="max-w-xs"
          />
          <Button
            type="button"
            size="sm"
            disabled={!isDirty || saving}
            onClick={() => void handleSave()}
          >
            {saving ? tc('saving') : tc('save')}
          </Button>
          <SavedBadge visible={saved} />
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">{t('profile.email')}</p>
        <p className="text-sm text-muted-foreground">{user?.email ?? '—'}</p>
        <p className="text-xs text-muted-foreground">{t('profile.emailReadonly')}</p>
      </div>
    </div>
  );
}

function ChangePasswordSection() {
  const t = useTranslations('settings');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const mismatch = confirm.length > 0 && next !== confirm;
  const canSave = current.length > 0 && next.length >= 8 && next === confirm;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      await updateMyPassword({ currentPassword: current, newPassword: next });
      setCurrent('');
      setNext('');
      setConfirm('');
      setSaved(true);
      clearTimeout(savedTimer.current);
      savedTimer.current = setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('profile.couldNotUpdatePassword'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-5">
      <div className="space-y-1.5">
        <label htmlFor="current-password" className="text-sm font-medium">{t('profile.currentPassword')}</label>
        <Input
          id="current-password"
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          autoComplete="current-password"
          className="max-w-xs"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="new-password" className="text-sm font-medium">{t('profile.newPassword')}</label>
        <Input
          id="new-password"
          type="password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">{t('profile.minChars')}</p>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="confirm-password" className="text-sm font-medium">{t('profile.confirmPassword')}</label>
        <Input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={cn('max-w-xs', mismatch && 'border-destructive')}
        />
        {mismatch ? <p className="text-xs text-destructive">{t('profile.passwordsMismatch')}</p> : null}
      </div>

      <div className="flex items-center gap-3">
        <Button
          type="button"
          size="sm"
          disabled={!canSave || saving}
          onClick={() => void handleSave()}
        >
          {saving ? t('profile.updating') : t('profile.updatePassword')}
        </Button>
        <SavedBadge visible={saved} />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ProfileSettings() {
  const t = useTranslations('settings');
  const { user } = useAuth();

  return (
    <div className="space-y-4">
      <Accordion title={t('profile.account')} icon={<UserRound className="h-3.5 w-3.5" />} defaultOpen>
        <DisplayNameSection user={user} />
      </Accordion>

      <Accordion title={t('profile.changePassword')} icon={<KeyRound className="h-3.5 w-3.5" />}>
        <ChangePasswordSection />
      </Accordion>
    </div>
  );
}
