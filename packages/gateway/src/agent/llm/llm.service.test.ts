import { describe, expect, it } from 'vitest';
import type { LlmFeature, LlmProvider, MidniteConfig } from '@midnite/shared';
import type { ProviderCredentialsRepository } from '../provider-credentials.repository';
import type { RecordUsageInput, UsageService } from '../../usage/usage.service';
import { LlmService } from './llm.service';
import type {
  GenerateStructuredRequest,
  GenerateTextRequest,
  LlmProviderAdapter,
  LlmStructuredResult,
  LlmTextResult,
  LlmUsage,
} from './llm-provider.interface';

// A fake adapter that returns a fixed result + usage, so we can assert the
// LlmService records exactly one usage row per call with the right feature.
class FakeAdapter implements LlmProviderAdapter {
  readonly id: LlmProvider = 'openai';
  constructor(private readonly usage: LlmUsage | undefined) {}
  isEnabled() {
    return true;
  }
  async generateText(_req: GenerateTextRequest): Promise<LlmTextResult> {
    return { text: 'hi', model: 'gpt-5', ...(this.usage ? { usage: this.usage } : {}) };
  }
  async generateStructured(_req: GenerateStructuredRequest): Promise<LlmStructuredResult> {
    return { data: {}, model: 'gpt-5', ...(this.usage ? { usage: this.usage } : {}) };
  }
  async ping() {
    return { ok: true, model: 'gpt-5', reply: 'ok' };
  }
}

function makeService(usage: LlmUsage | undefined) {
  const records: RecordUsageInput[] = [];
  const usageService = { record: (r: RecordUsageInput) => records.push(r) } as unknown as UsageService;
  const config = { agent: { act: 'gpt-5', plan: 'gpt-5' } } as MidniteConfig;
  const repo = {} as ProviderCredentialsRepository;
  const svc = new LlmService(config, repo, usageService);
  // Inject the fake adapter directly (reload() would hit the repo/SDKs).
  (svc as unknown as { adapter: LlmProviderAdapter; active: LlmProvider }).adapter = new FakeAdapter(usage);
  (svc as unknown as { adapter: LlmProviderAdapter; active: LlmProvider }).active = 'openai';
  return { svc, records };
}

const req: GenerateTextRequest = { model: 'gpt-5', maxTokens: 16, messages: [{ role: 'user', text: 'x' }] };

describe('LlmService usage recording', () => {
  it('records one usage row per generateText call with the given feature', async () => {
    const { svc, records } = makeService({ inputTokens: 120, outputTokens: 30 });
    await svc.generateText(req, 'classifier' satisfies LlmFeature);
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({
      provider: 'openai',
      model: 'gpt-5',
      feature: 'classifier',
      inputTokens: 120,
      outputTokens: 30,
    });
  });

  it('defaults the feature to "unknown" when omitted', async () => {
    const { svc, records } = makeService({ inputTokens: 1, outputTokens: 2 });
    await svc.generateStructured({ ...req, schema: {}, schemaName: 's' });
    expect(records[0]?.feature).toBe('unknown');
  });

  it('does not record when the adapter reports no usage', async () => {
    const { svc, records } = makeService(undefined);
    await svc.generateText(req, 'planner');
    expect(records).toHaveLength(0);
  });
});
