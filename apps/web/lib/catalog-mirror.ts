// =============================================================================
// TuniEdu Catalog Mirror (server-only)
// The application catalog (books, chapters, professors) lives in the in-memory
// store, but the durable media models (VideoContent, LiveSession, ...) hold real
// foreign keys into Postgres. This helper idempotently mirrors a store book into
// the DB so those FKs resolve without migrating the whole catalog.
//
// Store `educationLevelId` (lvl_*) and `subjectId` (subj_*) already match the DB
// reference-data IDs, and professor IDs are aligned (prof_hichem_profile, ...).
// =============================================================================

import { prisma, BookStatus } from '@tuniedu/database';
import { store } from './store';
import type { Book as StoreBook } from './store';

const STORE_TO_DB_STATUS: Record<StoreBook['status'], BookStatus> = {
  DRAFT: BookStatus.DRAFT,
  PROCESSING: BookStatus.PROCESSING,
  IN_REVIEW: BookStatus.IN_REVIEW,
  PUBLISHED: BookStatus.PUBLISHED,
  REJECTED: BookStatus.REJECTED,
  ARCHIVED: BookStatus.ARCHIVED,
};

/** Upserts a single store book into Postgres so media FKs resolve. Best-effort. */
export async function ensureBookMirror(bookId: string): Promise<boolean> {
  const book = store.books.find((b) => b.id === bookId);
  if (!book) return false;

  try {
    await prisma.book.upsert({
      where: { id: book.id },
      update: {
        title: book.title,
        priceMillimes: book.priceMillimes,
        status: STORE_TO_DB_STATUS[book.status],
      },
      create: {
        id: book.id,
        professorId: book.professorId,
        educationLevelId: book.educationLevelId,
        subjectId: book.subjectId,
        title: book.title,
        slug: book.slug,
        description: book.description,
        language: book.language,
        currency: book.currency,
        priceMillimes: book.priceMillimes,
        status: STORE_TO_DB_STATUS[book.status],
        coverObjectKey: book.coverObjectKey ?? null,
        publishedAt: book.publishedAt ? new Date(book.publishedAt) : null,
        tags: [],
      },
    });
    return true;
  } catch (err) {
    console.error('[catalog-mirror] ensureBookMirror failed:', err instanceof Error ? err.message : err);
    return false;
  }
}

/** Mirrors every book in the in-memory catalog. Useful for seeding / dev. */
export async function hydrateCatalog(): Promise<number> {
  let count = 0;
  for (const book of store.books) {
    if (await ensureBookMirror(book.id)) count += 1;
  }
  return count;
}
