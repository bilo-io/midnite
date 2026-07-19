'use client';

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { Bug, Copy, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useTheme } from '@/app/theme/theme-context';
import { useConnectionStore, worstStatus } from '@/lib/connection-store';
import { getDesktopBridge } from '@/lib/desktop-bridge';
import {
  buildReportContext,
  stripEnvironment,
  type ReportContextInput,
} from '@/lib/report-context';
import { MAX_ISSUE_URL_LENGTH, githubIssuesNewUrl } from '@/lib/site-links';
import { getCurrentVersion } from '@/lib/version';
import { cn } from '@/lib/utils';

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Phase 74 Theme B — the "here's what we'll send, edit anything, then open
 * GitHub" step. Mirrors {@link ConfirmDialog}'s hand-rolled modal (role/dialog,
 * backdrop, focus-trap, Escape) but portals to `document.body` (it launches from
 * the already-portaled assistant panel — {@link AssistantFab} owns the portal).
 *
 * The body is prefilled from {@link buildReportContext} and stays fully
 * editable: nothing leaves the app until the user clicks "Open on GitHub" (which
 * opens a *public* issue). A URL-length guard auto-trims the auto-captured
 * environment block when oversized, warns, and offers a Copy-body fallback.
 */
export function ReportIssueDialog({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const { preference, resolved } = useTheme();
  const connection = useConnectionStore((s) => worstStatus(s.statuses));

  // Sample the live context once, on mount. The dialog only renders while open,
  // so this initializer captures the page the user was on at launch.
  const initial = React.useMemo(() => {
    const input: ReportContextInput = {
      pathname,
      version: getCurrentVersion(),
      isDesktop: getDesktopBridge() !== null,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      viewport:
        typeof window !== 'undefined'
          ? { width: window.innerWidth, height: window.innerHeight }
          : null,
      theme: { preference, resolved },
      connection,
    };
    const ctx = buildReportContext(input);
    const full = githubIssuesNewUrl({ title: ctx.title, body: ctx.body });
    // Auto-trim the machine-generated environment block if the full URL is
    // oversized — never the user's (empty at this point) freeform text.
    if (full.length > MAX_ISSUE_URL_LENGTH) {
      return { title: ctx.title, body: stripEnvironment(ctx.body), autoTrimmed: true };
    }
    return { title: ctx.title, body: ctx.body, autoTrimmed: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sample once at mount
  }, []);

  const [title, setTitle] = React.useState(initial.title);
  const [body, setBody] = React.useState(initial.body);
  const [copied, setCopied] = React.useState(false);

  const url = githubIssuesNewUrl({ title, body });
  const overflow = url.length > MAX_ISSUE_URL_LENGTH;

  // The URL actually opened stays within GitHub's budget even when the editable
  // body doesn't: strip the machine env block first, then hard-truncate the text
  // (binary search on length) with a marker. The hand-off therefore always works
  // — the warning + Copy-body carry the full text for the user to paste in.
  const outboundUrl = React.useMemo(() => {
    if (!overflow) return url;
    const fits = (b: string) =>
      githubIssuesNewUrl({ title, body: b }).length <= MAX_ISSUE_URL_LENGTH;
    const stripped = stripEnvironment(body);
    if (fits(stripped)) return githubIssuesNewUrl({ title, body: stripped });
    const marker = '\n\n_(truncated — use “Copy body” for the full report)_';
    let lo = 0;
    let hi = stripped.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      if (fits(stripped.slice(0, mid) + marker)) lo = mid;
      else hi = mid - 1;
    }
    return githubIssuesNewUrl({ title, body: stripped.slice(0, lo) + marker });
  }, [overflow, url, title, body]);

  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    // Put the caret at the end of the seeded title so the user finishes the line.
    const len = titleRef.current?.value.length ?? 0;
    titleRef.current?.setSelectionRange(len, len);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopImmediatePropagation();
        onClose();
      } else if (e.key === 'Tab') {
        const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
        if (!focusables || focusables.length === 0) return;
        const first = focusables[0]!;
        const last = focusables[focusables.length - 1]!;
        const activeEl = document.activeElement;
        if (e.shiftKey && activeEl === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && activeEl === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('keydown', onKey, true);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  const openOnGitHub = () => {
    window.open(outboundUrl, '_blank', 'noopener,noreferrer');
    onClose();
  };

  const copyBody = async () => {
    try {
      await navigator.clipboard.writeText(body);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied (permissions / insecure context) — leave the body in
      // the textarea for a manual copy; no throw, the fallback is non-critical.
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/40 backdrop-blur-md"
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Report an issue"
        className="animate-dialog-in relative flex w-full max-w-lg flex-col rounded-xl border border-border bg-card p-5 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bug className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-snug">Report an issue</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              This opens a <strong>public</strong> issue on GitHub. Everything below is
              editable — trim anything you'd rather not share before you open it.
            </p>
          </div>
        </div>

        <label className="mt-4 block text-xs font-medium text-muted-foreground" htmlFor="report-title">
          Title
        </label>
        <input
          ref={titleRef}
          id="report-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />

        <label className="mt-3 block text-xs font-medium text-muted-foreground" htmlFor="report-body">
          Details
        </label>
        <Textarea
          id="report-body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={12}
          className="mt-1 max-h-[45vh] min-h-[12rem] w-full resize-y font-mono text-xs"
        />

        {(overflow || initial.autoTrimmed) && (
          <p
            role="alert"
            className={cn(
              'mt-2 rounded-md px-3 py-2 text-xs',
              overflow
                ? 'bg-destructive/10 text-destructive'
                : 'bg-muted text-muted-foreground',
            )}
          >
            {overflow
              ? "This report is too long for a GitHub link — it'll open trimmed. Use “Copy body” to grab the full text and paste it into the issue."
              : 'The captured environment details were trimmed to fit GitHub’s URL limit.'}
          </p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={copyBody}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {copied ? 'Copied' : 'Copy body'}
          </Button>
          <div className="flex-1" />
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" size="sm" onClick={openOnGitHub}>
            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
            Open on GitHub
          </Button>
        </div>
      </div>
    </div>
  );
}
