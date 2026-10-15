// =============================================================================
// TuniEdu Video Stream Token API: GET /api/videos/[videoId]/token
// SEC-02, SEC-19, SEC-20: Verifies entitlement and issues signed 15-minute HLS token
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { generateMediaToken, generateVideoWatermark } from '@/lib/media-token';
import { getVideoRecord } from '@/lib/media-service';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;
    const video = store.getVideo(videoId) ?? (await getVideoRecord(videoId));

    if (!video) {
      return NextResponse.json({ error: 'Vidéo pédagogique introuvable.' }, { status: 404 });
    }

    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const userId = auth.user.id;
    const user = store.users.find((u) => u.id === userId);

    if (!user) {
      return NextResponse.json({ error: 'Authentification requise pour visionner la vidéo.' }, { status: 401 });
    }

    // Access Check: Either free preview, or student has active entitlement for this book, or user is professor/admin
    const hasEntitlement = store.hasActiveEntitlement(userId, video.bookId);
    const isOwner = user.professorProfile?.id === video.professorId || user.roles.includes('ADMIN');

    if (!video.isFreePreview && !hasEntitlement && !isOwner) {
      return NextResponse.json(
        {
          error: 'Accès réservé aux élèves ayant acheté le cours ou le trimestre correspondant.',
          code: 'ENTITLEMENT_REQUIRED',
          bookId: video.bookId,
        },
        { status: 403 }
      );
    }

    // Issue signed 15-minute token (SEC-19)
    const token = generateMediaToken(userId, video.id, 'VIDEO');
    const watermark = generateVideoWatermark(userId, user.email);

    return NextResponse.json({
      success: true,
      videoId: video.id,
      title: video.title,
      token,
      watermark,
      manifestUrl: `/api/videos/${video.id}/manifest?token=${token}`,
      expiresInSeconds: 900, // 15 min TTL
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : '') || 'Erreur génération token vidéo' }, { status: 500 });
  }
}
