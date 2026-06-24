import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, lt } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { refreshTokens, type RefreshTokenInsert, type RefreshTokenRow } from '../db/schema';

@Injectable()
export class RefreshTokensRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  insert(row: RefreshTokenInsert): RefreshTokenRow {
    return this.db.insert(refreshTokens).values(row).returning().get();
  }

  findByHash(tokenHash: string): RefreshTokenRow | undefined {
    return this.db
      .select()
      .from(refreshTokens)
      .where(and(eq(refreshTokens.tokenHash, tokenHash), isNull(refreshTokens.revokedAt)))
      .get();
  }

  revoke(id: string, revokedAt: string): void {
    this.db
      .update(refreshTokens)
      .set({ revokedAt })
      .where(eq(refreshTokens.id, id))
      .run();
  }

  revokeAllForUser(userId: string, revokedAt: string): void {
    this.db
      .update(refreshTokens)
      .set({ revokedAt })
      .where(and(eq(refreshTokens.userId, userId), isNull(refreshTokens.revokedAt)))
      .run();
  }

  deleteExpired(before: string): void {
    this.db.delete(refreshTokens).where(lt(refreshTokens.expiresAt, before)).run();
  }
}
