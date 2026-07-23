'use client';

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { useAuth } from '@/contexts/auth-context';
import { useAuthErrorMessage } from '@/lib/auth-errors';

// This page is behind NEXT_PUBLIC_REGISTRATION_OPEN=true. When the flag is
// absent, navigation to /register shows a "registration closed" notice rather
// than a 404 so the route still renders gracefully.

export default function RegisterPage() {
  const t = useTranslations('auth');
  const authError = useAuthErrorMessage();
  const { register } = useAuth();
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === 'true';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await register(email, name, password);
      router.push('/login');
    } catch (err) {
      setError(authError(err, 'registrationFailed'));
    } finally {
      setPending(false);
    }
  }

  if (!registrationOpen) {
    return (
      <div className="w-full">
        <h1 className="mb-3 text-2xl font-semibold tracking-tight text-foreground">
          {t('registrationClosed')}
        </h1>
        <p className="mb-6 text-sm text-muted-foreground">
          {t('registrationClosedBody')}
        </p>
        <Link href="/login">
          <Button variant="outline" className="w-full">
            {t('backToSignIn')}
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">{t('createAccount')}</h1>
      <div className="mb-4">
        <SsoButtons redirect="/" />
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium text-foreground">
            {t('name')}
          </label>
          <Input
            id="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('namePlaceholder')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            {t('email')}
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('emailPlaceholder')}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            {t('password')}
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t('passwordMinPlaceholder')}
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? t('creatingAccount') : t('createAccount')}
        </Button>
        <p className="text-sm text-center text-muted-foreground">
          {t('haveAccount')}{' '}
          <Link href="/login" className="underline hover:text-foreground">
            {t('signIn')}
          </Link>
        </p>
      </form>
    </div>
  );
}
