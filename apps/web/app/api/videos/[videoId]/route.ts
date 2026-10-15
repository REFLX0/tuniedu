// =============================================================================
// TuniEdu Single Video API: GET /api/videos/[videoId]
// Returns the durable Postgres record when present, otherwise the seeded
// in-memory catalog entry, annotated with the caller's entitlement status.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { getVideoRecord } from '@/lib/media-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  const { videoId } = await params;

  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;
  const userId = auth.user.id;

  const video = store.getVideo(videoId) ?? (await getVideoRecord(videoId));
  if (!video) {
    return NextResponse.json({ error: 'Vidéo pédagogique introuvable.' }, { status: 404 });
  }

  const isEntitled = store.hasActiveEntitlement(userId, video.bookId);
  return NextResponse.json({
    video: {
      ...video,
      isAccessible: video.isFreePreview || isEntitled,
      entitlementRequired: !video.isFreePreview && !isEntitled,
    },
  });
}
