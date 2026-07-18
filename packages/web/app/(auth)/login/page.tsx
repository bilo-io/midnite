'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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

  // A failed SSO round-trip returns here with ?sso_error=<code> (Phase 70 C).
  // Read it off the URL (avoids a Suspense boundary under `output: 'export'`).
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('sso_error');
    setSsoError(ssoErrorMessage(code));
  }, []);

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

  const registrationOpen = process.env.NEXT_PUBLIC_REGISTRATION_OPEN === 'true';

  return (
    <div className="w-full">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">Sign in</h1>
      {ssoError && (
        <p role="alert" className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-500">
          {ssoError}
        </p>
      )}
      <div className="mb-4">
        <SsoButtons redirect="/" />
      </div>
      <form onSubmit={(e) => void handleSubmit(e)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Email
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Password
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">
          {pending ? 'Signing in…' : 'Sign in'}
        </Button>
        {registrationOpen && (
          <p className="text-sm text-center text-muted-foreground">
            No account?{' '}
            <Link href="/register" className="underline hover:text-foreground">
              Register
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
