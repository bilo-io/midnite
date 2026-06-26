'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Moon,
  PlusCircle,
  Sun,
} from 'lucide-react';
import { THEME_STORAGE_KEY } from '@midnite/ui/theme';
import { useGlobalKeymap } from '@/hooks/use-global-keymap';
import { useRegisterPaletteCommands } from '@/lib/palette-commands';

function toggleTheme() {
  const isDark = document.documentElement.classList.contains('dark');
  const next = isDark ? 'light' : 'dark';
  document.documentElement.classList.toggle('dark', !isDark);
  document.documentElement.style.colorScheme = next;
  try { localStorage.setItem(THEME_STORAGE_KEY, next); } catch { /* ignore */ }
}

/**
 * Thin client component that mounts the global keyboard shortcut map and
 * registers the static global palette commands. Rendered once in the (main)
 * layout — inside `PaletteCommandsProvider`.
 */
export function GlobalKeymap() {
  const router = useRouter();

  useGlobalKeymap({
    goHome: () => router.push('/'),
    goBoard: () => router.push('/'),
    goOffice: () => router.push('/office'),
    goSettings: () => router.push('/settings'),
    newTask: () => window.dispatchEvent(new CustomEvent('midnite:new-task')),
    openHelp: () => window.dispatchEvent(new CustomEvent('midnite:open-help')),
  });

  // Register global palette commands that are always available.
  useRegisterPaletteCommands('global', [
    {
      id: 'global:new-task',
      label: 'Create task…',
      Icon: PlusCircle,
      keywords: ['add', 'create', 'new', 'task'],
      action: () => window.dispatchEvent(new CustomEvent('midnite:new-task')),
    },
    {
      id: 'global:toggle-theme',
      label: 'Toggle light / dark theme',
      Icon: Sun,
      keywords: ['dark', 'light', 'theme', 'mode', 'color'],
      action: toggleTheme,
    },
    {
      id: 'global:lock-screen',
      label: 'Lock screen',
      Icon: Lock,
      keywords: ['lock', 'screen', 'screensaver'],
      action: () => window.dispatchEvent(new CustomEvent('midnite:lock-screen')),
    },
    {
      id: 'global:go-home',
      label: 'Go to Home',
      keywords: ['home', 'dashboard', 'board'],
      action: () => router.push('/'),
    },
    {
      id: 'global:go-office',
      label: 'Go to Office',
      keywords: ['office', 'agents', 'room'],
      action: () => router.push('/office'),
    },
    {
      id: 'global:go-settings',
      label: 'Go to Settings',
      keywords: ['settings', 'preferences', 'config'],
      action: () => router.push('/settings'),
    },
  ]);

  return null;
}
