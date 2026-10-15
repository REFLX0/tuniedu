// =============================================================================
// TuniEdu Object Storage Adapter (S3-compatible: MinIO in dev, S3 in prod)
// Centralises bucket management, presigned upload/download URLs and object I/O.
// Fails SOFT: returns null/false when storage is not configured so callers can
// degrade without crashing.
//
// Configuration (see .env.example):
//   S3_ENDPOINT, S3_ACCESS_KEY, S3_SECRET_KEY, S3_REGION, S3_BUCKET_*
// =============================================================================

import {
  S3Client,
  HeadBucketCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface BucketNames {
  manuscripts: string;
  boards: string;
  videos: string;
  replays: string;
}

export function getBucketNames(): BucketNames {
  return {
    manuscripts: process.env.S3_BUCKET_MANUSCRIPTS || 'tuniedu-manuscripts-raw',
    boards: process.env.S3_BUCKET_BOARDS || 'tuniedu-boards-rendered',
    videos: process.env.S3_BUCKET_VIDEOS || 'tuniedu-videos-hls',
    replays: process.env.S3_BUCKET_REPLAYS || 'tuniedu-live-replays',
  };
}

export function isStorageConfigured(): boolean {
  return Boolean(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
}

let cachedClient: S3Client | null = null;

export function getS3Client(): S3Client | null {
  if (!isStorageConfigured()) return null;
  if (!cachedClient) {
    cachedClient = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY as string,
        secretAccessKey: process.env.S3_SECRET_KEY as string,
      },
      forcePathStyle: true, // required for MinIO
    });
  }
  return cachedClient;
}

/** Creates the bucket if it does not already exist. Returns true on success. */
export async function ensureBucket(bucket: string): Promise<boolean> {
  const s3 = getS3Client();
  if (!s3) return false;
  try {
    await s3.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch {
    try {
      await s3.send(new CreateBucketCommand({ Bucket: bucket }));
      return true;
    } catch (err) {
      console.error(`[storage] ensureBucket(${bucket}) failed:`, err instanceof Error ? err.message : err);
      return false;
    }
  }
}

export async function putObject(
  bucket: string,
  key: string,
  body: Buffer | string,
  contentType = 'application/octet-stream',
): Promise<boolean> {
  const s3 = getS3Client();
  if (!s3) return false;
  try {
    await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }));
    return true;
  } catch (err) {
    console.error('[storage] putObject failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

export async function objectExists(bucket: string, key: string): Promise<boolean> {
  const s3 = getS3Client();
  if (!s3) return false;
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function getObjectBuffer(bucket: string, key: string): Promise<Buffer | null> {
  const s3 = getS3Client();
  if (!s3) return null;
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!res.Body) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    console.error('[storage] getObject failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function createPresignedPutUrl(
  bucket: string,
  key: string,
  contentType = 'application/octet-stream',
  expiresInSeconds = 900,
): Promise<string | null> {
  const s3 = getS3Client();
  if (!s3) return null;
  try {
    return await getSignedUrl(
      s3,
      new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
      { expiresIn: expiresInSeconds },
    );
  } catch (err) {
    console.error('[storage] presignPut failed:', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function createPresignedGetUrl(
  bucket: string,
  key: string,
  expiresInSeconds = 900,
): Promise<string | null> {
  const s3 = getS3Client();
  if (!s3) return null;
  try {
    return await getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), {
      expiresIn: expiresInSeconds,
    });
  } catch (err) {
    console.error('[storage] presignGet failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
