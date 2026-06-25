import { Inject, Injectable } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { serviceTokens, type ServiceTokenInsert, type ServiceTokenRow } from '../db/schema';

@Injectable()
export class ServiceTokensRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: ServiceTokenInsert): ServiceTokenRow {
    this.db.run(
      sql`INSERT INTO service_tokens (id, name, token_hash, prefix, team_id, created_by, expires_at, created_at)
          VALUES (${row.id}, ${row.name}, ${row.tokenHash}, ${row.prefix}, ${row.teamId ?? null}, ${row.createdBy ?? null}, ${row.expiresAt ?? null}, ${row.createdAt})`,
    );
    return this.db.get<ServiceTokenRow>(
      sql`SELECT * FROM service_tokens WHERE id = ${row.id}`,
    )!;
  }

  findByHash(hash: string): ServiceTokenRow | undefined {
    return this.db.get<ServiceTokenRow>(
      sql`SELECT * FROM service_tokens WHERE token_hash = ${hash} AND revoked_at IS NULL`,
    );
  }

  list(teamId?: string | null): ServiceTokenRow[] {
    if (teamId !== undefined) {
      return this.db.all<ServiceTokenRow>(
        sql`SELECT * FROM service_tokens WHERE team_id = ${teamId} AND revoked_at IS NULL ORDER BY created_at DESC`,
      );
    }
    return this.db.all<ServiceTokenRow>(
      sql`SELECT * FROM service_tokens WHERE revoked_at IS NULL ORDER BY created_at DESC`,
    );
  }

  revoke(id: string, revokedAt: string): void {
    this.db.run(
      sql`UPDATE service_tokens SET revoked_at = ${revokedAt} WHERE id = ${id}`,
    );
  }

  touchLastUsed(id: string, at: string): void {
    this.db.run(
      sql`UPDATE service_tokens SET last_used_at = ${at} WHERE id = ${id}`,
    );
  }
}
