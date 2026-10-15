// =============================================================================
// TuniEdu Background Worker Runner (BullMQ over the running Redis)
// Consumes the video-transcode and book-pdf queues. Start with:
//   npm run worker:start
// =============================================================================

import { Worker, type Job } from 'bullmq';
import Redis from 'ioredis';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { transcodeVideoWorker, type TranscodeVideoJob } from './video-transcoding';
import {
  processPdfWorker,
  renderPdfPagesToWebp,
  type ProcessPdfJob,
} from './book-processing';
import {
  ensureBucket,
  getBucketNames,
  getObjectBuffer,
  isStorageConfigured,
  putObject,
} from '../apps/web/lib/storage';
import { markVideoFailed, markVideoReady } from '../apps/web/lib/media-service';
import { sendEmail, sendSms } from '../apps/web/lib/notifications';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function newConnection(): Redis {
  return new Redis(REDIS_URL, { maxRetriesPerRequest: null });
}

function contentTypeFor(file: string): string {
  if (file.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (file.endsWith('.ts')) return 'video/mp2t';
  if (file.endsWith('.mp4')) return 'video/mp4';
  if (file.endsWith('.webp')) return 'image/webp';
  if (file.endsWith('.json')) return 'application/json';
  return 'application/octet-stream';
}

/** Recursively uploads a local directory to a bucket prefix. */
async function uploadDir(bucket: string, prefix: string, localDir: string): Promise<number> {
  let count = 0;
  const walk = async (dir: string, rel: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await walk(abs, relPath);
      } else {
        const body = fs.readFileSync(abs);
        const ok = await putObject(bucket, `${prefix}/${relPath}`, body, contentTypeFor(entry.name));
        if (ok) count += 1;
      }
    }
  };
  await walk(localDir, '');
  return count;
}

console.log(`[workers] connecting to ${REDIS_URL}`);

const videoWorker = new Worker<TranscodeVideoJob>(
  'video-transcode',
  async (job: Job<TranscodeVideoJob>) => {
    console.log(`[workers] video-transcode #${job.id} videoId=${job.data.videoId}`);

    // The producer enqueues only the object key; download the raw source from
    // the videos bucket so the transcoder can run a REAL ffmpeg HLS ladder.
    let fileBuffer = job.data.fileBuffer;
    if (!fileBuffer && job.data.sourceObjectKey && isStorageConfigured()) {
      const buffer = await getObjectBuffer(getBucketNames().videos, job.data.sourceObjectKey);
      if (buffer) fileBuffer = buffer;
    }

    const result = await transcodeVideoWorker({ ...job.data, fileBuffer });
    if (!result.success) {
      await markVideoFailed(job.data.videoId, result.error || 'transcode failed');
      throw new Error(result.error || 'transcode failed');
    }

    // A real ladder is mandatory in production: without ffmpeg / source bytes the
    // deterministic fallback would publish a video with no playable segments.
    if (!result.real || !result.localOutputDir) {
      const error = 'Transcodage réel impossible (ffmpeg indisponible ou source manquante).';
      await markVideoFailed(job.data.videoId, error);
      throw new Error(error);
    }

    let uploaded = 0;
    if (isStorageConfigured()) {
      const bucket = getBucketNames().videos;
      await ensureBucket(bucket);
      uploaded = await uploadDir(bucket, `hls/${job.data.videoId}`, result.localOutputDir);
      console.log(`[workers] uploaded ${uploaded} HLS objects for ${job.data.videoId}`);
    }
    fs.rmSync(result.localOutputDir, { recursive: true, force: true });

    // Persist the durable READY state + quality ladder.
    await markVideoReady(job.data.videoId, {
      durationSeconds: result.durationSeconds,
      hlsManifestKey: result.masterPlaylistPath,
      thumbnailKey: null,
      checksumSha256: result.checksumSha256,
      fileSize: fileBuffer?.length ?? null,
      qualities: result.qualities.map((q) => ({
        resolution: q.resolution,
        manifestKey: `hls/${job.data.videoId}/${q.playlistPath}`,
        bandwidthBps: q.bitrateKbps * 1000,
      })),
    });
    console.log(`[workers] video ${job.data.videoId} READY (${uploaded} objects)`);

    return { ...result, uploaded };
  },
  { connection: newConnection(), concurrency: 2 },
);

const bookWorker = new Worker<ProcessPdfJob>(
  'book-pdf',
  async (job: Job<ProcessPdfJob>) => {
    console.log(`[workers] book-pdf #${job.id} bookId=${job.data.bookId}`);

    // If the producer enqueued only an object key, download the raw manuscript.
    let fileBuffer = job.data.fileBuffer;
    if (!fileBuffer && job.data.originalObjectKey && isStorageConfigured()) {
      const buffer = await getObjectBuffer(getBucketNames().manuscripts, job.data.originalObjectKey);
      if (buffer) fileBuffer = buffer;
    }

    const result = await processPdfWorker({ ...job.data, fileBuffer });
    if (!result.success) throw new Error(result.error || 'pdf processing failed');

    // Rasterise pages to WebP and persist them to the boards bucket.
    if (fileBuffer && isStorageConfigured()) {
      try {
        const rendered = await renderPdfPagesToWebp(fileBuffer);
        const bucket = getBucketNames().boards;
        await ensureBucket(bucket);
        let uploaded = 0;
        for (const page of rendered.pages) {
          const key = `rendered/${job.data.bookId}/v${job.data.versionNumber}/page_${page.pageNumber}.webp`;
          if (await putObject(bucket, key, page.webp, 'image/webp')) uploaded += 1;
        }
        console.log(`[workers] uploaded ${uploaded}/${rendered.pages.length} rendered pages for ${job.data.bookId}`);
      } catch (err) {
        // Rasterisation is best-effort: metadata (page count) already succeeded.
        console.error(`[workers] rasterisation failed for ${job.data.bookId}:`, err instanceof Error ? err.message : err);
      }
    }

    return result;
  },
  { connection: newConnection(), concurrency: 2 },
);

interface NotificationJob {
  channel: 'email' | 'sms';
  to: string;
  subject?: string;
  text: string;
  html?: string;
}

const notificationWorker = new Worker<NotificationJob>(
  'notifications',
  async (job: Job<NotificationJob>) => {
    const d = job.data;
    console.log(`[workers] notifications #${job.id} channel=${d.channel} to=${d.to}`);
    const result =
      d.channel === 'email'
        ? await sendEmail({ to: d.to, subject: d.subject || 'TuniEdu', text: d.text, html: d.html })
        : await sendSms({ to: d.to, text: d.text });
    if (!result.delivered) throw new Error(result.error || 'notification delivery failed');
    return result;
  },
  { connection: newConnection(), concurrency: 5 },
);

for (const w of [videoWorker, bookWorker, notificationWorker]) {
  w.on('completed', (job) => console.log(`[workers] completed ${w.name} #${job.id}`));
  w.on('failed', (job, err) => console.error(`[workers] failed ${w.name} #${job?.id}: ${err.message}`));
  w.on('error', (err) => console.error(`[workers] ${w.name} error: ${err.message}`));
}

async function shutdown(): Promise<void> {
  console.log('[workers] shutting down...');
  await Promise.all([videoWorker.close(), bookWorker.close(), notificationWorker.close()]);
  process.exit(0);
}

process.on('SIGINT', () => { void shutdown(); });
process.on('SIGTERM', () => { void shutdown(); });

console.log('[workers] listening for jobs...');
