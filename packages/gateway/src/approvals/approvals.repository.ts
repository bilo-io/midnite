import { Inject, Injectable } from '@nestjs/common';
import { asc, eq } from 'drizzle-orm';
import { DB_TOKEN, type MidniteDb } from '../db/db.module';
import { approvalRules, type ApprovalRuleInsert, type ApprovalRuleRow } from '../db/schema';

/** Drizzle queries for `approval_rules`. No business rules — all logic lives in the service. */
@Injectable()
export class ApprovalsRepository {
  constructor(@Inject(DB_TOKEN) private readonly db: MidniteDb) {}

  list(): ApprovalRuleRow[] {
    return this.db.select().from(approvalRules).orderBy(asc(approvalRules.createdAt)).all();
  }

  listEnabled(): ApprovalRuleRow[] {
    return this.db
      .select()
      .from(approvalRules)
      .where(eq(approvalRules.enabled, true))
      .orderBy(asc(approvalRules.createdAt))
      .all();
  }

  get(id: string): ApprovalRuleRow | undefined {
    return this.db
      .select()
      .from(approvalRules)
      .where(eq(approvalRules.id, id))
      .get();
  }

  insert(row: ApprovalRuleInsert): ApprovalRuleRow {
    return this.db.insert(approvalRules).values(row).returning().get();
  }

  update(id: string, patch: Partial<Omit<ApprovalRuleInsert, 'id'>>): ApprovalRuleRow | undefined {
    if (Object.keys(patch).length === 0) return this.get(id);
    return this.db
      .update(approvalRules)
      .set(patch)
      .where(eq(approvalRules.id, id))
      .returning()
      .get();
  }

  remove(id: string): boolean {
    const result = this.db
      .delete(approvalRules)
      .where(eq(approvalRules.id, id))
      .returning({ id: approvalRules.id })
      .all();
    return result.length > 0;
  }

  /** Find all enabled rules matching a specific tool name or the wildcard '*'. */
  listEnabledForTool(toolName: string): ApprovalRuleRow[] {
    return this.listEnabled().filter((r) => r.toolName === toolName || r.toolName === '*');
  }
}
