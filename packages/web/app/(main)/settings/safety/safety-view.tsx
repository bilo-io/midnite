'use client';

import { GuardrailsBanner, GuardrailsControl } from '@/components/guardrails-control';
import { SafetyCapsPanel } from '@/components/safety/safety-caps-panel';
import { SafetyDecisionsFeed } from '@/components/safety/safety-decisions-feed';
import { useGuardrails } from '@/hooks/use-guardrails';
import { ApprovalsView } from '../approvals/approvals-view';

function Section({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium">{title}</h2>
          {description ? <p className="mt-0.5 text-xs text-muted-foreground">{description}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Phase 50 E — the one place to see and steer every guardrail: the kill switch /
 * pause, the autonomy mode + approval rules (reusing the Approvals editor), the
 * configured spend/rate caps + blast-radius protected actions, and a live feed of
 * recent act-path decisions. Write actions are admin-gated server-side.
 */
export function SafetyView() {
  const { guardrails, setLocal } = useGuardrails();

  return (
    <div className="max-w-lg space-y-8">
      <div>
        <h1 className="text-base font-semibold">Safety</h1>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Guardrails for autonomous agents — pause, policy, caps, and blast-radius limits.
        </p>
      </div>

      <Section
        title="Kill switch & pause"
        description="Pause scheduling (running agents finish) or emergency-stop (abort in-flight agents, requeued)."
        action={<GuardrailsControl guardrails={guardrails} onChange={setLocal} />}
      >
        <GuardrailsBanner guardrails={guardrails} onChange={setLocal} />
      </Section>

      {/* Autonomy mode + durable allow/deny rules (reused from Settings → Approvals). */}
      <ApprovalsView />

      <Section title="Spend, rate & blast-radius" description="What blocks or denies agent work — configured, shown read-only.">
        <SafetyCapsPanel />
      </Section>

      <Section title="Recent decisions" description="Latest act-path allow / deny / escalate decisions.">
        <SafetyDecisionsFeed />
      </Section>
    </div>
  );
}
