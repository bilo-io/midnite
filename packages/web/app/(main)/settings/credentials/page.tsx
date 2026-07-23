'use client';

import { useState } from 'react';
import { KeyRound, Plus, Trash2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
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

export default function CredentialsPage() {
  const t = useTranslations('settings');
  const tc = useTranslations('common');
  const { data, error } = useApiData(listWorkflowCredentials);
  const credentials = data ?? [];
  useGatewayErrorToast(error);

  const confirm = useConfirm();
  const toast = useToast();
  const [adding, setAdding] = useState(false);

  const TYPE_LABELS: Record<WorkflowCredentialType, string> = {
    'http-bearer': t('credentials.types.httpBearer'),
    'http-basic': t('credentials.types.httpBasic'),
    'http-header': t('credentials.types.httpHeader'),
    slack: t('credentials.types.slack'),
    smtp: t('credentials.types.smtp'),
    github: t('credentials.types.github'),
    'google-oauth': t('credentials.types.googleOauth'),
    'slack-oauth': t('credentials.types.slackOauth'),
  };

  const handleCreate = async (req: CreateWorkflowCredentialRequest) => {
    try {
      await createWorkflowCredential(req);
      invalidateData();
      setAdding(false);
      toast.success(t('credentials.toast.saved'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('credentials.toast.saveError'));
    }
  };

  const handleDelete = async (cred: WorkflowCredential) => {
    const ok = await confirm({
      title: t('credentials.delete.title'),
      description: t('credentials.delete.description', { name: cred.name }),
      confirmLabel: tc('delete'),
      destructive: true,
    });
    if (!ok) return;
    try {
      await deleteWorkflowCredential(cred.id);
      invalidateData();
      toast.success(t('credentials.toast.deleted'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('credentials.toast.deleteError'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-semibold">{t('credentials.title')}</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          {t('credentials.description')}
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
                aria-label={t('credentials.deleteNamed', { name: cred.name })}
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
        <p className="text-sm text-muted-foreground">{t('credentials.empty')}</p>
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
          {t('credentials.add')}
        </Button>
      )}
    </div>
  );
}
