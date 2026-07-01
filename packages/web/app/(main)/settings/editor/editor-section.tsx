'use client';

import { Save } from 'lucide-react';
import { Accordion } from '@/components/ui/accordion';
import { useLocalStorage } from '@/lib/use-local-storage';
import {
  DEFAULT_SETTINGS,
  EDITOR_AUTOSAVE_OPTIONS,
  SETTINGS_STORAGE_KEY,
  type AppSettings,
} from '@/lib/app-settings';
import { cn } from '@/lib/utils';

/**
 * Settings → Editor. Device-local editor preferences (never synced). Today it
 * holds the autosave interval shared by editors like the Slides deck editor.
 */
export function EditorSection() {
  const [settings, setSettings] = useLocalStorage<AppSettings>(
    SETTINGS_STORAGE_KEY,
    DEFAULT_SETTINGS,
  );
  const value = settings.editorAutosaveSeconds ?? DEFAULT_SETTINGS.editorAutosaveSeconds;
  const setValue = (seconds: number) =>
    setSettings((prev) => ({ ...prev, editorAutosaveSeconds: seconds }));

  return (
    <div className="space-y-4">
      <Accordion title="Autosave" icon={<Save className="h-3.5 w-3.5" />} defaultOpen>
        <div className="space-y-3 p-5">
          <p className="text-sm text-muted-foreground">
            How often editors save your work automatically. The Save button always stays available
            and is enabled only when there are unsaved changes. Choose <strong>Off</strong> to save
            manually.
          </p>
          <div
            role="radiogroup"
            aria-label="Autosave interval"
            className="inline-flex flex-wrap items-center gap-1 rounded-md border border-border/60 bg-card/40 p-0.5"
          >
            {EDITOR_AUTOSAVE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={value === opt.value}
                onClick={() => setValue(opt.value)}
                className={cn(
                  'rounded px-3 py-1.5 text-sm transition-colors',
                  value === opt.value
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Accordion>
    </div>
  );
}
