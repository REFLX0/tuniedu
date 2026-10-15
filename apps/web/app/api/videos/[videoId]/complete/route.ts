// =============================================================================
// TuniEdu Video Upload Completion API: POST /api/videos/[videoId]/complete
// Called by the client AFTER the raw bytes have been uploaded to the presigned
// object-storage URL. Verifies the source object exists, flips the record to
// PROCESSING and enqueues the durable HLS transcode job.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { getBucketNames, isStorageConfigured, objectExists } from '@/lib/storage';
import { getVideoRecord, getVideoSourceKey, markVideoProcessing } from '@/lib/media-service';
import { enqueueVideoTranscode } from '@/lib/queue';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ videoId: string }> }
) {
  try {
    const { videoId } = await params;

    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);
    if (!user) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    const video = await getVideoRecord(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Vidéo introuvable.' }, { status: 404 });
    }

    const isOwner =
      user.roles.includes('ADMIN') || user.professorProfile?.id === video.professorId;
    if (!isOwner) {
      return NextResponse.json(
        { error: 'Vous n’êtes pas autorisé à finaliser cette vidéo.' },
        { status: 403 }
      );
    }

    // Already processing/ready: idempotent success.
    if (video.status === 'PROCESSING' || video.status === 'READY') {
      return NextResponse.json({ success: true, video, alreadyFinalized: true });
    }

    const sourceObjectKey = await getVideoSourceKey(videoId);
    if (!sourceObjectKey) {
      return NextResponse.json({ error: 'Clé source manquante pour cette vidéo.' }, { status: 409 });
    }

    // The transcoder reads the source from the videos bucket, so the object must
    // already be there. If storage is configured but the object is missing, the
    // client upload has not landed (or failed) — refuse to enqueue a doomed job.
    if (isStorageConfigured()) {
      const exists = await objectExists(getBucketNames().videos, sourceObjectKey);
      if (!exists) {
        return NextResponse.json(
          { error: 'Le fichier vidéo n’a pas été téléversé. Relancez l’envoi.' },
          { status: 409 }
        );
      }
    }

    await markVideoProcessing(videoId);

    const jobId = await enqueueVideoTranscode({
      videoId,
      sourceObjectKey,
      title: video.title,
      professorId: video.professorId,
    });

    const updated = await getVideoRecord(videoId);
    return NextResponse.json({
      success: true,
      video: updated,
      jobId,
      queued: Boolean(jobId),
      message: jobId
        ? 'Transcodage HLS en file d’attente.'
        : 'Transcodage non planifié (file d’attente indisponible).',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : '') || 'Erreur finalisation vidéo' },
      { status: 500 }
    );
  }
}
