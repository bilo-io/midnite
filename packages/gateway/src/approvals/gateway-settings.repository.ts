import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import type { MidniteDb } from '../db/db.module';
import { DB_TOKEN } from '../db/db.module';
import { gatewaySettings } from '../db/schema';

@Injectable()
export class GatewaySettingsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  get(key: string): string | null {
    const row = this.db.select().from(gatewaySettings).where(eq(gatewaySettings.key, key)).get();
    return row?.value ?? null;
  }

  set(key: string, value: string): void {
    const now = new Date().toISOString();
    this.db
      .insert(gatewaySettings)
      .values({ key, value, updatedAt: now })
      .onConflictDoUpdate({ target: gatewaySettings.key, set: { value, updatedAt: now } })
      .run();
  }
}
