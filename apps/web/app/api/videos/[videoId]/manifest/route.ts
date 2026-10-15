// =============================================================================
// TuniEdu HLS Master Playlist Delivery: GET /api/videos/[videoId]/manifest?token=...
// SEC-19: Validates 15-minute token before serving dynamic adaptive bitrate HLS playlist
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyMediaToken } from '@/lib/media-token';
import { fetchHlsObject, rewriteHlsPlaylist } from '@/lib/hls';
import { store } from '@/lib/store';
import { getVideoRecord } from '@/lib/media-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Token HLS requis', { status: 401 });
  }

  // Cryptographic token verification (SEC-19)
  const payload = verifyMediaToken(token);
  if (!payload || payload.resourceId !== videoId) {
    return new NextResponse('Token HLS invalide ou expiré', { status: 403 });
  }

  const video = store.getVideo(videoId) ?? (await getVideoRecord(videoId));
  if (!video) {
    return new NextResponse('Vidéo introuvable', { status: 404 });
  }

  // Prefer the real transcode ladder produced by workers/video-transcoding and
  // stored in MinIO (`hls/<videoId>/master.m3u8`). Rewrite its variant URIs to
  // the token-gated delivery route. Falls back to the dev template when the
  // object has not been uploaded yet or storage is not configured.
  const master = await fetchHlsObject(videoId, 'master.m3u8');
  if (master) {
    const rewritten = rewriteHlsPlaylist(master.toString('utf8'), { videoId, token, baseDir: '' });
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-store, private',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Generate HLS Master Playlist (Adaptive Bitrate: 1080p, 720p, 480p, 360p)
  // In production, segments are delivered with signed query parameters
  const manifest = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-INDEPENDENT-SEGMENTS

# 1080p Full HD (4.5 Mbps)
#EXT-X-STREAM-INF:BANDWIDTH=4500000,AVERAGE-BANDWIDTH=4200000,RESOLUTION=1920x1080,FRAME-RATE=30.000,CODECS="avc1.640028,mp4a.40.2"
/api/videos/${videoId}/hls/1080p/index.m3u8?token=${token}

# 720p HD (2.5 Mbps)
#EXT-X-STREAM-INF:BANDWIDTH=2500000,AVERAGE-BANDWIDTH=2300000,RESOLUTION=1280x720,FRAME-RATE=30.000,CODECS="avc1.4d401f,mp4a.40.2"
/api/videos/${videoId}/hls/720p/index.m3u8?token=${token}

# 480p SD (1.2 Mbps)
#EXT-X-STREAM-INF:BANDWIDTH=1200000,AVERAGE-BANDWIDTH=1100000,RESOLUTION=854x480,FRAME-RATE=30.000,CODECS="avc1.4d401f,mp4a.40.2"
/api/videos/${videoId}/hls/480p/index.m3u8?token=${token}

# 360p Data Saver (600 Kbps - optimized for Tunisian 3G/4G mobile networks)
#EXT-X-STREAM-INF:BANDWIDTH=600000,AVERAGE-BANDWIDTH=550000,RESOLUTION=640x360,FRAME-RATE=30.000,CODECS="avc1.42e01e,mp4a.40.2"
/api/videos/${videoId}/hls/360p/index.m3u8?token=${token}
`;

  return new NextResponse(manifest, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.apple.mpegurl',
      'Cache-Control': 'no-store, private',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
