'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Forgot-password landing. Self-serve password reset isn't wired on the gateway
 * yet (no reset-token endpoint / mailer), so rather than fake a "link sent" flow
 * this page is honest: it points the user at their workspace admin and back to
 * sign in. When a reset endpoint lands, swap this for an email form + BFF POST.
 */
export default function ForgotPasswordPage() {
  return (
    <div className="w-full">
      <h1 className="mb-3 inline-block text-2xl font-semibold tracking-tight text-accent-gradient">
        Forgot password?
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">
        Self-serve password reset isn&rsquo;t available on this instance yet. Ask your workspace
        admin to reset your password, or sign in with Google/GitHub if your account is linked.
      </p>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to sign in
      </Link>
    </div>
  );
}
