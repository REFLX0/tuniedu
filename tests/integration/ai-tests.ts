// =============================================================================
// TuniEdu AI Provider & Tutor Tests
// Run: npx tsx tests/integration/ai-tests.ts
//
// Purely local: the OpenRouter HTTP surface is stubbed via globalThis.fetch, so
// no network or API key is required. Verifies retry/backoff, usage telemetry,
// non-retryable handling and graceful template fallback.
// =============================================================================

import { createChatCompletion, isAiProviderConfigured } from '../../apps/web/lib/ai-provider';
import {
  generateAiTutorResponse,
  sanitizePromptForInpdp,
  checkCurriculumIntegrity,
} from '../../apps/web/lib/ai-tutor';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

const realFetch = globalThis.fetch;
const savedKey = process.env.OPENROUTER_API_KEY;

function mockResponse(status: number, body: unknown): Response {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

async function run(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const push = (id: string, name: string, passed: boolean, details: string) =>
    results.push({ id, name, passed, details });

  // AI-01: no key => not configured + null result, and fetch is never called.
  delete process.env.OPENROUTER_API_KEY;
  let called = 0;
  globalThis.fetch = (async () => {
    called += 1;
    return mockResponse(200, {});
  }) as typeof fetch;
  const noKey = await createChatCompletion([{ role: 'user', content: 'hi' }]);
  push(
    'AI-01',
    'No API key => provider unconfigured and no request attempted',
    isAiProviderConfigured() === false && noKey === null && called === 0,
    `configured=${isAiProviderConfigured()} result=${noKey} fetchCalls=${called}`,
  );

  // AI-02: retries once on 500, then succeeds with usage + attempts telemetry.
  process.env.OPENROUTER_API_KEY = 'test_key';
  let attempts = 0;
  globalThis.fetch = (async () => {
    attempts += 1;
    if (attempts === 1) return mockResponse(500, 'boom');
    return mockResponse(200, {
      model: 'openai/gpt-4o-mini',
      choices: [{ message: { content: '  Bonjour élève  ' } }],
      usage: { prompt_tokens: 11, completion_tokens: 7, total_tokens: 18 },
    });
  }) as typeof fetch;
  const retried = await createChatCompletion([{ role: 'user', content: 'hi' }]);
  push(
    'AI-02',
    'Retries on HTTP 500 then returns content + usage telemetry',
    retried !== null &&
      retried.content === 'Bonjour élève' &&
      retried.attempts === 2 &&
      retried.usage?.totalTokens === 18 &&
      retried.latencyMs >= 0,
    `attempts=${retried?.attempts} content="${retried?.content}" usage=${JSON.stringify(retried?.usage)}`,
  );

  // AI-03: 4xx (auth) is NOT retried.
  let nonRetryCalls = 0;
  globalThis.fetch = (async () => {
    nonRetryCalls += 1;
    return mockResponse(401, 'unauthorized');
  }) as typeof fetch;
  const denied = await createChatCompletion([{ role: 'user', content: 'hi' }]);
  push(
    'AI-03',
    'Non-retryable HTTP 401 fails fast (no retries)',
    denied === null && nonRetryCalls === 1,
    `result=${denied} fetchCalls=${nonRetryCalls}`,
  );

  // AI-04: gives up after the configured retry budget.
  let exhaustedCalls = 0;
  globalThis.fetch = (async () => {
    exhaustedCalls += 1;
    return mockResponse(503, 'unavailable');
  }) as typeof fetch;
  const exhausted = await createChatCompletion([{ role: 'user', content: 'hi' }], { retries: 1 });
  push(
    'AI-04',
    'Exhausts retry budget on persistent 5xx and returns null',
    exhausted === null && exhaustedCalls === 2,
    `result=${exhausted} fetchCalls=${exhaustedCalls} (expected 2 = 1 + 1 retry)`,
  );

  // AI-05: EXPLAIN falls back to the deterministic template when unreachable.
  globalThis.fetch = (async () => mockResponse(500, 'down')) as typeof fetch;
  const fallback = await generateAiTutorResponse({
    studentId: 'stu_it',
    studentName: 'Eleve IT',
    mode: 'EXPLAIN',
    prompt: 'Explique-moi les nombres complexes',
    levelStage: 'LYCEE',
  });
  push(
    'AI-05',
    'Tutor EXPLAIN degrades to TEMPLATE when the LLM is unavailable',
    fallback.generation.source === 'TEMPLATE' && fallback.message.content.length > 0,
    `source=${fallback.generation.source} contentLength=${fallback.message.content.length}`,
  );

  // AI-06: INPDP sanitization removes email/phone/CIN before ingestion.
  const san = sanitizePromptForInpdp('Contact: ali@tuniedu.tn, tel +21620123456, CIN 09123456');
  push(
    'AI-06',
    'INPDP sanitization redacts email, phone and national ID',
    san.piiRedacted && !san.sanitizedText.includes('ali@tuniedu.tn') && san.redactedTypes.length >= 2,
    `types=${san.redactedTypes.join(',')} text="${san.sanitizedText}"`,
  );

  // AI-07: curriculum integrity flags out-of-syllabus methods.
  const integrity = checkCurriculumIntegrity("On applique la règle de l'Hôpital pour lever l'indétermination", 'LYCEE');
  push(
    'AI-07',
    'Curriculum integrity flags out-of-syllabus methods for teacher review',
    integrity.requiresTeacherReview === true && !!integrity.warning,
    `requiresReview=${integrity.requiresTeacherReview} warning="${integrity.warning ?? ''}"`,
  );

  return results;
}

if (require.main === module) {
  (async () => {
    try {
      const results = await run();
      console.log('===========================================================');
      console.log('  TUNIEDU AI PROVIDER & TUTOR TESTS');
      console.log('===========================================================');
      let allPassed = true;
      for (const r of results) {
        console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
        console.log(`        -> ${r.details}`);
        if (!r.passed) allPassed = false;
      }
      console.log('-----------------------------------------------------------');
      console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
      if (!allPassed) { console.error('AI TESTS FAILED'); process.exit(1); }
      console.log('ALL AI TESTS PASSED');
    } catch (err) {
      console.error('AI TEST SUITE ERROR:', err instanceof Error ? err.message : err);
      process.exit(1);
    } finally {
      globalThis.fetch = realFetch;
      if (savedKey !== undefined) process.env.OPENROUTER_API_KEY = savedKey;
      else delete process.env.OPENROUTER_API_KEY;
    }
  })();
}
