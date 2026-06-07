'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Lock, X } from 'lucide-react';
import { PASSCODE_LENGTH } from '@/lib/app-settings';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A row of single-character inputs for one passcode. Typing a digit advances to
 * the next field; backspace walks back and clears. The value is fully driven by
 * the `value` prop (digit keys are intercepted), so the parent owns the truth
 * and can reset it between steps.
 */
function PasscodeFields({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
  autoFocus = true,
}: {
  value: string;
  onChange: (next: string) => void;
  onComplete?: (code: string) => void;
  invalid?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const slots = Array.from({ length: PASSCODE_LENGTH }, (_, i) => value[i] ?? '');

  // Park focus on the next empty slot — including after the parent resets the
  // value (wrong code, or moving from "enter" to "confirm").
  useEffect(() => {
    if (autoFocus) refs.current[Math.min(value.length, PASSCODE_LENGTH - 1)]?.focus();
  }, [autoFocus, value]);

  const commit = (next: string) => {
    onChange(next);
    if (next.length === PASSCODE_LENGTH) onComplete?.(next);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, i: number) => {
    if (disabled) return;
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (value.length > 0) commit(value.slice(0, -1));
      return;
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      refs.current[Math.max(0, i - 1)]?.focus();
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      refs.current[Math.min(PASSCODE_LENGTH - 1, i + 1)]?.focus();
      return;
    }
    if (/^\d$/.test(e.key)) {
      e.preventDefault();
      if (value.length < PASSCODE_LENGTH) commit(value + e.key);
    }
  };

  // Fallback for input methods that don't surface digit keydowns (e.g. some
  // mobile keyboards); the keydown handler intercepts on desktop so this won't
  // double-fire there.
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const digits = e.target.value.replace(/\D/g, '');
    if (!digits) return;
    commit((value + digits).slice(0, PASSCODE_LENGTH));
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, PASSCODE_LENGTH);
    if (digits) commit(digits);
  };

  return (
    <div className="flex items-center justify-center gap-2.5">
      {slots.map((char, i) => (
        <input
          key={i}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={1}
          value={char}
          disabled={disabled}
          aria-label={`Passcode digit ${i + 1}`}
          onChange={handleChange}
          onKeyDown={(e) => handleKeyDown(e, i)}
          onPaste={handlePaste}
          className={cn(
            'h-12 w-11 rounded-lg border bg-background/80 text-center text-2xl font-semibold tabular-nums text-foreground caret-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            invalid ? 'border-destructive' : char ? 'border-foreground/60' : 'border-input',
          )}
        />
      ))}
    </div>
  );
}

type PasscodePadProps = {
  /** `set` confirms a fresh passcode twice; `unlock` checks against `expected`. */
  mode: 'set' | 'unlock';
  /** The passcode to match in `unlock` mode. */
  expected?: string;
  /** Called with the (now-confirmed) code on success. */
  onSuccess: (code: string) => void;
  /** When provided, a Cancel control is shown. */
  onCancel?: () => void;
  autoFocus?: boolean;
};

/**
 * The passcode entry flow. In `set` mode it walks enter → confirm and only
 * resolves once the two match; in `unlock` mode it checks each attempt against
 * `expected`. Purely presentational chrome lives in the caller.
 */
export function PasscodePad({ mode, expected, onSuccess, onCancel, autoFocus = true }: PasscodePadProps) {
  const [phase, setPhase] = useState<'enter' | 'confirm'>('enter');
  const [first, setFirst] = useState('');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const reject = (message: string) => {
    setError(message);
    setShake(true);
    setValue('');
  };

  const handleComplete = (code: string) => {
    if (mode === 'unlock') {
      if (code === expected) onSuccess(code);
      else reject('Incorrect passcode.');
      return;
    }
    // mode === 'set'
    if (phase === 'enter') {
      setFirst(code);
      setValue('');
      setError(null);
      setPhase('confirm');
      return;
    }
    if (code === first) {
      onSuccess(code);
    } else {
      setFirst('');
      setPhase('enter');
      reject("Those didn't match. Try again.");
    }
  };

  const title =
    mode === 'unlock' ? 'Enter passcode' : phase === 'enter' ? 'Set a passcode' : 'Confirm passcode';
  const subtitle =
    mode === 'unlock'
      ? 'Enter your passcode to unlock.'
      : phase === 'enter'
        ? `Choose a ${PASSCODE_LENGTH}-digit passcode.`
        : 'Enter it again to confirm.';

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-border/60 bg-card/60">
        <Lock className="h-5 w-5 text-foreground/80" />
      </div>

      <div className="space-y-1 text-center">
        <h2 className="text-base font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div
        className={cn(shake && 'animate-shake')}
        onAnimationEnd={() => setShake(false)}
      >
        {/* Remount per phase so focus + state reset cleanly between enter/confirm. */}
        <PasscodeFields
          key={phase}
          value={value}
          onChange={(next) => {
            setValue(next);
            if (error) setError(null);
          }}
          onComplete={handleComplete}
          invalid={!!error}
          autoFocus={autoFocus}
        />
      </div>

      <p
        role="alert"
        className={cn(
          'min-h-[1rem] text-xs text-destructive transition-opacity',
          error ? 'opacity-100' : 'opacity-0',
        )}
      >
        {error ?? ' '}
      </p>

      {onCancel ? (
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Shared modal chrome for the passcode flows: a dimmed overlay, a centered card,
 * and the usual ways out (the X, an overlay click, or Escape).
 */
function PasscodeDialog({
  label,
  onCancel,
  children,
}: {
  label: string;
  onCancel: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  return (
    <>
      <div
        className="fixed inset-0 z-[110] bg-background/40 backdrop-blur-md"
        // Stop the click bubbling: the screensaver behind treats a click as
        // "start unlocking" and would otherwise re-open this the instant it closes.
        onClick={(e) => {
          e.stopPropagation();
          onCancel();
        }}
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-0 z-[110] flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={label}
          className="pointer-events-auto w-full max-w-sm rounded-xl border border-border bg-card shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <header className="flex items-center justify-end px-3 pt-3">
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </header>
          <div className="px-6 pb-7 pt-1">{children}</div>
        </div>
      </div>
    </>
  );
}

/**
 * The first-run modal shown when the lock button is pressed but no passcode has
 * been set yet. Resolves with the confirmed code.
 */
export function PasscodeSetupDialog({
  onComplete,
  onCancel,
}: {
  onComplete: (code: string) => void;
  onCancel: () => void;
}) {
  return (
    <PasscodeDialog label="Set screensaver passcode" onCancel={onCancel}>
      <PasscodePad mode="set" onSuccess={onComplete} />
    </PasscodeDialog>
  );
}

/**
 * The unlock prompt, surfaced over a locked screensaver only once the user makes
 * a wake gesture. `onUnlock` fires on the correct code; `onCancel` dismisses the
 * prompt and leaves the screensaver locked.
 */
export function PasscodeUnlockDialog({
  expected,
  onUnlock,
  onCancel,
}: {
  expected: string;
  onUnlock: () => void;
  onCancel: () => void;
}) {
  return (
    <PasscodeDialog label="Enter passcode to unlock" onCancel={onCancel}>
      <PasscodePad mode="unlock" expected={expected} onSuccess={onUnlock} />
    </PasscodeDialog>
  );
}
