// =============================================================================
// TuniEdu Live Streaming API: POST /api/lives/[liveId]/start
// Transitions live session state to LIVE
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { ensureLiveRoom, startRoomRecording, isEgressConfigured } from '@/lib/livekit';
import { dispatchEmail, dispatchSms } from '@/lib/notification-dispatch';
import { getLiveRecord, startLiveRecord, setLiveEgress } from '@/lib/media-service';

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
        { error: 'Seul l\'enseignant responsable ou un administrateur peut démarrer cette session live.' },
        { status: 403 }
      );
    }

    const updatedStore = store.startLiveSession(liveId);
    const updated = (await startLiveRecord(liveId)) || updatedStore;
    const roomName = `live_${liveId}`;
    const roomReady = await ensureLiveRoom(roomName);

    // Kick off LiveKit egress room-composite recording (MP4 → videos bucket).
    // We record to `replays/${liveId}/live.m4a/mp4` depending on LiveKit; we use
    // `replays/${liveId}/live` and let the recorder write .mp4 by default.
    let egressId: string | null = null;
    if (isEgressConfigured()) {
      const rec = await startRoomRecording(roomName, `replays/${liveId}/live.mp4`);
      egressId = rec?.egressId ?? null;
      if (egressId) {
        await setLiveEgress(liveId, { egressId, recordingStatus: 'STARTING' });
      }
    }

    // Notify the professor that the session is now on air (best-effort; the
    // queue-backed dispatcher decouples delivery and retries on failure).
    await Promise.allSettled([
      dispatchEmail({
        to: user.email,
        subject: `Votre direct « ${live.title} » est en ligne`,
        text: `Bonjour ${user.name},\n\nVotre session « ${live.title} » est maintenant EN DIRECT sur TuniEdu.\nSFU: ${roomReady ? 'prêt' : 'indisponible (mode démo)'}.\n\nL'équipe TuniEdu`,
      }),
      dispatchSms({
        to: user.phone || user.email,
        text: `TuniEdu: votre direct « ${live.title} » est en ligne.`,
      }),
    ]);

    return NextResponse.json({
      success: true,
      liveSession: updated,
      roomReady,
      message: 'La session est maintenant EN DIRECT.',
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : '') || 'Erreur démarrage live' }, { status: 500 });
  }
}
