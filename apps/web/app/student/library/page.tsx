'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { store } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { AiTutorFloatingDrawer } from '@/components/ai/AiTutorFloatingDrawer';
import { Icons } from '@/components/ui/icons';

export default function StudentLibraryPage() {
  const { lang } = useLanguage();
  const currentUserId = store.currentUserId;
  const [nowIso, setNowIso] = useState('2026-10-12T12:00:00.000Z');
  const [filterSubject, setFilterSubject] = useState<string>('ALL');

  useEffect(() => {
    setNowIso(new Date().toISOString());
  }, []);

  // Find all entitlements for current student
  const entitlements = store.entitlements.filter(
    (e) => e.userId === currentUserId && e.status === 'ACTIVE'
  );

  const purchasedBooks = entitlements
    .map((e) => {
      const book = store.books.find((b) => b.id === e.bookId);
      // Simulated study progress for each book
      const pagesRead = book?.id === 'book_math_9b' ? 42 : 18;
      const progressPercent = book ? Math.round((pagesRead / book.pageCount) * 100) : 0;
      return { book, entitlement: e, pagesRead, progressPercent };
    })
    .filter((item) => item.book !== undefined);

  const filteredBooks = purchasedBooks.filter((item) => {
    if (filterSubject === 'ALL') return true;
    return item.book?.subjectId === filterSubject;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Eye-Comfort Certified Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-[11px] text-blue-950 shadow-xs">
        <div className="flex items-center gap-2 font-medium">
          <Icons.Eye className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'مكتبة التلميذ الرقمية · خطوط عريضة مريحة وحماية بيضاء وزرقاء من التوهج البصري'
              : 'Espace de lecture élève · Typographie aérée et confort visuel certifié'}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200">
          {lang === 'ar' ? 'جلسة مذاكرة' : 'Session d\'Étude'}
        </span>
      </div>

      {/* Header with National Concours Countdown Widget */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-blue-100">
        <div>
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            {lang === 'ar' ? 'فضاء التلميذ' : 'Espace Élève'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif tracking-tight mt-1">
            {lang === 'ar' ? 'مكتبتي الرقمية والكتب النشطة' : 'Ma Bibliothèque Numérique'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'الكتب المدرسية المفعلة للسنة الدراسية الجارية بتوقيت تونس (Africa/Tunis).'
              : 'Vos manuels scolaires actifs pour l\'année scolaire en cours (fuseau Africa/Tunis).'}
          </p>
        </div>

        {/* National Concours Pilot Countdown */}
        <div className="bg-[#0F2942] text-white p-4 rounded-2xl border border-[#0A1C2E] shadow-sm flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
            <Icons.Calendar className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-[10px] text-blue-200 uppercase font-semibold">
              {lang === 'ar' ? 'مناظرة الدخول للمعاهد النموذجية (نوفيام) :' : 'Concours Lycées Pilotes (9ème) :'}
            </div>
            <div className="text-sm font-bold text-white font-serif">
              {lang === 'ar' ? 'دورة جوان 2027 · متبقي 242 يوماً' : 'Session Juin 2027 · J-242'}
            </div>
          </div>
          <Link
            href="/student/progress"
            className="px-3 py-1.5 rounded-xl bg-[#1B3A57] hover:bg-blue-800 text-blue-100 text-xs font-semibold transition"
          >
            {lang === 'ar' ? 'تقدمي' : 'Mes Progrès'}
          </Link>
        </div>
      </div>

      {/* Multimodal Educational Formats Hub Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-lg shadow-sm">
              📚
            </span>
            <div>
              <h4 className="font-bold text-xs text-blue-950">Manuels Scolaires</h4>
              <p className="text-[11px] text-blue-700">Lecture protégée & exercices</p>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600">Actif ✓</span>
        </div>

        <Link
          href="/student/videos/vid_thal_9b"
          className="bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 rounded-2xl p-4 flex items-center justify-between transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center text-lg shadow-sm group-hover:bg-blue-600 transition-colors">
              🎬
            </span>
            <div>
              <h4 className="font-bold text-xs text-slate-900 group-hover:text-blue-700 transition-colors">
                Cours Vidéos HLS
              </h4>
              <p className="text-[11px] text-slate-500">Explications au tableau</p>
            </div>
          </div>
          <span className="text-xs font-bold text-blue-600 group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>

        <Link
          href="/student/live"
          className="bg-white border border-slate-200 hover:border-red-400 hover:bg-red-50/30 rounded-2xl p-4 flex items-center justify-between transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center text-lg shadow-sm shadow-red-600/30">
              🔴
            </span>
            <div>
              <div className="flex items-center gap-1.5">
                <h4 className="font-bold text-xs text-slate-900 group-hover:text-red-700 transition-colors">
                  Séances en Direct
                </h4>
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
              </div>
              <p className="text-[11px] text-slate-500">Chat & questions en temps réel</p>
            </div>
          </div>
          <span className="text-xs font-bold text-red-600 group-hover:translate-x-0.5 transition-transform">→</span>
        </Link>
      </div>

      {/* Subject Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            onClick={() => setFilterSubject('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterSubject === 'ALL'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {lang === 'ar' ? 'جميع الكتب' : 'Tous les Manuels'} ({purchasedBooks.length})
          </button>
          <button
            onClick={() => setFilterSubject('subj_math')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterSubject === 'subj_math'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {lang === 'ar' ? 'الرياضيات' : 'Mathématiques'}
          </button>
          <button
            onClick={() => setFilterSubject('subj_phys')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition ${
              filterSubject === 'subj_phys'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            {lang === 'ar' ? 'الفيزياء' : 'Physique'}
          </button>
        </div>

        <Link
          href="/catalogue"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs transition"
        >
          <Icons.Book className="w-4 h-4" />
          <span>{lang === 'ar' ? 'استكشاف كتب جديدة' : 'Découvrir d\'Autres Ouvrages'}</span>
        </Link>
      </div>

      {/* Bookshelf Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map(({ book, entitlement, pagesRead, progressPercent }) => {
            const isExpired = nowIso >= entitlement.expiresAt;
            const expiryDate = new Date(entitlement.expiresAt).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN');

            return (
              <div
                key={entitlement.id}
                className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden flex flex-col justify-between hover:border-blue-300 hover:shadow-md transition"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-blue-50 text-blue-900 border border-blue-100">
                      {lang === 'ar' ? (book!.levelNameAr || book!.levelNameFr) : book!.levelNameFr}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                        isExpired
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {isExpired
                        ? lang === 'ar' ? 'انتهت الصلاحية' : 'ACCÈS EXPIRÉ'
                        : lang === 'ar' ? 'صلاحية نشطة' : 'ACCÈS ACTIF'}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-950 font-serif leading-snug">
                      {book!.title}
                    </h3>
                    <div className="text-xs text-slate-500 mt-1 flex items-center gap-2">
                      <span>{book!.professorName}</span>
                      <span>•</span>
                      <span>{book!.pageCount} {lang === 'ar' ? 'صفحة' : 'pages'}</span>
                    </div>
                  </div>

                  {/* Reading Progress Indicator */}
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                      <span>{lang === 'ar' ? `التقدم : ${pagesRead}/${book!.pageCount} صفحة` : `Progression : ${pagesRead}/${book!.pageCount} pages`}</span>
                      <span className="font-mono font-bold text-blue-700">{progressPercent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3 flex items-center justify-between">
                    <span>{lang === 'ar' ? 'تاريخ انتهاء النفاذ :' : 'Échéance légale :'}</span>
                    <span className="font-mono font-semibold text-slate-700">{expiryDate}</span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3">
                  <Link
                    href={`/student/library/${book!.id}`}
                    className="flex-1 py-2.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition shadow-xs flex items-center justify-center gap-2"
                  >
                    <Icons.Eye className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'مواصلة القراءة' : 'Reprendre la Lecture'}</span>
                  </Link>

                  {book!.chapters[0]?.exercises[0] && (
                    <Link
                      href={`/student/exercises/${book!.chapters[0].exercises[0].id}`}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 hover:bg-white text-slate-700 text-xs font-semibold transition"
                      title={lang === 'ar' ? 'التمارين والإصلاحات' : 'Exercices'}
                    >
                      <Icons.Sparkles className="w-4 h-4 text-amber-500" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-blue-100 p-12 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
            <Icons.Book className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-lg text-slate-900">
            {lang === 'ar' ? 'لا توجد كتب مدرسية في هذا التصنيف' : 'Aucun manuel dans cette catégorie'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {lang === 'ar'
              ? 'تصفح دليل الكتب لاقتناء المؤلفات الرسمية المعتمدة لسنوات الأساسي والابتدائي.'
              : 'Explorez notre catalogue officiel pour activer vos manuels et corrigés détaillés.'}
          </p>
          <Link
            href="/catalogue"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-700 text-white font-semibold text-xs shadow-xs hover:bg-blue-800"
          >
            <span>{lang === 'ar' ? 'الذهاب للدليل' : 'Voir le Catalogue'}</span>
          </Link>
        </div>
      )}

      {/* Floating AI Tutor Personal Assistant */}
      <AiTutorFloatingDrawer
        levelStage="COLLEGE"
        levelCode="lvl_9b"
      />
    </div>
  );
}
