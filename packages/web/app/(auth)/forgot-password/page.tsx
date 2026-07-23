'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

/**
 * Forgot-password landing. Self-serve password reset isn't wired on the gateway
 * yet (no reset-token endpoint / mailer), so rather than fake a "link sent" flow
 * this page is honest: it points the user at their workspace admin and back to
 * sign in. When a reset endpoint lands, swap this for an email form + BFF POST.
 */
export default function ForgotPasswordPage() {
  const t = useTranslations('auth');
  return (
    <div className="w-full">
      <h1 className="mb-3 inline-block text-2xl font-semibold tracking-tight text-accent-gradient">
        {t('forgot.title')}
      </h1>
      <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{t('forgot.body')}</p>
      <Link
        href="/login"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 transition-colors hover:text-foreground hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        {t('backToSignIn')}
      </Link>
    </div>
  );
}
