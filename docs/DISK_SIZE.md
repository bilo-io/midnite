# Understanding Disk Size

The midnite repo can appear much larger on disk than it actually is. Three independent sources inflate the reported number; each is explained below.

---

## 1. `.next/cache/` — build cache

Running `moon run web:build` or `moon run web:dev` populates `packages/web/.next/cache/` with SWC/webpack compilation artefacts. This cache can grow to 1–2 GB and is the single biggest contributor to a freshly-measured "repo size".

**What it is:** transpiler caches that speed up subsequent builds. They are safe to delete at any time.

**How to reclaim the space:**
```bash
moon run web:clean   # removes .next/ and out/
```
The next build regenerates the cache. The `.next/` directory is already in `.gitignore` — it is never committed.

**What users actually download:** the static chunks in `.next/static/` (a few MB, not GB). The cache directory is a local-only concern.

---

## 2. pnpm hardlinks

pnpm stores every package exactly once in `~/.pnpm-store` (the global content-addressable store) and creates **hardlinks** into each `node_modules`. A hardlink is not a copy — it points to the same inode on disk as the original file.

**The illusion:** `du`, Finder, and macOS Spotlight count each hardlink as the full file size of the target. A package used across three worktrees appears three times in `du` output, even though only one copy of the bytes exists on disk.

**Actual unique bytes:** run `pnpm store status` to see the real store footprint. A typical frontend project uses 200–500 MB of unique package bytes; the apparent `node_modules` size can be 5–10× higher because of hardlinks.

**Maintenance:**
```bash
pnpm store prune   # remove packages no longer referenced by any project
```

---

## 3. APFS local snapshots (macOS)

macOS Time Machine creates local APFS snapshots **hourly**, even on machines that are not connected to a Time Machine backup disk. These snapshots are stored on the same volume as your files.

**The illusion:** System Preferences → Storage (and `diskutil apfs list`) accounts for these snapshots in the "used" figure, making it appear that 2 GB of code has consumed 30–80 GB. Running `du -sh ~/Dev/midnite` reports the live tree (≈ correct); opening "About This Mac → Storage" or "System Information" includes the snapshots.

**How to verify:**
```bash
tmutil listlocalsnapshots /   # list snapshots on the boot volume
```

**How to reclaim:**
```bash
sudo tmutil deletelocalsnapshots /   # delete all local snapshots for /
```
macOS re-creates snapshots automatically; this is a safe operation. Snapshots are also automatically pruned when disk space is low.

---

## Quick reference

| Source | Apparent size | Real cost | Fix |
|--------|--------------|-----------|-----|
| `.next/cache/` | 1–2 GB | 1–2 GB (safe to delete) | `moon run web:clean` |
| pnpm hardlinks | 5–10× `node_modules` | 1× (shared store) | `pnpm store prune` |
| APFS snapshots | 20–80 GB (Storage app only) | 0 GB extra unique bytes | `sudo tmutil deletelocalsnapshots /` |
