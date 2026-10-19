// =============================================================================
// TuniEdu Professor Book Upload API: POST /api/books/upload
// SEC-09, SEC-10, SEC-14: Verified professors upload a manuscript PDF; the file
// is stored in the manuscripts bucket and a book-pdf job is enqueued for the
// worker (`npm run worker:start`) to extract page count and rasterise pages.
// =============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { store } from '@/lib/store';
import { requireApiSession } from '@/lib/auth';
import { checkProfessorPublishPermission, checkProfessorBookOwnership } from '@/lib/authorization';
import { ensureBucket, getBucketNames, isStorageConfigured, putObject } from '@/lib/storage';
import { enqueueBookPdf } from '@/lib/queue';

const MAX_MANUSCRIPT_BYTES = 200 * 1024 * 1024; // 200 MB

function isPdf(buffer: Buffer): boolean {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() || 'manuscript.pdf';
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200);
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireApiSession(req);
    if (auth.errorResponse) return auth.errorResponse;
    const user = store.users.find((u) => u.id === auth.user.id);

    if (!user) {
      return NextResponse.json({ error: 'Authentification requise.' }, { status: 401 });
    }

    if (!user.roles.includes('PROFESSOR') && !user.roles.includes('ADMIN')) {
      return NextResponse.json(
        { error: 'Seuls les professeurs vérifiés peuvent uploader un manuel.' },
        { status: 403 },
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

    const form = await req.formData();
    const file = form.get('file');
    const bookId = String(form.get('bookId') || '');
    const versionNumber = parseInt(String(form.get('versionNumber') || '1'), 10) || 1;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Fichier PDF manquant.' }, { status: 400 });
    }
    if (!bookId) {
      return NextResponse.json({ error: 'Le manuel associé est obligatoire.' }, { status: 400 });
    }

    const book = store.books.find((b) => b.id === bookId);
    if (!book) {
      return NextResponse.json({ error: 'Manuel introuvable.' }, { status: 404 });
    }

    // Ownership check (SEC-09): Professor can only upload drafts for their own books, unless ADMIN
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

    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Fichier vide.' }, { status: 400 });
    }
    if (buffer.length > MAX_MANUSCRIPT_BYTES) {
      return NextResponse.json({ error: 'Fichier trop volumineux (max 200 Mo).' }, { status: 413 });
    }
    if (!isPdf(buffer)) {
      return NextResponse.json(
        { error: "Format invalide: le fichier n'est pas un PDF valide (signature manquante)." },
        { status: 400 },
      );
    }

    const fileName = sanitizeFileName(file.name || 'manuscript.pdf');
    const storageKey = `manuscripts/${bookId}/v${versionNumber}/${fileName}`;

    let stored = false;
    if (isStorageConfigured()) {
      const bucket = getBucketNames().manuscripts;
      await ensureBucket(bucket);
      stored = await putObject(bucket, storageKey, buffer, 'application/pdf');
    }

    // Mark the book as being processed while the worker runs.
    store.updateBook(bookId, { status: 'PROCESSING' });

    const jobId = await enqueueBookPdf({
      bookId,
      versionNumber,
      originalObjectKey: storageKey,
      fileName,
    });

    return NextResponse.json({
      success: true,
      bookId,
      versionNumber,
      stored,
      storageKey,
      jobId,
      message: stored
        ? 'Manuel reçu et envoyé au pipeline de traitement PDF.'
        : 'Manuel reçu; stockage objet non configuré (traitement différé).',
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: (error instanceof Error ? error.message : '') || 'Erreur serveur upload manuel' },
      { status: 500 },
    );
  }
}
