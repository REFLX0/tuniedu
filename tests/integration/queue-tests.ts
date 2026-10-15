// =============================================================================
// TuniEdu Queue Integration Tests — REAL BullMQ producers + consumer over Redis.
// Run: npx tsx tests/integration/queue-tests.ts
//
// SAFETY: opt-in via TUNIEDU_ALLOW_INFRA_TESTS=1. Uses the real Redis on
// REDIS_URL. Jobs are removed on completion.
// =============================================================================

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import {
  enqueueVideoTranscode,
  getVideoTranscodeQueue,
  isQueueConfigured,
  QUEUE_VIDEO_TRANSCODE,
  type VideoTranscodeJobData,
} from '../../apps/web/lib/queue';
import { transcodeVideoWorker } from '../../workers/video-transcoding';

interface TestResult {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

function loadEnv(): void {
  const here = dirname(fileURLToPath(import.meta.url));
  const envPath = resolve(here, '../../.env');
  try {
    for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"]*)"?\s*(?:#.*)?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
    }
  } catch {
    // .env optional
  }
}

function waitForCompleted(
  worker: Worker<VideoTranscodeJob, unknown>,
  jobId: string,
  timeoutMs = 15000,
): Promise<{ ok: boolean; result?: unknown }> {
  return new Promise((resolvePromise) => {
    const timer = setTimeout(() => {
      cleanup();
      resolvePromise({ ok: false });
    }, timeoutMs);
    const onCompleted = (job: Job<VideoTranscodeJob>, result: unknown) => {
      if (job.id === jobId) { cleanup(); resolvePromise({ ok: true, result }); }
    };
    const onFailed = (job: Job<VideoTranscodeJob> | undefined) => {
      if (job?.id === jobId) { cleanup(); resolvePromise({ ok: false }); }
    };
    function cleanup() {
      clearTimeout(timer);
      worker.off('completed', onCompleted);
      worker.off('failed', onFailed);
    }
    worker.on('completed', onCompleted);
    worker.on('failed', onFailed);
  });
}

async function run(): Promise<TestResult[]> {
  if (process.env.TUNIEDU_ALLOW_INFRA_TESTS !== '1') {
    throw new Error('Refus: definissez TUNIEDU_ALLOW_INFRA_TESTS=1 (Redis requis).');
  }

  const results: TestResult[] = [];
  const push = (id: string, name: string, passed: boolean, details: string) =>
    results.push({ id, name, passed, details });

  push('Q-01', 'Queue configured (REDIS_URL present)', isQueueConfigured() && !!getVideoTranscodeQueue(), `configured=${isQueueConfigured()}`);

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
  const worker = new Worker<VideoTranscodeJob>(
    QUEUE_VIDEO_TRANSCODE,
    async (job: Job<VideoTranscodeJob>) => {
      const result = await transcodeVideoWorker(job.data);
      if (!result.success) throw new Error(result.error || 'transcode failed');
      return result;
    },
    { connection: new Redis(redisUrl, { maxRetriesPerRequest: null }), concurrency: 1 },
  );

  await worker.waitUntilReady();

  const data: VideoTranscodeJobData = {
    videoId: `it_video_${Date.now()}`,
    sourceObjectKey: `videos/it/source.mp4`,
    title: 'Integration Test Lesson',
    professorId: 'prof_it',
  };

  const jobId = await enqueueVideoTranscode(data, { jobId: `it-${Date.now()}`, removeOnComplete: true });
  push('Q-02', 'enqueueVideoTranscode returns a job id', typeof jobId === 'string' && jobId.length > 0, `jobId=${jobId}`);

  const outcome = jobId ? await waitForCompleted(worker, jobId as string) : { ok: false };
  const result = outcome.result as { success?: boolean; videoId?: string; masterPlaylistPath?: string } | undefined;
  push(
    'Q-03',
    'Worker processes the job end-to-end (Redis → consume → result)',
    outcome.ok && result?.success === true && result?.videoId === data.videoId,
    `ok=${outcome.ok} success=${result?.success} videoId=${result?.videoId} master=${result?.masterPlaylistPath}`,
  );

  await worker.close();
  return results;
}

if (require.main === module) {
  loadEnv();
  (async () => {
    try {
      const results = await run();
      console.log('===========================================================');
      console.log('  TUNIEDU QUEUE INTEGRATION TESTS (BullMQ + Redis)');
      console.log('===========================================================');
      let allPassed = true;
      for (const r of results) {
        console.log(`[${r.passed ? 'PASS' : 'FAIL'}] ${r.id}: ${r.name}`);
        console.log(`        -> ${r.details}`);
        if (!r.passed) allPassed = false;
      }
      console.log('-----------------------------------------------------------');
      console.log(`${results.filter((r) => r.passed).length}/${results.length} passed`);
      if (!allPassed) { console.error('QUEUE TESTS FAILED'); process.exit(1); }
      console.log('ALL QUEUE TESTS PASSED');
      process.exit(0);
    } catch (err) {
      console.error('QUEUE TEST SUITE ERROR:', err instanceof Error ? err.message : err);
      process.exit(1);
    }
  })();
}
