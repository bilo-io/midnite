import {
  GoogleGenerativeAI,
  type Content,
  type Part,
} from '@google/generative-ai';
import type { AgentPingResponse, LlmProvider } from '@midnite/shared';
import { jsonSchemaInstruction, parseJsonObjectLoose } from '../json-output';
import type {
  GenerateStructuredRequest,
  GenerateTextRequest,
  LlmMessage,
  LlmProviderAdapter,
  LlmStructuredResult,
  LlmTextResult,
} from '../llm-provider.interface';

/**
 * Google Gemini adapter. Structured output uses `responseMimeType:
 * 'application/json'` plus a schema instruction in the system prompt (Gemini's
 * native responseSchema uses a different type dialect; the prompt-instruction
 * route is robust across schema shapes), then a loose JSON parse.
 */
export class GoogleProvider implements LlmProviderAdapter {
  readonly id: LlmProvider = 'google';
  private readonly genAI: GoogleGenerativeAI | undefined;

  constructor(apiKey: string | undefined) {
    this.genAI = apiKey ? new GoogleGenerativeAI(apiKey) : undefined;
  }

  isEnabled(): boolean {
    return this.genAI !== undefined;
  }

  private require(): GoogleGenerativeAI {
    if (!this.genAI) {
      throw new Error('Google provider is not configured (missing API key).');
    }
    return this.genAI;
  }

  async generateText(req: GenerateTextRequest): Promise<LlmTextResult> {
    const model = this.require().getGenerativeModel({
      model: req.model,
      ...(req.system ? { systemInstruction: req.system } : {}),
    });
    const res = await model.generateContent(
      {
        contents: this.toContents(req.messages),
        generationConfig: { maxOutputTokens: req.maxTokens },
      },
      { signal: req.signal },
    );
    return { text: res.response.text(), model: req.model };
  }

  async generateStructured(req: GenerateStructuredRequest): Promise<LlmStructuredResult> {
    const system = [req.system, jsonSchemaInstruction(req.schema, req.schemaDescription)]
      .filter(Boolean)
      .join('\n\n');
    const model = this.require().getGenerativeModel({
      model: req.model,
      systemInstruction: system,
    });
    const res = await model.generateContent(
      {
        contents: this.toContents(req.messages),
        generationConfig: {
          maxOutputTokens: req.maxTokens,
          responseMimeType: 'application/json',
        },
      },
      { signal: req.signal },
    );
    return { data: parseJsonObjectLoose(res.response.text()), model: req.model };
  }

  async ping(): Promise<Omit<AgentPingResponse, 'cli'>> {
    if (!this.genAI) {
      return { ok: false, model: '', reply: 'AI is disabled — add a Google API key in settings.' };
    }
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('ping');
      return { ok: true, model: 'connected', reply: 'system status: ok' };
    } catch (err) {
      const status = (err as { status?: number })?.status;
      const message = err instanceof Error ? err.message : String(err);
      return { ok: false, model: 'gemini', reply: `ping failed${status ? ` (${status})` : ''}: ${message}` };
    }
  }

  private toContents(messages: LlmMessage[]): Content[] {
    return messages.map((m) => {
      const parts: Part[] = [
        ...(m.images ?? []).map((img) => ({
          inlineData: { mimeType: img.mime, data: img.dataBase64 },
        })),
        { text: m.text },
      ];
      return { role: m.role === 'assistant' ? 'model' : 'user', parts };
    });
  }
}
