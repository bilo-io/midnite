'use client';

import { forwardRef, useState, type CSSProperties, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

type FloatingLabelInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'placeholder'> & {
  /** The label text — floats to a smaller position when focused or filled. */
  label: string;
};

/**
 * A text field with a floating label: the label sits inside the field like a
 * value, then transitions up + shrinks once the input is focused or holds a
 * value. On focus the 1.5px frame paints the active primary/accent gradient (the
 * same gradient the buttons use); at rest it's a subtle border.
 */
export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  function FloatingLabelInput({ label, id, value, onFocus, onBlur, className, ...rest }, ref) {
    const [focused, setFocused] = useState(false);
    const hasValue = value != null && String(value).length > 0;
    const floated = focused || hasValue;

    // The frame's 1.5px padding shows as the field border: a muted line at rest,
    // the accent gradient while focused (falls back to the solid primary when no
    // gradient accent is set).
    const frameStyle: CSSProperties = focused
      ? {
          backgroundColor: 'transparent',
          backgroundImage:
            'var(--accent-gradient, linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--primary)) 100%))',
        }
      : { backgroundColor: 'hsl(var(--border))' };

    return (
      <div className="rounded-lg p-[1.5px] transition-colors duration-200" style={frameStyle}>
        <div className="relative rounded-[calc(0.5rem-1.5px)] bg-background">
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
              'w-full rounded-[inherit] bg-transparent px-3 pb-1.5 pt-5 text-sm text-foreground outline-none',
              className,
            )}
            {...rest}
          />
          <label
            htmlFor={id}
            className={cn(
              'pointer-events-none absolute left-3 origin-left transition-all duration-150 ease-out',
              floated
                ? 'top-1.5 text-[11px] font-medium text-muted-foreground'
                : 'top-1/2 -translate-y-1/2 text-sm text-muted-foreground',
            )}
          >
            {label}
          </label>
        </div>
      </div>
    );
  },
);
