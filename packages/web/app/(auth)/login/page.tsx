'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapse } from '@/components/ui/collapse';
import { FloatingLabelInput } from '@/components/auth/floating-label-input';
import { SsoButtons } from '@/components/auth/sso-buttons';
import { useAuth } from '@/contexts/auth-context';
import { ssoErrorMessage } from '@/lib/api';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ssoError, setSsoError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // The email/password form is tucked behind a "Continue with email" button.
  const [emailOpen, setEmailOpen] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // A failed SSO round-trip returns here with ?sso_error=<code> (Phase 70 C).
  // Read it off the URL (avoids a Suspense boundary under `output: 'export'`).
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('sso_error');
    setSsoError(ssoErrorMessage(code));
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
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      <h1 className="mb-6 inline-block text-2xl font-semibold tracking-tight text-accent-gradient">
        Sign in
      </h1>
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
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setEmailOpen(true)}
          aria-expanded={emailOpen}
          aria-controls="email-login-form"
        >
          <Mail className="mr-2 h-4 w-4" />
          Continue with email
        </Button>
      )}

      <Collapse open={emailOpen} id="email-login-form">
        <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-3 pt-1">
          <FloatingLabelInput
            ref={emailRef}
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <FloatingLabelInput
            id="password"
            label="Password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" disabled={pending} className="w-full">
            {pending ? 'Signing in…' : 'Sign in'}
          </Button>
          {/* Signup + forgot-password on either side, below the form. */}
          <div className="flex items-center justify-between pt-0.5 text-sm">
            <Link
              href="/register"
              className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Sign up
            </Link>
            <Link
              href="/forgot-password"
              className="text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </form>
      </Collapse>
    </div>
  );
}
