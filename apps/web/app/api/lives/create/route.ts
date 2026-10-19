// =============================================================================
// TuniEdu Live Streaming API: POST /api/lives/create
// SEC-09, SEC-10: Only verified professors can schedule live broadcast sessions
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { checkProfessorPublishPermission, checkProfessorBookOwnership } from '@/lib/authorization';
import { ensureBookMirror } from '@/lib/catalog-mirror';
import { createLiveRecord } from '@/lib/media-service';

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);

    if (!user || (!user.roles.includes('PROFESSOR') && !user.roles.includes('ADMIN'))) {
      return NextResponse.json({ error: 'Seuls les professeurs vérifiés peuvent créer des sessions live.' }, { status: 403 });
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
    const {
      bookId,
      title,
      titleAr,
      description,
      scheduledAt,
      estimatedDurationMinutes,
      priceMillimes,
      isFreeForTrimesterStudents,
    } = body;

    if (!title || typeof title !== 'string' || title.trim().length < 5) {
      return NextResponse.json({ error: 'Le titre du live doit comporter au moins 5 caractères.' }, { status: 400 });
    }

    if (!bookId || typeof bookId !== 'string') {
      return NextResponse.json({ error: 'Le cours associé est obligatoire.' }, { status: 400 });
    }

    const book = store.books.find((b) => b.id === bookId);
    if (!book) {
      return NextResponse.json({ error: 'Manuel associé introuvable.' }, { status: 404 });
    }

    const ownershipCheck = checkProfessorBookOwnership(
      {
        id: user.id,
        name: user.name,
        roles: user.roles as ('STUDENT' | 'PARENT' | 'PROFESSOR' | 'ADMIN')[],
        professorProfile: user.professorProfile
          ? { id: user.professorProfile.id, status: user.professorProfile.status }
          : null,
      },
      book.professorId
    );
    if (!ownershipCheck.allowed && !user.roles.includes('ADMIN')) {
      return NextResponse.json({ error: ownershipCheck.reason }, { status: ownershipCheck.code });
    }

    // Mirror the catalog book into Postgres so the LiveSession FK resolves.
    await ensureBookMirror(bookId);

    const liveSession = await createLiveRecord({
      bookId,
      professorId: user.professorProfile?.id || user.id,
      professorName: user.name,
      title: title.trim(),
      titleAr: titleAr?.trim() || undefined,
      description: description?.trim() || '',
      scheduledAt: scheduledAt || new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      estimatedDurationMinutes: parseInt(estimatedDurationMinutes, 10) || 60,
      priceMillimes: parseInt(priceMillimes, 10) || 10000,
      isFreeForTrimesterStudents: isFreeForTrimesterStudents !== false,
      subject: book.subjectNameFr,
      pinnedMessage: `Bienvenue à la séance en direct avec ${user.name} !`,
    });

    return NextResponse.json({
      success: true,
      liveSession,
      message: 'Session live programmée avec succès.',
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: (error instanceof Error ? error.message : '') || 'Erreur création live' }, { status: 500 });
  }
}
