// =============================================================================
// TuniEdu Video Catalog API: GET /api/videos?bookId=xxx&professorId=yyy
// Merges the durable Postgres video records with the in-memory catalog seeds
// (deduped by id) and annotates each with the caller's entitlement status.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store, type VideoContent } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { listVideoRecords } from '@/lib/media-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const bookId = searchParams.get('bookId');
  const professorId = searchParams.get('professorId');

  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;
  const userId = auth.user.id;

  const seeded = bookId ? store.getVideosForBook(bookId) : store.videos;
  const durable = await listVideoRecords({
    bookId: bookId ?? undefined,
    professorId: professorId ?? undefined,
  }).catch(() => []);

  const byId = new Map<string, VideoContent>();
  for (const v of seeded) byId.set(v.id, v);
  for (const v of durable) byId.set(v.id, v);
  let videos = [...byId.values()];
  if (professorId) videos = videos.filter((v) => v.professorId === professorId);

  const annotatedVideos = videos.map((v) => {
    const isEntitled = store.hasActiveEntitlement(userId, v.bookId);
    return {
      ...v,
      isAccessible: v.isFreePreview || isEntitled,
      entitlementRequired: !v.isFreePreview && !isEntitled,
    };
  });

  return NextResponse.json({
    videos: annotatedVideos,
    count: annotatedVideos.length,
  });
}
