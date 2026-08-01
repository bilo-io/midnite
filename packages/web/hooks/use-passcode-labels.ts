'use client';

import { useTranslations } from 'next-intl';

import { PASSCODE_LENGTH, type PasscodePadLabels } from '@midnite/ui';

/**
 * Translated copy for the `@midnite/ui` passcode dialogs (Phase 82 Theme E).
 * The ui primitives default to English; app call sites pass these instead.
 */
export function usePasscodeDialogLabels(): {
  /** Accessible name of the set-a-passcode dialog. */
  setupLabel: string;
  /** Accessible name of the unlock dialog. */
  unlockLabel: string;
  /** Accessible name of the dialog's X control. */
  closeLabel: string;
  /** Copy for the embedded `PasscodePad`. */
  labels: PasscodePadLabels;
} {
  const t = useTranslations('common');
  return {
    setupLabel: t('ui.passcode.setupDialogLabel'),
    unlockLabel: t('ui.passcode.unlockDialogLabel'),
    closeLabel: t('close'),
    labels: {
      unlockTitle: t('ui.passcode.unlockTitle'),
      setTitle: t('ui.passcode.setTitle'),
      confirmTitle: t('ui.passcode.confirmTitle'),
      unlockSubtitle: t('ui.passcode.unlockSubtitle'),
      chooseSubtitle: t('ui.passcode.chooseSubtitle', { length: PASSCODE_LENGTH }),
      confirmSubtitle: t('ui.passcode.confirmSubtitle'),
      incorrect: t('ui.passcode.incorrect'),
      mismatch: t('ui.passcode.mismatch'),
      cancel: t('cancel'),
      digitAriaLabel: (index) => t('ui.passcode.digitAria', { index }),
    },
  };
}
