// =============================================================================
// TuniEdu Live Streaming API: POST /api/lives/[liveId]/end
// Ends live session and queues automated VOD replay archive pipeline
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { stopRoomRecording, isEgressConfigured } from '@/lib/livekit';
import { getLiveRecord, endLiveRecord, setLiveEgress } from '@/lib/media-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  try {
    const { liveId } = await params;
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);

    if (!user || (!user.roles.includes('PROFESSOR') && !user.roles.includes('ADMIN'))) {
      return NextResponse.json({ error: 'Autorisation refusée.' }, { status: 403 });
    }

    const live = store.getLiveSession(liveId) ?? (await getLiveRecord(liveId));
    if (!live) {
      return NextResponse.json({ error: 'Session live introuvable.' }, { status: 404 });
    }

    const isLiveOwner =
      user.roles.includes('ADMIN') ||
      Boolean(user.professorProfile?.id && user.professorProfile.id === live.professorId) ||
      user.id === live.professorId;
    if (!isLiveOwner) {
      return NextResponse.json(
        { error: 'Seul l\'enseignant responsable ou un administrateur peut clôturer cette session live.' },
        { status: 403 }
      );
    }

    // Stop LiveKit egress recording if it's running (best-effort).
    const record = await getLiveRecord(liveId);
    if (isEgressConfigured() && record?.egressId) {
      await stopRoomRecording(record.egressId);
      await setLiveEgress(liveId, { recordingStatus: 'ENDING' });
    }

    // Mark session as ENDED. If the egress completed earlier, the webhook will
    // have already attached a replayVideoId; otherwise we just end it now.
    const updatedStore = store.endLiveSession(liveId, undefined as unknown as string);
    const updated = (await endLiveRecord(liveId)) || updatedStore;

    return NextResponse.json({
      success: true,
      liveSession: updated,
      message: 'Session live terminée. L’enregistrement VOD sera traité automatiquement si disponible.',
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : '') || 'Erreur clôture live' }, { status: 500 });
  }
}
