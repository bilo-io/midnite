import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

import { GATEWAY_ORIGIN } from './config';
import { seedTask } from './helpers/gateway';

/**
 * Phase 49 E — Settings → Data restore flow. Seed a task, export a real archive
 * over the gateway, then drive the UI: choose the archive → dry-run preview
 * (version verdict + per-domain counts) → restore (merge) → result summary.
 */
test.describe('Settings → Data restore', () => {
  test('previews an uploaded archive, then restores it (merge)', async ({ page }) => {
    const token = `restore${Date.now()}`;
    await seedTask(`Restore probe ${token}`);

    // Export a real, current-schema archive straight from the gateway and stash
    // it on disk so the file input has something valid to upload.
    const res = await fetch(`${GATEWAY_ORIGIN}/portability/export`);
    expect(res.ok).toBeTruthy();
    const bytes = Buffer.from(await res.arrayBuffer());
    const dir = await mkdtemp(join(tmpdir(), 'midnite-e2e-'));
    const archivePath = join(dir, `${token}.zip`);
    await writeFile(archivePath, bytes);

    await page.goto('/settings/data');
    await expect(page.getByRole('heading', { name: 'Download a backup' })).toBeVisible();

    // Upload → auto preview. The hidden file input is addressable by its label.
    await page.getByLabel('Choose backup archive').setInputFiles(archivePath);

    // Preview surfaces the schema-version verdict + per-domain counts.
    await expect(page.getByText(/Preview — schema v\d+ \(ok\)/)).toBeVisible();

    // Merge is the default, so Restore is immediately actionable.
    const restore = page.getByRole('button', { name: /Restore \(merge\)/ });
    await expect(restore).toBeEnabled();
    await restore.click();

    // The atomic import resolves into a summary (merge skips the ids already present).
    await expect(page.getByText(/Restored \(merge\):/)).toBeVisible();
  });
});
