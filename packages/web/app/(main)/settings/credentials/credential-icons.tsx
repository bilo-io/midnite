import { Braces, KeyRound, Lock, Mail } from 'lucide-react';
import { GithubIcon, GoogleIcon, SlackIcon } from '@midnite/ui';
import type { WorkflowCredentialType } from '@midnite/shared';
import { cn } from '@/lib/utils';

/** Per-type glyph for a workflow credential — the real brand mark where one
 *  exists (GitHub, Google, Slack), a generic auth glyph otherwise. */
export function CredentialTypeIcon({ type, className }: { type: WorkflowCredentialType; className?: string }) {
  const cls = cn('h-4 w-4', className);
  switch (type) {
    case 'github':
      return <GithubIcon className={cls} />;
    case 'google-oauth':
      return <GoogleIcon className={cls} />;
    case 'slack':
    case 'slack-oauth':
      return <SlackIcon className={cls} />;
    case 'smtp':
      return <Mail className={cls} aria-hidden />;
    case 'http-basic':
      return <Lock className={cls} aria-hidden />;
    case 'http-header':
      return <Braces className={cls} aria-hidden />;
    case 'http-bearer':
      return <KeyRound className={cls} aria-hidden />;
    default:
      return <KeyRound className={cls} aria-hidden />;
  }
}
