// =============================================================================
// TuniEdu Live Room Token API: GET /api/lives/[liveId]/token
// SEC-02, SEC-19, SEC-20, SEC-24: Verifies access and issues LiveKit/WebRTC room token
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { generateMediaToken, generateVideoWatermark } from '@/lib/media-token';
import { createLiveRoomToken, getLiveKitUrl, isLiveKitConfigured } from '@/lib/livekit';
import {
  getLiveRecord,
  joinLiveParticipant,
  countLiveParticipants,
  updateLiveCounts,
} from '@/lib/media-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ liveId: string }> }
) {
  try {
    const { liveId } = await params;
    const live = store.getLiveSession(liveId) ?? (await getLiveRecord(liveId));

    if (!live) {
      return NextResponse.json({ error: 'Session live introuvable.' }, { status: 404 });
    }

    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const userId = auth.user.id;
    const user = store.users.find((u) => u.id === userId);

    if (!user) {
      return NextResponse.json({ error: 'Authentification requise pour rejoindre le direct.' }, { status: 401 });
    }

    // Role detection: is broadcaster (professor/admin) or student viewer?
    const isBroadcaster = user.roles.includes('PROFESSOR') || user.roles.includes('ADMIN');
    const hasTrimesterAccess = store.hasActiveEntitlement(userId, live.bookId);

    if (!isBroadcaster && !hasTrimesterAccess) {
      return NextResponse.json(
        {
          error: 'Accès réservé aux élèves inscrits au trimestre ou munis d’un billet d’accès.',
          code: 'ENTITLEMENT_REQUIRED',
          priceMillimes: live.priceMillimes,
        },
        { status: 403 }
      );
    }

    // Issue a real LiveKit room-join JWT when the SFU is configured; otherwise
    // fall back to the signed media token (local dev without an SFU).
    const roomName = `live_${live.id}`;
    const livekitToken = await createLiveRoomToken({
      roomName,
      identity: userId,
      name: user.name,
      canPublish: isBroadcaster,
      canSubscribe: true,
    });
    const token = livekitToken || generateMediaToken(userId, live.id, 'LIVE');
    const watermark = generateVideoWatermark(userId, user.email);

    // Record presence for LIVE sessions so the roster reflects real attendees.
    let viewerCount = live.viewerCount;
    if (live.status === 'LIVE') {
      await joinLiveParticipant({ liveSessionId: live.id, userId });
      const count = await countLiveParticipants(live.id);
      await updateLiveCounts(live.id, { viewerCount: count, currentParticipants: count });
      viewerCount = count;
    }

    return NextResponse.json({
      success: true,
      roomName,
      participantName: user.name,
      participantRole: isBroadcaster ? 'BROADCASTER' : 'VIEWER',
      token,
      tokenType: livekitToken ? 'LIVEKIT' : 'MEDIA_FALLBACK',
      livekitUrl: isLiveKitConfigured() ? getLiveKitUrl() : null,
      watermark,
      liveSession: {
        id: live.id,
        title: live.title,
        status: live.status,
        professorName: live.professorName,
        viewerCount,
        pinnedMessage: live.pinnedMessage,
      },
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : '') || 'Erreur token live' }, { status: 500 });
  }
}
