// =============================================================================
// TuniEdu HLS Segment/Variant Delivery:
//   GET /api/videos/[videoId]/hls/[...path]?token=...
// SEC-19: validates the same short-lived signed token as the master manifest,
// then streams the real playlist/segment from the videos bucket. Playlists are
// rewritten so variant and segment URIs stay behind this token gate.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { verifyMediaToken } from '@/lib/media-token';
import { contentTypeForHls, fetchHlsObject, rewriteHlsPlaylist } from '@/lib/hls';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string; path: string[] }> }
) {
  const { videoId, path: rawPath } = await params;
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');

  if (!token) {
    return new NextResponse('Token HLS requis', { status: 401 });
  }

  const payload = verifyMediaToken(token);
  if (!payload || payload.resourceId !== videoId) {
    return new NextResponse('Token HLS invalide ou expiré', { status: 403 });
  }

  // Defend against traversal: drop empty/dot segments from the requested path.
  const segments = (rawPath || []).filter((part) => part.length > 0 && part !== '.' && part !== '..');
  if (segments.length === 0) {
    return new NextResponse('Chemin HLS invalide', { status: 400 });
  }

  const subPath = segments.join('/');
  const buffer = await fetchHlsObject(videoId, subPath);
  if (!buffer) {
    return new NextResponse('Segment HLS introuvable', { status: 404 });
  }

  const contentType = contentTypeForHls(subPath);

  if (subPath.endsWith('.m3u8')) {
    const baseDir = segments.slice(0, -1).join('/');
    const rewritten = rewriteHlsPlaylist(buffer.toString('utf8'), { videoId, token, baseDir });
    return new NextResponse(rewritten, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, private',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
