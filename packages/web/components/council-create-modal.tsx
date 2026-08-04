'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createCouncil } from '@/lib/api';

const inputClass =
  'flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

export function CouncilCreateModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const t = useTranslations('council');
  const tCommon = useTranslations('common');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = async () => {
    if (!name.trim() || saving) return;
    setSaving(true);
    setError(null);
    try {
      const council = await createCouncil({
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      router.push(`/councils/view?id=${council.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('create.failed'));
      setSaving(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('create.title')}
          className="pointer-events-auto flex w-full max-w-md flex-col rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5">
            <h2 className="text-sm font-semibold">{t('create.title')}</h2>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={tCommon('close')}
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </header>

          <div className="space-y-5 px-5 py-4">
            <div className="space-y-1.5">
              <label htmlFor="council-name" className="text-xs font-medium text-muted-foreground">
                {t('create.name')}
              </label>
              <input
                id="council-name"
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
                placeholder={t('create.namePlaceholder')}
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="council-description"
                className="text-xs font-medium text-muted-foreground"
              >
                {t('create.description')}{' '}
                <span className="font-normal">{t('create.optional')}</span>
              </label>
              <input
                id="council-description"
                className={inputClass}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void submit();
                }}
                placeholder={t('create.descriptionPlaceholder')}
              />
            </div>

            {error ? <p className="text-sm text-destructive">{error}</p> : null}
          </div>

          <footer className="flex items-center justify-end gap-2 border-t border-border/60 px-5 py-3.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              {tCommon('cancel')}
            </Button>
            <Button type="button" size="sm" disabled={!name.trim() || saving} onClick={() => void submit()}>
              {saving ? t('create.creating') : t('create.submit')}
            </Button>
          </footer>
        </div>
      </div>
    </>
  );
}
