// =============================================================================
// TuniEdu HLS Delivery Helper
// Serves the real HLS ladder produced by workers/video-transcoding (stored in
// MinIO under `hls/<videoId>/...`) and rewrites playlist URIs so every variant
// and every segment is fetched through the token-gated delivery route.
// Fails SOFT (returns null) when storage is not configured or the object is
// absent, so the caller can degrade to the dev template.
// =============================================================================

import { getBucketNames, getObjectBuffer, isStorageConfigured } from './storage';

export function contentTypeForHls(key: string): string {
  if (key.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (key.endsWith('.ts')) return 'video/mp2t';
  if (key.endsWith('.m4s')) return 'video/iso.segment';
  if (key.endsWith('.mp4')) return 'video/mp4';
  return 'application/octet-stream';
}

/**
 * Rewrites a playlist so media URIs point back at the token-gated API route.
 * `baseDir` is the directory of the playlist being served ('' for the master).
 */
export function rewriteHlsPlaylist(
  content: string,
  opts: { videoId: string; token: string; baseDir: string },
): string {
  const { videoId, token, baseDir } = opts;
  const tokenQ = encodeURIComponent(token);

  return content
    .split(/\r?\n/)
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return line;
      // Absolute/external URIs are left untouched.
      if (/^[a-z]+:\/\//i.test(trimmed)) return line;

      const relative = baseDir ? `${baseDir}/${trimmed}` : trimmed;
      const safePath = relative
        .split('/')
        .filter((part) => part.length > 0 && part !== '.' && part !== '..')
        .map((part) => encodeURIComponent(part))
        .join('/');
      return `/api/videos/${videoId}/hls/${safePath}?token=${tokenQ}`;
    })
    .join('\n');
}

/** Fetches a single HLS object (playlist or segment) from the videos bucket. */
export async function fetchHlsObject(videoId: string, subPath: string): Promise<Buffer | null> {
  if (!isStorageConfigured()) return null;
  const bucket = getBucketNames().videos;
  const key = `hls/${videoId}/${subPath}`;
  return getObjectBuffer(bucket, key);
}
