import { BadRequestException, Inject, Injectable, Logger, Optional } from '@nestjs/common';
import {
  compareSchemaVersion,
  isImportable,
  SECRETS_DOMAIN,
  SecretRecordSchema,
  type ImportOptions,
  type ImportPreview,
  type ImportResult,
  type SecretRecord,
} from '@midnite/shared';
import { CryptoService } from '../crypto/crypto.service';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { getSchemaVersion } from '../db/schema-version';
import { SearchService } from '../search/search.service';
import { unpackArchive } from './lib/archive';
import { eq, getTableColumns } from 'drizzle-orm';
import { buildRow, IMPORT_DOMAINS, type ChildSpec, type DomainSpec } from './lib/import-mappers';
import { deriveKey, unwrapSecret } from './lib/passphrase-crypto';
import { secretDomainByName } from './lib/secret-domains';

type Obj = Record<string, unknown>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- reading the id column off any parent table
type Tx = any;

/**
 * Phase 49 C — atomic import. Reads an export archive (via {@link unpackArchive},
 * which validates the manifest + per-domain envelopes), gates on schema version,
 * and restores **all-or-nothing** in a single transaction: `replace` wipes the
 * imported tables then inserts; `merge` inserts only ids not already present.
 * Rows are written via the generic de-hydration mappers in dependency order.
 * After the domain inserts (Theme G) a **secrets pass** unwraps each re-wrapped
 * secret with the passphrase key and re-encrypts it under *this* instance's
 * `MIDNITE_SECRET_KEY` — in the same transaction, so a wrong passphrase rolls the
 * whole restore back. After commit, the (derived, not-carried) search index is
 * rebuilt in-process, fail-open. Session/token tables are never imported.
 */
@Injectable()
export class PortabilityImportService {
  private readonly logger = new Logger(PortabilityImportService.name);

  constructor(
    @Inject(DB_TOKEN) private readonly db: MidniteDb,
    @Inject(CryptoService) private readonly crypto: CryptoService,
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
      const idField = spec.idField ?? 'id';
      domainCounts[spec.name] = records.length;
      const existing = this.existingIds(this.db, spec);
      const clash = records.map((r) => String(r[idField])).filter((id) => existing.has(id));
      if (clash.length > 0) conflicts[spec.name] = clash;
    }

    const warnings: string[] = [];
    const userCount = byName.get('users')?.length ?? 0;
    if (userCount > 0) {
      warnings.push(
        `Restore carries ${userCount} user account(s); a replace restore replaces all users — you may need to sign in again afterward.`,
      );
    }
    const secretCount = byName.get(SECRETS_DOMAIN)?.length ?? 0;
    if (secretCount > 0) {
      if (!this.crypto.isEnabled()) {
        warnings.push(
          `Archive holds ${secretCount} secret(s), but this instance has no MIDNITE_SECRET_KEY to re-encrypt them — they will be skipped (integrations import disabled).`,
        );
      } else {
        warnings.push(`Archive holds ${secretCount} secret(s); provide the passphrase to restore them.`);
      }
    }

    return { manifest, domainCounts, conflicts, compat, importable: isImportable(compat), warnings };
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
    const secrets = this.parseSecrets(byName.get(SECRETS_DOMAIN));
    const inserted: Record<string, number> = {};
    const skipped: Record<string, number> = {};
    let secretsRestored = 0;
    let secretsSkipped = 0;

    this.db.transaction((tx: Tx) => {
      if (options.mode === 'replace') this.wipeAll(tx);
      for (const spec of IMPORT_DOMAINS) {
        const idField = spec.idField ?? 'id';
        const records = byName.get(spec.name) ?? [];
        const existing = options.mode === 'merge' ? this.existingIds(tx, spec) : new Set<string>();
        let ins = 0;
        let skip = 0;
        for (const rec of records) {
          if (options.mode === 'merge' && existing.has(String(rec[idField]))) {
            skip++;
            continue;
          }
          this.insertRecord(tx, spec, rec);
          ins++;
        }
        inserted[spec.name] = ins;
        skipped[spec.name] = skip;
      }
      // Theme G — re-encrypt + write secrets into the just-inserted rows. Throws on a
      // wrong passphrase, rolling the whole restore back (all-or-nothing).
      const res = this.applySecrets(tx, secrets, manifest.kdf, options.passphrase);
      secretsRestored = res.restored;
      secretsSkipped = res.skipped;
    });

    let reindexed = false;
    try {
      this.search?.reindex();
      reindexed = true;
    } catch (err) {
      this.logger.warn(`post-restore reindex failed (index may be stale until /search/reindex): ${err instanceof Error ? err.message : 'unknown'}`);
    }

    const total = Object.values(inserted).reduce((n, v) => n + v, 0);
    this.logger.log(
      `imported ${total} records (${options.mode}) across ${IMPORT_DOMAINS.length} domains; secrets restored=${secretsRestored} skipped=${secretsSkipped}; reindexed=${reindexed}`,
    );
    return { ok: true, mode: options.mode, inserted, skipped, reindexed, secretsRestored, secretsSkipped };
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
    const idCol = getTableColumns(spec.parent)[spec.idField ?? 'id'];
    const rows = db.select({ id: idCol }).from(spec.parent).all() as Array<{ id: string }>;
    return new Set(rows.map((r) => String(r.id)));
  }

  private insertRecord(tx: Tx, spec: DomainSpec, rec: Obj): void {
    const obj = spec.transform ? spec.transform(rec) : rec;
    tx.insert(spec.parent).values(buildRow(spec.parent, obj) as never).run();
    const parentId = obj[spec.idField ?? 'id'];
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

  /** Validate the `secrets` payload (drops it silently if malformed → nothing to apply). */
  private parseSecrets(records: Obj[] | undefined): SecretRecord[] {
    if (!records || records.length === 0) return [];
    const parsed = SecretRecordSchema.array().safeParse(records);
    if (!parsed.success) throw new BadRequestException(`invalid secrets payload: ${parsed.error.message}`);
    return parsed.data;
  }

  /**
   * Theme G — re-encrypt each transit-wrapped secret under this instance's key and
   * write it into the row inserted moments earlier (same tx). Skips the whole set
   * (never throws) when there's no passphrase to unwrap with or no target key to
   * re-encrypt under (Decision: degrade, don't fail). A wrong passphrase throws so
   * the transaction rolls back — no half-restored secrets.
   */
  private applySecrets(
    tx: Tx,
    secrets: SecretRecord[],
    kdf: ImportPreview['manifest']['kdf'],
    passphrase: string | undefined,
  ): { restored: number; skipped: number } {
    if (secrets.length === 0) return { restored: 0, skipped: 0 };
    if (!passphrase) {
      this.logger.warn(`skipping ${secrets.length} secret(s): no passphrase provided`);
      return { restored: 0, skipped: secrets.length };
    }
    if (!kdf) throw new BadRequestException('archive carries secrets but no KDF params in the manifest');
    if (!this.crypto.isEnabled()) {
      this.logger.warn(`skipping ${secrets.length} secret(s): MIDNITE_SECRET_KEY is not set (cannot re-encrypt at rest)`);
      return { restored: 0, skipped: secrets.length };
    }

    const key = deriveKey(passphrase, kdf);
    let restored = 0;
    for (const s of secrets) {
      const def = secretDomainByName(s.table);
      if (!def || def.secretField !== s.field) {
        throw new BadRequestException(`secret references unknown target ${s.table}.${s.field}`);
      }
      const plaintext = unwrapSecret(s.blob, key);
      if (plaintext === null) {
        throw new BadRequestException('passphrase incorrect (or an archive secret is corrupt) — restore rolled back');
      }
      const idCol = getTableColumns(def.table)[def.idField];
      tx.update(def.table)
        .set({ [def.secretField]: this.crypto.encrypt(plaintext) })
        .where(eq(idCol, s.entityId))
        .run();
      restored++;
    }
    return { restored, skipped: 0 };
  }
}
