'use client';

import { useEffect, useState } from 'react';
import { Check, Download, Share } from 'lucide-react';

/**
 * The `beforeinstallprompt` event (Chromium) — not in the DOM lib types. We stash
 * it to drive our own "Install app" button instead of relying on the browser's
 * default mini-infobar.
 */
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

/** iOS exposes `navigator.standalone`; it isn't in the standard Navigator type. */
type IosNavigator = Navigator & { standalone?: boolean };

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const displayStandalone = window.matchMedia?.('(display-mode: standalone)').matches ?? false;
  return displayStandalone || (navigator as IosNavigator).standalone === true;
}

/**
 * "Add to home screen" affordance (Phase 24 Theme C). On Chromium it captures
 * `beforeinstallprompt` and offers an explicit Install button; on iOS Safari
 * (which never fires that event) it shows the manual Share → Add to Home Screen
 * steps. When already installed/running standalone it confirms instead. Lives in
 * Settings → Appearance; the actual install launches the responsive UI without
 * browser chrome.
 */
export function PwaInstall() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return undefined;
    }

    const onPrompt = (e: Event) => {
      // Suppress the default mini-infobar; we drive the prompt from our button.
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    // iOS Safari has no beforeinstallprompt — surface the manual steps instead.
    if (/iphone|ipad|ipod/i.test(navigator.userAgent || '')) setIsIos(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => undefined);
    // The prompt can only be used once; drop it whatever the choice.
    setDeferred(null);
  };

  if (installed) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="h-4 w-4 text-primary" />
        Installed — you’re running midnite as an app.
      </p>
    );
  }

  if (deferred) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={install}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Download className="h-4 w-4" />
          Install app
        </button>
        <p className="text-xs text-muted-foreground">
          Launches midnite in its own window. It still needs a live gateway connection — this is a
          fast shell, not an offline copy.
        </p>
      </div>
    );
  }

  if (isIos) {
    return (
      <p className="flex items-start gap-2 text-sm text-muted-foreground">
        <Share className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          To install: tap <span className="font-medium text-foreground">Share</span>, then{' '}
          <span className="font-medium text-foreground">Add to Home Screen</span>.
        </span>
      </p>
    );
  }

  return (
    <p className="text-sm text-muted-foreground">
      Your browser will offer <span className="font-medium text-foreground">Install</span> /{' '}
      <span className="font-medium text-foreground">Add to Home Screen</span> when this app is
      installable.
    </p>
  );
}
