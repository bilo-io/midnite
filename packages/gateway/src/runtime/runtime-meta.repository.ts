import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { runtimeMeta, type RuntimeMetaRow } from '../db/schema';

const SINGLETON = 'singleton';

/**
 * Phase 54 E — persistence for the one-row `runtime_meta` lifecycle marker.
 * Drizzle only; the service owns when to stamp.
 */
@Injectable()
export class RuntimeMetaRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  read(): RuntimeMetaRow | undefined {
    return this.db.select().from(runtimeMeta).where(eq(runtimeMeta.id, SINGLETON)).get();
  }

  /** Stamp a new run: clean=false + startedAt (a not-yet-drained process). */
  stampStarted(startedAt: string): void {
    this.db
      .insert(runtimeMeta)
      .values({ id: SINGLETON, clean: false, startedAt, shutdownAt: null })
      .onConflictDoUpdate({ target: runtimeMeta.id, set: { clean: false, startedAt, shutdownAt: null } })
      .run();
  }

  /** Flip to a clean shutdown (the graceful drain completed). */
  markClean(shutdownAt: string): void {
    this.db
      .update(runtimeMeta)
      .set({ clean: true, shutdownAt })
      .where(eq(runtimeMeta.id, SINGLETON))
      .run();
  }
}
