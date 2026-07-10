import type { SQLiteTable } from 'drizzle-orm/sqlite-core';
import { llmProviders, webhooks, workflowCredentials } from '../../db/schema';

/**
 * Phase 49 G — the secret-bearing integration domains. Their *config* rows always
 * ride along in an export (URLs, names, models), but the encrypted-at-rest field is
 * never carried in the domain payload — it's stripped to a placeholder there and,
 * under `passphrase` mode, re-wrapped into the separate `secrets` payload keyed by
 * `{domain (= `name`), entityId, field}`. On import the placeholder inserts first,
 * then the secrets pass re-encrypts + writes the real value.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- generic over any Drizzle table
type AnyTable = SQLiteTable<any>;

export interface SecretDomainDef {
  /** Archive-domain name (matches an entry in IMPORT_DOMAINS + SecretRecord.table). */
  name: string;
  table: AnyTable;
  /** PK column (JS key) used to locate the row on import. */
  idField: string;
  /** The encrypted-at-rest column to strip on export / restore on import. */
  secretField: string;
  /** Placeholder written into the stripped column so a NOT NULL insert succeeds and
   *  the entity reads as "disabled pending config" until a secret is restored.
   *  `null` for a nullable column (e.g. an unset provider key stays unset). */
  placeholder: '' | null;
}

export const SECRET_DOMAINS: SecretDomainDef[] = [
  // webhooks.secret / workflow_credentials.data are NOT NULL → '' placeholder.
  { name: 'webhooks', table: webhooks, idField: 'id', secretField: 'secret', placeholder: '' },
  { name: 'workflowCredentials', table: workflowCredentials, idField: 'id', secretField: 'data', placeholder: '' },
  // llm_providers.api_key is nullable → keep null when unset (preserves "hasKey").
  { name: 'llmProviders', table: llmProviders, idField: 'provider', secretField: 'apiKey', placeholder: null },
];

/** Look up a secret domain by its archive name (for the import apply-secrets pass). */
export function secretDomainByName(name: string): SecretDomainDef | undefined {
  return SECRET_DOMAINS.find((d) => d.name === name);
}
