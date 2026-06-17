import type { Platform } from './downloads';

/**
 * Best-effort OS detection. Prefers UA Client Hints (`navigator.userAgentData.platform`,
 * Chromium) and falls back to the user-agent string. Returns null when undetectable.
 * Pure (takes its inputs) so it can be unit/Playwright-verified without a browser.
 */
export function detectPlatform(ua: string, uaPlatform?: string): Platform | null {
  const hint = (uaPlatform ?? '').toLowerCase();
  if (hint) {
    if (hint.includes('mac')) return 'mac';
    if (hint.includes('win')) return 'windows';
    if (hint.includes('linux') || hint.includes('chrome os')) return 'linux';
  }
  if (/mac/i.test(ua)) return 'mac';
  if (/win/i.test(ua)) return 'windows';
  if (/linux|x11|android|cros/i.test(ua)) return 'linux';
  return null;
}
