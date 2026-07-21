'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { FloatingLabelInput } from '@/components/auth/floating-label-input';
import { LastUsedTag, SsoButtons } from '@/components/auth/sso-buttons';
import { useAuth } from '@/contexts/auth-context';
import { ssoErrorMessage } from '@/lib/api';
import { readLastLoginMethod, writeLastLoginMethod } from '@/lib/last-login-method';
import { docsChangelogUrl } from '@midnite/shared';
import { cn } from '@/lib/utils';
import { getCurrentVersion } from '@/lib/version';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const t = useTranslations('auth');
  const tNav = useTranslations('nav');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // The email/password form is tucked behind a "Continue with email" button.
  const [emailOpen, setEmailOpen] = useState(false);
  // Last-used highlight for the email trigger (SSO buttons handle their own).
  const [emailLastUsed, setEmailLastUsed] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // A failed SSO round-trip returns here with ?sso_error=<code> (Phase 70 C).
  // Read it off the URL (avoids a Suspense boundary under `output: 'export'`).
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('sso_error');
    setSsoError(ssoErrorMessage(code));
    setEmailLastUsed(readLastLoginMethod() === 'email');
  }, []);

  // Move focus into the form the moment it expands.
  useEffect(() => {
    if (emailOpen) emailRef.current?.focus();
  }, [emailOpen]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      await login(email, password);
      writeLastLoginMethod('email');
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold tracking-tight text-accent-gradient">{t('signIn')}</h1>
        <a
          href={docsChangelogUrl(getCurrentVersion())}
          target="_blank"
          rel="noopener noreferrer"
          title={tNav('footer.changelog')}
          className="cursor-pointer rounded-full border border-border/60 bg-muted/50 px-1.5 py-0.5 text-[10px] font-medium leading-none text-muted-foreground transition-colors hover:border-border hover:text-foreground"
        >
          {`v${getCurrentVersion()}`}
        </a>
      </div>
      {ssoError && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500"
        >
          {ssoError}
        </p>
      )}
      <div className="mb-3">
        <SsoButtons redirect="/" />
      </div>

      {!emailOpen && (
        // The trigger wears the *active brand accent* gradient as its border
        // (SSO buttons wear their provider palettes), lit with a halo when
        // email was the last-used sign-in method.
        <div
          className={cn(
            'accent-gradient-border rounded-lg',
            emailLastUsed && 'accent-gradient-border--lit',
          )}
        >
          <Button
            type="button"
            variant="ghost"
            className="relative h-11 w-full rounded-lg bg-background hover:bg-muted/60 hover:text-foreground"
            onClick={() => setEmailOpen(true)}
            aria-expanded={emailOpen}
            aria-controls="email-login-form"
          >
            <Mail className="mr-2 h-4 w-4" />
            {t('continueWithEmail')}
            {emailLastUsed && <LastUsedTag />}
          </Button>
        </div>
      )}

      {/* `bleed` releases the clip once open so the fields' gradient glow halo
          isn't cut off at the collapse edges. */}
      <Collapse open={emailOpen} bleed id="email-login-form">
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-5 pt-3">
          <FloatingLabelInput
            ref={emailRef}
            id="email"
            label={t('email')}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FloatingLabelInput
            id="password"
            label={t('password')}
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? t('signingIn') : t('signIn')}
          </Button>
          {/* Signup + forgot-password on either side, below the form. */}
          <div className="flex items-center justify-between pt-0.5 text-sm">
            <Link
              href="/register"
              className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              {t('signUp')}
            </Link>
            <Link
              href="/forgot-password"
              className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              {t('forgotPassword')}
            </Link>
          </div>
        </form>
      </Collapse>
    </div>
  );
}
