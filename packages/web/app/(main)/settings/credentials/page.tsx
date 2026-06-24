'use client';

import { useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import {
  WORKFLOW_CREDENTIAL_TYPES,
  type WorkflowCredential,
  type WorkflowCredentialType,
  type CreateWorkflowCredentialRequest,
} from '@midnite/shared';
import { Button } from '@/components/ui/button';
import { useApiData } from '@/lib/use-api-data';
import { useGatewayErrorToast } from '@/lib/use-gateway-error-toast';
import { useConfirm } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';
import {
  createWorkflowCredential,
  deleteWorkflowCredential,
  listWorkflowCredentials,
} from '@/lib/api';
import { invalidateData } from '@/lib/data-refresh';
import { CredentialForm } from './credential-form';

const TYPE_LABELS: Record<WorkflowCredentialType, string> = {
  'http-bearer': 'HTTP Bearer token',
  'http-basic': 'HTTP Basic auth',
  'http-header': 'HTTP custom header',
  slack: 'Slack',
  smtp: 'SMTP (email)',
  github: 'GitHub (PAT)',
};

export default function CredentialsPage() {
  const { data, error } = useApiData(listWorkflowCredentials);
  const credentials = data ?? [];
  useGatewayErrorToast(error);

  const confirm = useConfirm();
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  const handleCreate = async (req: CreateWorkflowCredentialRequest) => {
    try {
      await createWorkflowCredential(req);
      invalidateData();
      setAdding(false);
      toast.success('Credential saved');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save credential');
    }
  };

  const handleDelete = async (cred: WorkflowCredential) => {
    const ok = await confirm({
      title: 'Delete credential?',
      description: `"${cred.name}" will be permanently removed. Any workflow node that references it will fail until updated.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteWorkflowCredential(cred.id);
      invalidateData();
      toast.success('Credential deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not delete credential');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold">Workflow credentials</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Secrets used by workflow integration nodes (Slack, SMTP, HTTP auth). Secret material is
          encrypted at rest and never returned by the API — only the name and type are visible here.
        </p>
      </div>

      {credentials.length > 0 && (
        <ul className="divide-y divide-border/60 rounded-lg border border-border/60">
          {credentials.map((cred) => (
            <li key={cred.id} className="flex items-center gap-3 px-4 py-3">
              <KeyRound className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{cred.name}</p>
                <p className="text-xs text-muted-foreground">{TYPE_LABELS[cred.type] ?? cred.type}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Delete ${cred.name}`}
                onClick={() => void handleDelete(cred)}
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {credentials.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">No credentials saved yet.</p>
      )}

      {adding ? (
        <CredentialForm
          types={WORKFLOW_CREDENTIAL_TYPES}
          typeLabels={TYPE_LABELS}
          onSave={(req) => void handleCreate(req)}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="h-4 w-4" />
          Add credential
        </Button>
      )}
    </div>
  );
}
