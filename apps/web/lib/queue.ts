// =============================================================================
// TuniEdu Queue Producers (BullMQ over Redis)
// Enqueue background work (video transcode, book PDF processing) for the worker
// processes started via `npm run worker:start`.
// Fails SOFT: returns null when REDIS_URL is absent or Redis is unreachable.
// =============================================================================

import { Queue, type JobsOptions } from 'bullmq';
import Redis from 'ioredis';

export const QUEUE_VIDEO_TRANSCODE = 'video-transcode';
export const QUEUE_BOOK_PDF = 'book-pdf';
export const QUEUE_NOTIFICATIONS = 'notifications';

let connection: Redis | null = null;

function getConnection(): Redis | null {
  if (!process.env.REDIS_URL) return null;
  if (!connection) {
    connection = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: null });
    connection.on('error', () => {
      // Swallow connection errors; callers fall back gracefully.
    });
  }
  return connection;
}

let videoQueue: Queue | null = null;
let bookQueue: Queue | null = null;
let notificationQueue: Queue | null = null;

export function isQueueConfigured(): boolean {
  return Boolean(process.env.REDIS_URL);
}

export function getVideoTranscodeQueue(): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  if (!videoQueue) videoQueue = new Queue(QUEUE_VIDEO_TRANSCODE, { connection: conn });
  return videoQueue;
}

export function getBookPdfQueue(): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  if (!bookQueue) bookQueue = new Queue(QUEUE_BOOK_PDF, { connection: conn });
  return bookQueue;
}

export function getNotificationQueue(): Queue | null {
  const conn = getConnection();
  if (!conn) return null;
  if (!notificationQueue) notificationQueue = new Queue(QUEUE_NOTIFICATIONS, { connection: conn });
  return notificationQueue;
}

export interface VideoTranscodeJobData {
  videoId: string;
  sourceObjectKey: string;
  title: string;
  professorId: string;
  watermarkTemplate?: string;
}

export interface BookPdfJobData {
  bookId: string;
  versionNumber: number;
  originalObjectKey: string;
  fileName: string;
}

export async function enqueueVideoTranscode(
  data: VideoTranscodeJobData,
  opts?: JobsOptions,
): Promise<string | null> {
  const queue = getVideoTranscodeQueue();
  if (!queue) return null;
  try {
    const job = await queue.add('transcode', data, {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 2,
      ...opts,
    });
    return job.id ?? null;
  } catch (err) {
    console.error('[queue] enqueueVideoTranscode failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function enqueueBookPdf(
  data: BookPdfJobData,
  opts?: JobsOptions,
): Promise<string | null> {
  const queue = getBookPdfQueue();
  if (!queue) return null;
  try {
    const job = await queue.add('process-pdf', data, {
      removeOnComplete: 100,
      removeOnFail: 500,
      attempts: 2,
      ...opts,
    });
    return job.id ?? null;
  } catch (err) {
    console.error('[queue] enqueueBookPdf failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export interface NotificationJobData {
  channel: 'email' | 'sms';
  to: string;
  subject?: string;
  text: string;
  html?: string;
}

export async function enqueueNotification(
  data: NotificationJobData,
  opts?: JobsOptions,
): Promise<string | null> {
  const queue = getNotificationQueue();
  if (!queue) return null;
  try {
    const job = await queue.add('notify', data, {
      removeOnComplete: 500,
      removeOnFail: 1000,
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
      ...opts,
    });
    return job.id ?? null;
  } catch (err) {
    console.error('[queue] enqueueNotification failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
