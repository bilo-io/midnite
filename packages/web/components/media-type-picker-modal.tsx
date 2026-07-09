'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { type LucideIcon, ImageIcon, Music2, Video } from 'lucide-react';
import type { MediaType } from '@midnite/shared';
import { cn } from '@/lib/utils';

type Props = {
  onClose: () => void;
};

// `LucideIcon`, not `React.ElementType` — the latter maps over `keyof
// JSX.IntrinsicElements`, which @react-three/fiber (Phase 63) bloats with
// hundreds of three.js elements, collapsing the mapped type to `never`.
const OPTIONS: { type: MediaType; label: string; description: string; Icon: LucideIcon }[] = [
  { type: 'image', label: 'Image', description: 'Generate or upload a still image', Icon: ImageIcon },
  { type: 'video', label: 'Video', description: 'Generate or upload a video clip', Icon: Video },
  { type: 'audio', label: 'Audio', description: 'Generate or upload an audio file', Icon: Music2 },
];

export function MediaTypePickerModal({ onClose }: Props) {
  const router = useRouter();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const pick = (type: MediaType) => {
    router.push(`/media/new?type=${type}`);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/40 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Choose media type"
      >
        <h2 className="mb-4 text-base font-semibold">What type of media?</h2>
        <div className="flex flex-col gap-2">
          {OPTIONS.map(({ type, label, description, Icon }) => (
            <button
              key={type}
              type="button"
              onClick={() => pick(type)}
              className={cn(
                'flex items-center gap-3.5 rounded-lg border border-border/60 px-4 py-3 text-left transition-colors',
                'hover:border-border hover:bg-accent',
              )}
            >
              <Icon className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <span>
                <span className="block text-sm font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">{description}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
