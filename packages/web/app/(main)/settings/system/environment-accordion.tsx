'use client';

import { useCallback, useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import {
  ENV_OSES,
  ENV_OS_LABEL,
  ENV_TOOLS_BY_OS,
  type EnvOs,
  type EnvToolAction,
  type EnvToolMeta,
  type EnvironmentResponse,
} from '@midnite/shared';
import { Accordion } from '@/components/ui/accordion';
import { Tabs, type TabOption } from '@/components/ui/tabs';
import { getEnvironment } from '@/lib/api';
import { EnvToolCard } from './env-tool-card';
import { EnvActionModal } from './env-action-modal';

const TAB_OPTIONS: TabOption<EnvOs>[] = ENV_OSES.map((os) => ({
  value: os,
  label: ENV_OS_LABEL[os],
}));

/**
 * The system toolchain checker: OS tabs (auto-selecting the gateway host) over a
 * list of required tools, each with live status and install/update/uninstall —
 * mirroring the Agent CLI checker. Only the detected OS is live; other tabs are
 * reference-only.
 */
export function EnvironmentAccordion() {
  const [env, setEnv] = useState<EnvironmentResponse | null>(null);
  const [busy, setBusy] = useState(true);
  const [tab, setTab] = useState<EnvOs>('mac');
  const [action, setAction] = useState<{ meta: EnvToolMeta; action: EnvToolAction } | null>(null);

  const load = useCallback(() => {
    setBusy(true);
    getEnvironment()
      .then((e) => {
        setEnv(e);
        if (e.os !== 'other') setTab(e.os); // auto-select the detected OS
      })
      .catch(() => setEnv({ os: 'other', tools: [] }))
      .finally(() => setBusy(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const hostOs = env?.os ?? null;
  const live = hostOs === tab;
  const tools = ENV_TOOLS_BY_OS[tab];
  const statusFor = (id: EnvToolMeta['id']) => env?.tools.find((t) => t.id === id);

  return (
    <Accordion title="Environment" icon={<Wrench className="h-3.5 w-3.5" />} defaultOpen>
      <div className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            The local toolchain midnite needs, detected on the gateway host.
          </p>
          <Tabs options={TAB_OPTIONS} value={tab} onChange={setTab} ariaLabel="Operating system" />
        </div>

        {hostOs && hostOs !== 'other' ? (
          <p className="text-[11px] text-muted-foreground">
            Detected system: {ENV_OS_LABEL[hostOs]}.
          </p>
        ) : null}

        {tools.length === 0 ? (
          <p className="rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-muted-foreground">
            {ENV_OS_LABEL[tab]} tools aren&apos;t configured yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {!busy && !live ? (
              <p className="text-[11px] text-muted-foreground">
                {hostOs && hostOs !== 'other'
                  ? `Detected system is ${ENV_OS_LABEL[hostOs]} — these ${ENV_OS_LABEL[tab]} tools are shown for reference.`
                  : `Shown for reference — couldn't detect the host OS.`}
              </p>
            ) : null}
            {tools.map((meta) => (
              <EnvToolCard
                key={meta.id}
                meta={meta}
                status={live ? statusFor(meta.id) : undefined}
                loading={busy}
                live={live}
                onAction={(a) => setAction({ meta, action: a })}
              />
            ))}
          </div>
        )}
      </div>

      {action ? (
        <EnvActionModal
          meta={action.meta}
          action={action.action}
          onClose={() => {
            setAction(null);
            load(); // re-probe after the user may have installed/updated/removed
          }}
        />
      ) : null}
    </Accordion>
  );
}
