'use client';

import { forwardRef, useState, type CSSProperties, type InputHTMLAttributes } from 'react';
import { GradientGlow } from '@midnite/ui';
import { cn } from '@/lib/utils';

type FloatingLabelInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> & {
  /** The label text — floats to just above the field when focused or filled. */
  label: string;
};

/**
 * A text field with a floating label. At rest the label sits inside the field
 * like a placeholder; on focus or once the input holds a value it floats up to
 * sit *just outside* the field's top edge, so the input itself stays a compact
 * single-line height. On focus the field wears the app's signature rotating +
 * pulsating gradient border (`<GradientGlow>`, the same treatment the composers
 * use), driven by `:focus-within` — no per-instance state needed for the border.
 */
export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  function FloatingLabelInput({ label, id, value, onFocus, onBlur, className, ...rest }, ref) {
    const [focused, setFocused] = useState(false);
    const hasValue = value != null && String(value).length > 0;
    const floated = focused || hasValue;

    // Transform-only float (origin top-left) so the transition stays buttery: at
    // rest the label rides centred inside the field; floated, it lifts fully clear
    // of the top border and shrinks. `bg-background`/`px-1` keep it legible.
    const labelStyle: CSSProperties = {
      transform: floated ? 'translateY(-1.15rem) scale(0.82)' : 'translateY(0.55rem) scale(1)',
    };

    return (
      <div className="relative">
        <GradientGlow className="rounded-lg">
          <input
            ref={ref}
            id={id}
            value={value}
            placeholder=" "
            onFocus={(e) => {
              setFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            className={cn(
              // Solid theme background (not transparent) so the field reads as a
              // real surface over the card fill the gradient frame paints.
              'w-full rounded-lg bg-background px-3 py-2 text-sm text-foreground outline-none',
              className,
            )}
            {...rest}
          />
        </GradientGlow>
        <label
          htmlFor={id}
          style={labelStyle}
          className={cn(
            'pointer-events-none absolute left-2.5 top-0 z-10 origin-top-left px-1 text-sm transition-[transform,color] duration-200 ease-out',
            // Floated: a small `bg-background` pill so it reads cleanly above the
            // field. At rest it's a plain placeholder over the field interior.
            floated ? 'bg-background font-medium text-foreground' : 'text-muted-foreground',
          )}
        >
          {label}
        </label>
      </div>
    );
  },
);
