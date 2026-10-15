'use client';

import React, { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import { useSession } from '@/components/providers/SessionProvider';
import { SecureBookReader } from '@/components/reader/SecureBookReader';
import { AccessExpiredState } from '@/components/reader/AccessExpiredState';
import { AiTutorFloatingDrawer } from '@/components/ai/AiTutorFloatingDrawer';

export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  const { user, loading } = useSession();
  const bookId = params?.bookId as string;

  const book = store.books.find((b) => b.id === bookId) || store.books[0];
  const entitlement = book ? store.getEntitlement(user?.id ?? '', book.id) : undefined;

  useEffect(() => {
    if (!loading && !user) {
      router.push('/connexion');
    }
  }, [loading, user, router]);

  if (!book) {
    return (
      <AccessExpiredState
        bookTitle="Manuel Introuvable"
        reason="UNAUTHORIZED"
      />
    );
  }

  if (!user) {
    return null;
  }

  return (
    <>
      <SecureBookReader
        book={book}
        entitlement={entitlement}
        userEmail={user.email}
      />
      <AiTutorFloatingDrawer
        bookId={book.id}
        bookTitle={book.title}
        chapterTitle={book.chapters[0]?.title}
        levelStage={book.stage}
        levelCode={book.educationLevelId}
      />
    </>
  );
}
