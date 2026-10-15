// =============================================================================
// TuniEdu Live Leave API: POST /api/lives/[liveId]/leave
// Records participant departure and refreshes the live roster count.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import {
  getLiveRecord,
  leaveLiveParticipant,
  countLiveParticipants,
  updateLiveCounts,
} from '@/lib/media-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  try {
    const { liveId } = await params;
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const userId = auth.user.id;

    const live = store.getLiveSession(liveId) ?? (await getLiveRecord(liveId));
    if (!live) {
      return NextResponse.json({ error: 'Session live introuvable.' }, { status: 404 });
    }

    await leaveLiveParticipant({ liveSessionId: liveId, userId });
    const count = await countLiveParticipants(liveId);
    await updateLiveCounts(liveId, { viewerCount: count, currentParticipants: count });

    return NextResponse.json({ success: true, viewerCount: count });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : '') || 'Erreur sortie live' }, { status: 500 });
  }
}
