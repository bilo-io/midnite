import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  compareSchemaVersion,
  isImportable,
  type ImportOptions,
  type ImportPreview,
  type ImportResult,
} from '@midnite/shared';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { getSchemaVersion } from '../db/schema-version';
import { SearchService } from '../search/search.service';
import { unpackArchive } from './lib/archive';
import { getTableColumns } from 'drizzle-orm';
import { buildRow, IMPORT_DOMAINS, type ChildSpec, type DomainSpec } from './lib/import-mappers';

type Obj = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reading the id column off any parent table
type Tx = any;

/**
 * Phase 49 C — atomic import. Reads an export archive (via {@link unpackArchive},
 * which validates the manifest + per-domain envelopes), gates on schema version,
 * and restores **all-or-nothing** in a single transaction: `replace` wipes the
 * imported tables then inserts; `merge` inserts only ids not already present.
 * Rows are written via the generic de-hydration mappers in dependency order.
 * After commit, the (derived, not-carried) search index is rebuilt in-process,
 * fail-open. Users/teams/auth + volatile tables are never touched.
 */
@Injectable()
export class PortabilityImportService {
  private readonly logger = new Logger(PortabilityImportService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: MidniteDb,
    // Optional so unit specs need no stub; absent ⇒ reindex is skipped (fail-open).
    @Optional() @Inject(SearchService) private readonly search?: SearchService,
  ) {}

  /** Dry-run: per-domain counts, id conflicts against the target, version verdict. No writes. */
  preview(buf: Buffer): ImportPreview {
    const { manifest, domains } = this.unpack(buf);
    const compat = compareSchemaVersion(manifest.schemaVersion, this.currentVersion());
    const domainCounts: Record<string, number> = {};
    const conflicts: Record<string, string[]> = {};
    const byName = new Map(domains.map((d) => [d.domain, d.records as Obj[]]));

    for (const spec of IMPORT_DOMAINS) {
      const records = byName.get(spec.name);
      if (!records) continue;
      domainCounts[spec.name] = records.length;
      const existing = this.existingIds(this.db, spec);
      const clash = records.map((r) => String(r['id'])).filter((id) => existing.has(id));
      if (clash.length > 0) conflicts[spec.name] = clash;
    }

    return { manifest, domainCounts, conflicts, compat, importable: isImportable(compat) };
  }

  /** Restore the archive. Throws BadRequest on a malformed or too-new archive. */
  restore(buf: Buffer, options: ImportOptions): ImportResult {
    const { manifest, domains } = this.unpack(buf);
    const compat = compareSchemaVersion(manifest.schemaVersion, this.currentVersion());
    if (!isImportable(compat)) {
      throw new BadRequestException(
        `archive schema is ${compat} (v${manifest.schemaVersion} vs this instance v${this.currentVersion()}) — upgrade this instance before importing`,
      );
    }

    const byName = new Map(domains.map((d) => [d.domain, d.records as Obj[]]));
    const inserted: Record<string, number> = {};
    const skipped: Record<string, number> = {};

    this.db.transaction((tx: Tx) => {
      if (options.mode === 'replace') this.wipeAll(tx);
      for (const spec of IMPORT_DOMAINS) {
        const records = byName.get(spec.name) ?? [];
        const existing = options.mode === 'merge' ? this.existingIds(tx, spec) : new Set<string>();
        let ins = 0;
        let skip = 0;
        for (const rec of records) {
          if (options.mode === 'merge' && existing.has(String(rec['id']))) {
            skip++;
            continue;
          }
          this.insertRecord(tx, spec, rec);
          ins++;
        }
        inserted[spec.name] = ins;
        skipped[spec.name] = skip;
      }
    });

    let reindexed = false;
    try {
      this.search?.reindex();
      reindexed = true;
    } catch (err) {
      this.logger.warn(`post-restore reindex failed (index may be stale until /search/reindex): ${err instanceof Error ? err.message : 'unknown'}`);
    }

    const total = Object.values(inserted).reduce((n, v) => n + v, 0);
    this.logger.log(`imported ${total} records (${options.mode}) across ${IMPORT_DOMAINS.length} domains; reindexed=${reindexed}`);
    return { ok: true, mode: options.mode, inserted, skipped, reindexed };
  }

  // --- internals ---

  private unpack(buf: Buffer): ReturnType<typeof unpackArchive> {
    try {
      return unpackArchive(buf);
    } catch (err) {
      throw new BadRequestException(`invalid archive: ${err instanceof Error ? err.message : 'unreadable'}`);
    }
  }

  private currentVersion(): number {
    return Math.max(0, getSchemaVersion(this.db));
  }

  /** Existing parent-row ids for a domain, as a Set (for conflict/merge checks). */
  private existingIds(db: Tx, spec: DomainSpec): Set<string> {
    const idCol = getTableColumns(spec.parent)['id'];
    const rows = db.select({ id: idCol }).from(spec.parent).all() as Array<{ id: string }>;
    return new Set(rows.map((r) => r.id));
  }

  private insertRecord(tx: Tx, spec: DomainSpec, rec: Obj): void {
    const obj = spec.transform ? spec.transform(rec) : rec;
    tx.insert(spec.parent).values(buildRow(spec.parent, obj) as never).run();
    const parentId = obj['id'];
    for (const child of spec.children ?? []) {
      this.insertChildren(tx, child, obj[child.field] as Obj[] | undefined, parentId);
    }
    for (const edge of spec.edges ?? []) {
      const others = (obj[edge.field] as unknown[] | undefined) ?? [];
      for (const otherId of others) {
        tx.insert(edge.table)
          .values({ [edge.selfFk]: parentId, [edge.otherFk]: otherId, createdAt: obj['createdAt'] ?? new Date(0).toISOString() } as never)
          .run();
      }
    }
  }

  private insertChildren(tx: Tx, spec: ChildSpec, arr: Obj[] | undefined, parentId: unknown): void {
    for (const child of arr ?? []) {
      const row = buildRow(spec.table, child);
      row[spec.fk] = parentId;
      tx.insert(spec.table).values(row as never).run();
      for (const gc of spec.children ?? []) {
        this.insertChildren(tx, gc, child[gc.field] as Obj[] | undefined, child['id']);
      }
    }
  }

  /** Delete every imported table (reverse dependency order) — the replace-mode wipe. */
  private wipeAll(tx: Tx): void {
    for (const spec of [...IMPORT_DOMAINS].reverse()) {
      for (const edge of spec.edges ?? []) tx.delete(edge.table).run();
      for (const child of spec.children ?? []) this.wipeChild(tx, child);
      tx.delete(spec.parent).run();
    }
  }

  private wipeChild(tx: Tx, spec: ChildSpec): void {
    for (const gc of spec.children ?? []) this.wipeChild(tx, gc);
    tx.delete(spec.table).run();
  }
}
