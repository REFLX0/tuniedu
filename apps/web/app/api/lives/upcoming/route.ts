// =============================================================================
// TuniEdu Live Streaming API: GET /api/lives/upcoming?professorId=xxx&bookId=yyy
// Merges durable Postgres live sessions with the in-memory catalog seeds
// (deduped by id) and annotates each with the caller's access status.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store, type LiveSession } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { listLiveRecords } from '@/lib/media-service';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const professorId = searchParams.get('professorId');
  const bookId = searchParams.get('bookId');

  const auth = await requireApiSession(req);
  if (auth.errorResponse) return auth.errorResponse;
  const userId = auth.user.id;

  let seeded = store.getLiveSessions();
  if (professorId) seeded = seeded.filter((l) => l.professorId === professorId);
  if (bookId) seeded = seeded.filter((l) => l.bookId === bookId);

  const durable = await listLiveRecords({
    professorId: professorId ?? undefined,
    bookId: bookId ?? undefined,
  }).catch(() => []);

  const byId = new Map<string, LiveSession>();
  for (const l of seeded) byId.set(l.id, l);
  for (const l of durable) byId.set(l.id, l);
  const lives = [...byId.values()].map((live) => {
    const hasTrimesterAccess = store.hasActiveEntitlement(userId, live.bookId);
    return {
      ...live,
      isUnlockedForUser: live.isFreeForTrimesterStudents && hasTrimesterAccess,
    };
  });

  return NextResponse.json({
    sessions: lives,
    activeLiveCount: lives.filter((s) => s.status === 'LIVE').length,
    scheduledCount: lives.filter((s) => s.status === 'SCHEDULED').length,
  });
}
