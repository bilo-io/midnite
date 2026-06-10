'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Sparkles, UserRound } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useLocalStorage } from '@/lib/use-local-storage';
import { DEFAULT_PROFILE, PROFILE_STORAGE_KEY, type Profile } from '@/lib/app-settings';
import { cn } from '@/lib/utils';

export function ProfileView() {
  const [profile, setProfile, hydrated] = useLocalStorage<Profile>(
    PROFILE_STORAGE_KEY,
    DEFAULT_PROFILE,
  );
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Flash a "Saved" indicator briefly after any edit settles.
  useEffect(() => {
    if (!hydrated) return;
    setSaved(true);
    clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setSaved(false), 1500);
    return () => clearTimeout(savedTimer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- flash on content change only
  }, [profile.about, profile.guidelines]);

  return (
    <div className="container max-w-3xl space-y-6 py-2">
      <div
        className={cn(
          'flex items-center justify-end gap-1.5 text-xs text-muted-foreground transition-opacity',
          saved ? 'opacity-100' : 'opacity-0',
        )}
        aria-live="polite"
      >
        <Check className="h-3.5 w-3.5" />
        Saved
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserRound className="h-3.5 w-3.5" />
            About you
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Tell midnite who you are — your role, how you like to work, the kinds of things you
            build. Agents can use this for context.
          </p>
          <Textarea
            value={profile.about}
            onChange={(e) => setProfile((p) => ({ ...p, about: e.target.value }))}
            placeholder="e.g. I'm a backend engineer who cares about small, well-tested commits…"
            className="min-h-[120px] resize-y"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            Agent guidelines
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Guidance applied to every session, layered on top of each project&apos;s own
            guidelines. Good for standing preferences — tone, conventions, things to always or
            never do.
          </p>
          <Textarea
            value={profile.guidelines}
            onChange={(e) => setProfile((p) => ({ ...p, guidelines: e.target.value }))}
            placeholder="e.g. Prefer functional style. Always run the linter before finishing. Keep PRs focused…"
            className="min-h-[160px] resize-y"
          />
        </CardContent>
      </Card>
    </div>
  );
}
