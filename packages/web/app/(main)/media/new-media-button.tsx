'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { MediaTypePickerModal } from '@/components/media-type-picker-modal';
import { Button } from '@/components/ui/button';

export function NewMediaButton({ variant = 'default' }: { variant?: 'default' | 'large' }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === 'large' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group mt-1 inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-sm transition-all hover:shadow-md hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <Plus className="h-4 w-4 transition-transform duration-200 group-hover:rotate-90" />
          New media
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          New media
        </Button>
      )}
      {open && <MediaTypePickerModal onClose={() => setOpen(false)} />}
    </>
  );
}
