'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { store, Exercise } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { ExerciseRenderer } from '@/components/exercises/ExerciseRenderer';
import { AiTutorFloatingDrawer } from '@/components/ai/AiTutorFloatingDrawer';
import { Icons } from '@/components/ui/icons';

export default function ExerciseDetailPage() {
  const params = useParams();
  const { lang, isRtl } = useLanguage();
  const exerciseId = params?.exerciseId as string;

  // Find exercise across books
  let targetExercise: Exercise | undefined;
  let targetBookTitle = '';
  let targetBookId = '';
  let chapterTitle = '';

  for (const b of store.books) {
    for (const ch of b.chapters) {
      const found = ch.exercises.find((e) => e.id === exerciseId);
      if (found) {
        targetExercise = found;
        targetBookTitle = b.title;
        targetBookId = b.id;
        chapterTitle = ch.title;
        break;
      }
    }
  }

  // Fallback to first exercise if not found
  if (!targetExercise && store.books[0]?.chapters[0]?.exercises[0]) {
    targetExercise = store.books[0].chapters[0].exercises[0];
    targetBookTitle = store.books[0].title;
    targetBookId = store.books[0].id;
    chapterTitle = store.books[0].chapters[0].title;
  }

  let nextExerciseId: string | undefined;
  for (const b of store.books) {
    for (const ch of b.chapters) {
      const idx = ch.exercises.findIndex((e) => e.id === exerciseId);
      if (idx !== -1) {
        if (idx + 1 < ch.exercises.length) {
          nextExerciseId = ch.exercises[idx + 1].id;
        }
        break;
      }
    }
  }

  const currentUserId = store.getCurrentUser()?.id ?? '';
  const hasAccess = store.hasActiveEntitlement(currentUserId, targetBookId);

  const handleAttemptSubmitted = (answer: string) => {
    if (targetExercise && currentUserId) {
      store.submitExerciseAttempt(currentUserId, targetExercise.id, answer);
    }
  };

  if (!targetExercise) {
    return (
      <div className="py-20 text-center">
        <h2 className="text-lg font-bold">{lang === 'ar' ? 'التمرين غير موجود' : 'Exercice introuvable'}</h2>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Eye-Comfort Certified Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-[11px] text-blue-950 shadow-xs">
        <div className="flex items-center gap-2 font-medium">
          <Icons.Eye className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'تمارين نموذجية ومريحة للنظر · إيضاحات بيداغوجية خطوة بخطوة'
              : 'Évaluation ergonomique · Confort visuel certifié pour l\'apprentissage des élèves'}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200">
          {lang === 'ar' ? 'إصلاح رسمي' : 'Corrigé Officiel'}
        </span>
      </div>

      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/student/library" className="hover:text-blue-700 flex items-center gap-1">
          <Icons.ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{lang === 'ar' ? 'المكتبة' : 'Ma Bibliothèque'}</span>
        </Link>
        <span>/</span>
        <Link href={`/student/library/${targetBookId}`} className="hover:text-blue-700 truncate max-w-xs">
          {targetBookTitle}
        </Link>
        <span>/</span>
        <span className="text-slate-900 font-semibold">{chapterTitle}</span>
      </div>

      <div className="space-y-2">
        <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
          {lang === 'ar' ? 'تدريب وتقييم بيداغوجي' : 'Entraînement & Évaluation'}
        </div>
        <h1 className="text-2xl font-bold text-slate-950 font-serif">
          {lang === 'ar' ? 'تمرين تطبيقي نموذجي مع الإصلاح' : 'Exercice d\'Application avec Corrigé'}
        </h1>
        <p className="text-xs text-slate-500">
          {lang === 'ar'
            ? 'أجب عن السؤال للاطلاع الفوري على الإصلاح البيداغوجي والتعليل الرياضي المفصل للمؤلف.'
            : 'Répondez à la question pour débloquer l\'explication pédagogique détaillée de l\'auteur.'}
        </p>
      </div>

      {/* Interactive Exercise Renderer */}
      <ExerciseRenderer
        exercise={targetExercise}
        hasAccess={hasAccess}
        bookId={targetBookId}
        onAttemptSubmitted={handleAttemptSubmitted}
        nextExerciseId={nextExerciseId}
      />

      {/* Socratic AI Tutor Drawer for guided hints & curriculum validation */}
      <AiTutorFloatingDrawer
        bookId={targetBookId}
        bookTitle={targetBookTitle}
        chapterTitle={chapterTitle}
      />
    </div>
  );
}
