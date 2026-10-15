// =============================================================================
// TuniEdu Single Live Session API: GET /api/lives/[liveId]
// Returns the durable Postgres record when present, otherwise the seeded
// in-memory catalog entry, annotated with the caller's access status.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { getLiveRecord } from '@/lib/media-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  const { liveId } = await params;

  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;
  const userId = auth.user.id;

  const live = store.getLiveSession(liveId) ?? (await getLiveRecord(liveId));
  if (!live) {
    return NextResponse.json({ error: 'Session live introuvable.' }, { status: 404 });
  }

  const hasTrimesterAccess = store.hasActiveEntitlement(userId, live.bookId);
  return NextResponse.json({
    session: {
      ...live,
      isUnlockedForUser: live.isFreeForTrimesterStudents && hasTrimesterAccess,
    },
  });
}
