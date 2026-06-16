'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import type { ProviderOption } from '@/lib/use-media-models';
import { ProviderIcon } from './provider-icon';
import { cn } from '@/lib/utils';

type Props = {
  providers: ProviderOption[];
  value: string;
  onChange: (provider: string) => void;
  size?: 'sm' | 'default';
  className?: string;
};

export function ProviderSelect({ providers, value, onChange, size = 'default', className }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = providers.find((p) => p.provider === value) ?? providers[0]!;
  const iconSize = size === 'sm' ? 13 : 14;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          'flex w-full items-center gap-2 rounded-md border border-border/60 bg-transparent text-left transition-colors',
          'hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
          size === 'sm' ? 'px-2 py-1 text-xs' : 'px-2.5 py-1.5 text-sm',
        )}
      >
        <ProviderIcon provider={current.provider} size={iconSize} />
        <span className="flex-1 truncate">{current.label}</span>
        <ChevronDown
          className={cn(
            'shrink-0 text-muted-foreground transition-transform duration-150',
            size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="Provider"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-auto rounded-md border border-border bg-card shadow-md"
        >
          {providers.map((p) => {
            const selected = p.provider === value;
            return (
              <li key={p.provider} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => { onChange(p.provider); setOpen(false); }}
                  className={cn(
                    'flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-accent',
                    size === 'sm' ? 'text-xs' : 'text-sm',
                    selected && 'bg-accent/50',
                  )}
                >
                  <ProviderIcon provider={p.provider} size={iconSize} />
                  <span className="flex-1 truncate">{p.label}</span>
                  {selected && (
                    <Check
                      className={cn(
                        'shrink-0 text-foreground',
                        size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5',
                      )}
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
