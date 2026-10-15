// =============================================================================
// TuniEdu AI Provider — OpenRouter (OpenAI-compatible chat completions).
//
// This module is the ONLY place that talks to an external LLM. It is written
// with the WHATWG fetch API (no SDK dependency) and fails SOFT: any missing
// config, network error, timeout or non-2xx response returns `null` so callers
// can fall back to the deterministic pedagogical templates instead of crashing.
//
// Configuration (see .env.example):
//   OPENROUTER_API_KEY      required to enable real generation
//   OPENROUTER_BASE_URL     default https://openrouter.ai/api/v1
//   AI_MODEL                default openai/gpt-4o-mini
//   AI_REQUEST_TIMEOUT_MS   default 25000
// =============================================================================

export interface AiChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface AiCompletionResult {
  content: string;
  model: string;
  provider: string;
  usage?: AiUsage;
  latencyMs: number;
  attempts: number;
}

const DEFAULT_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = 'openai/gpt-4o-mini';
const DEFAULT_TIMEOUT_MS = 25000;
const MAX_RETRIES = 2; // up to 3 attempts total
const RETRY_BASE_DELAY_MS = 400;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export interface AiCompletionOptions {
  temperature?: number;
  maxTokens?: number;
  model?: string;
  /** Number of retries after the first attempt (default 2 => 3 attempts). */
  retries?: number;
}

export function isAiProviderConfigured(): boolean {
  const key = process.env.OPENROUTER_API_KEY;
  return typeof key === 'string' && key.trim().length > 0;
}

export function getAiModel(): string {
  const model = process.env.AI_MODEL;
  return model && model.trim().length > 0 ? model.trim() : DEFAULT_MODEL;
}

/**
 * Calls an OpenAI-compatible /chat/completions endpoint with bounded exponential
 * backoff. Returns null on any terminal failure (never throws) so the caller can
 * degrade gracefully. Retries on network errors, timeouts, 429 and 5xx.
 */
export async function createChatCompletion(
  messages: AiChatCompletionMessage[],
  options?: AiCompletionOptions,
): Promise<AiCompletionResult | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) return null;

  const baseUrl = (process.env.OPENROUTER_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, '');
  const model = options?.model?.trim() || getAiModel();
  const timeoutMs = Number(process.env.AI_REQUEST_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const maxAttempts = Math.max(1, (options?.retries ?? MAX_RETRIES) + 1);

  const startedAt = Date.now();
  let lastError = 'unknown error';

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': appUrl,
          'X-Title': 'TuniEdu',
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: options?.temperature ?? 0.4,
          max_tokens: options?.maxTokens ?? 800,
        }),
        signal: controller.signal,
      });

      // Retryable server-side conditions.
      if (res.status === 429 || res.status >= 500) {
        lastError = `HTTP ${res.status}`;
        if (attempt < maxAttempts) {
          await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 200));
          continue;
        }
        console.error(`[ai-provider] OpenRouter ${lastError} after ${attempt} attempts`);
        return null;
      }

      if (!res.ok) {
        // Non-retryable (auth, bad request, ...).
        const detail = await res.text().catch(() => '');
        console.error(`[ai-provider] OpenRouter HTTP ${res.status}: ${detail.slice(0, 300)}`);
        return null;
      }

      const data = (await res.json()) as {
        model?: string;
        choices?: { message?: { content?: string } }[];
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const content = data.choices?.[0]?.message?.content?.trim();
      if (!content) {
        lastError = 'empty completion';
        if (attempt < maxAttempts) {
          await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1));
          continue;
        }
        return null;
      }

      const usage: AiUsage | undefined = data.usage
        ? {
            promptTokens: data.usage.prompt_tokens ?? 0,
            completionTokens: data.usage.completion_tokens ?? 0,
            totalTokens: data.usage.total_tokens ?? 0,
          }
        : undefined;

      return {
        content,
        model: data.model || model,
        provider: 'openrouter',
        usage,
        latencyMs: Date.now() - startedAt,
        attempts: attempt,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'request failed';
      if (attempt < maxAttempts) {
        await sleep(RETRY_BASE_DELAY_MS * 2 ** (attempt - 1) + Math.floor(Math.random() * 200));
        continue;
      }
      console.error(`[ai-provider] request failed after ${attempt} attempts: ${lastError}`);
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  console.error(`[ai-provider] exhausted attempts: ${lastError}`);
  return null;
}
