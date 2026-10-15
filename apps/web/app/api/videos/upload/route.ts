// =============================================================================
// TuniEdu Professor Video Upload API: POST /api/videos/upload
// SEC-09, SEC-10: Only verified professors can upload video materials for their books
//
// Creates a durable VideoContent record (status QUEUED) and returns a presigned
// PUT URL. The client uploads the raw bytes directly to object storage, then
// calls POST /api/videos/[videoId]/complete to enqueue the HLS transcode.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { checkProfessorPublishPermission } from '@/lib/authorization';
import {
  createPresignedPutUrl,
  ensureBucket,
  getBucketNames,
  isStorageConfigured,
} from '@/lib/storage';
import { ensureBookMirror } from '@/lib/catalog-mirror';
import { createVideoRecord } from '@/lib/media-service';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);

    if (!user) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    // Role check: PROFESSOR or ADMIN, then VERIFIED publish permission (SEC-10)
    if (!user.roles.includes('PROFESSOR') && !user.roles.includes('ADMIN')) {
      return NextResponse.json(
        { error: 'Seuls les professeurs vérifiés peuvent uploader des vidéos.' },
        { status: 403 }
      );
    }
    const publishCheck = checkProfessorPublishPermission({
      id: user.id,
      name: user.name,
      roles: user.roles as ('STUDENT' | 'PARENT' | 'PROFESSOR' | 'ADMIN')[],
      professorProfile: user.professorProfile
        ? { id: user.professorProfile.id, status: user.professorProfile.status }
        : null,
    });
    if (!publishCheck.allowed && !user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: publishCheck.reason }, { status: publishCheck.code });
    }

    const body = await req.json();
    const { bookId, chapterId, title, titleAr, description, durationSeconds, isFreePreview } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 3) {
      return NextResponse.json({ error: 'Le titre de la vidéo doit comporter au moins 3 caractères.' }, { status: 400 });
    }

    if (!bookId || typeof bookId !== 'string') {
      return NextResponse.json({ error: 'Le manuel associé est obligatoire.' }, { status: 400 });
    }

    const book = store.books.find((b) => b.id === bookId);
    if (!book) {
      return NextResponse.json({ error: 'Manuel introuvable.' }, { status: 404 });
    }

    // Mirror the (in-memory) catalog book into Postgres so the VideoContent FK resolves.
    await ensureBookMirror(bookId);

    const { video, sourceObjectKey } = await createVideoRecord({
      bookId,
      chapterId: chapterId || undefined,
      professorId: user.professorProfile?.id || user.id,
      professorName: user.name,
      title: title.trim(),
      titleAr: titleAr?.trim() || undefined,
      description: description?.trim() || '',
      durationSeconds: parseInt(durationSeconds, 10) || undefined,
      isFreePreview: Boolean(isFreePreview),
    });

    // Presigned direct-to-storage upload URL (no byte proxying through the API).
    let uploadUrl: string | null = null;
    let storageKey: string | null = null;
    if (isStorageConfigured()) {
      const buckets = getBucketNames();
      await ensureBucket(buckets.videos);
      storageKey = sourceObjectKey;
      uploadUrl = await createPresignedPutUrl(buckets.videos, storageKey, 'video/mp4', 3600);
    }

    return NextResponse.json({
      success: true,
      video,
      uploadUrl,
      storageKey,
      message: 'Vidéo enregistrée. Téléversez le fichier puis lancez le transcodage HLS.',
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : '') || 'Erreur serveur upload vidéo' }, { status: 500 });
  }
}
