'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Book, Entitlement } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { DynamicWatermark } from './DynamicWatermark';
import { ChapterOutline } from './ChapterOutline';
import { AccessExpiredState } from './AccessExpiredState';
import { Icons } from '@/components/ui/icons';

interface SecureBookReaderProps {
  book: Book;
  entitlement?: Entitlement | null;
  userEmail?: string;
}

type ReadingTheme = 'IVORY' | 'DARK' | 'WHITE';

export function SecureBookReader({
  book,
  entitlement,
  userEmail = 'elyes@tuniedu.tn',
}: SecureBookReaderProps) {
  const { lang, isRtl } = useLanguage();
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const [thumbnailsOpen, setThumbnailsOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [studySeconds, setStudySeconds] = useState<number>(0);
  const [readingTheme, setReadingTheme] = useState<ReadingTheme>('IVORY');
  const [bookmarks, setBookmarks] = useState<number[]>([1]);
  const [pageNotes, setPageNotes] = useState<{ [pageNum: number]: string }>({
    1: 'Règle essentielle sur les radicaux pour le concours pilote !',
  });
  const [currentNoteText, setCurrentNoteText] = useState<string>('');
  const [, setIsFullscreen] = useState(false);

  const [nowIso, setNowIso] = useState('2026-10-12T12:00:00.000Z');

  useEffect(() => {
    setNowIso(new Date().toISOString());
  }, []);

  // Sync current note text when page changes
  useEffect(() => {
    setCurrentNoteText(pageNotes[currentPage] || '');
  }, [currentPage, pageNotes]);

  const hasAccess =
    entitlement &&
    entitlement.status === 'ACTIVE' &&
    entitlement.startsAt <= nowIso &&
    nowIso < entitlement.expiresAt;

  // Active study session timer
  useEffect(() => {
    if (!hasAccess) return;
    const interval = setInterval(() => {
      setStudySeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [hasAccess]);

  // Anti-screenshot / Anti-copy deterrence
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      // Deter Ctrl+P / Cmd+P
      if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        alert(
          lang === 'ar'
            ? 'الطباعة المباشرة معطلة لحماية حقوق التأليف والنشر البيداغوجي.'
            : 'L\'impression directe est désactivée pour la protection des droits d\'auteur.'
        );
      }
      // Deter Ctrl+S / Cmd+S
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
      }
    };

    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [lang]);

  if (!hasAccess) {
    return (
      <AccessExpiredState
        bookTitle={book.title}
        expiredAt={entitlement?.expiresAt}
        reason={entitlement ? 'EXPIRED' : 'UNAUTHORIZED'}
      />
    );
  }

  // Mask email: elyes@tuniedu.tn -> el***@tuniedu.tn
  const maskEmail = (email: string) => {
    const [name, domain] = email.split('@');
    if (!name || !domain) return 'USER_MASKED';
    return `${name.slice(0, 2)}***@${domain}`;
  };

  const maskedUser = maskEmail(userEmail);
  const transactionRef = entitlement?.purchaseItemId || 'ENT-2026-ACTIVE';

  const currentChapter = book.chapters.find(
    (c) => currentPage >= c.startPage && currentPage <= c.endPage
  );

  const toggleBookmark = () => {
    if (bookmarks.includes(currentPage)) {
      setBookmarks(bookmarks.filter((p) => p !== currentPage));
    } else {
      setBookmarks([...bookmarks, currentPage]);
    }
  };

  const saveCurrentNote = () => {
    setPageNotes({
      ...pageNotes,
      [currentPage]: currentNoteText,
    });
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Zoom handlers
  const zoomIn = () => setZoomLevel((z) => Math.min(160, z + 15));
  const zoomOut = () => setZoomLevel((z) => Math.max(70, z - 15));
  const zoomReset = () => setZoomLevel(100);

  // Theme styling configurations
  const themeStyles = {
    IVORY: {
      canvasBg: 'bg-[#FAF9F5]',
      textColor: 'text-[#1E3A2F]',
      subTextColor: 'text-[#3E5C4E]',
      borderColor: 'border-[#E7E5DC]',
      mathBox: 'bg-[#F2EFE6] border-[#DFDBD0] text-[#163024]',
      footerBg: 'border-[#ECEAE2]',
    },
    DARK: {
      canvasBg: 'bg-[#0F172A]',
      textColor: 'text-[#E2E8F0]',
      subTextColor: 'text-[#94A3B8]',
      borderColor: 'border-[#1E293B]',
      mathBox: 'bg-[#1E293B] border-[#334155] text-blue-200',
      footerBg: 'border-[#1E293B]',
    },
    WHITE: {
      canvasBg: 'bg-white',
      textColor: 'text-[#0F172A]',
      subTextColor: 'text-[#475569]',
      borderColor: 'border-slate-200',
      mathBox: 'bg-blue-50/70 border-blue-200 text-blue-950',
      footerBg: 'border-slate-100',
    },
  }[readingTheme];

  return (
    <div className="flex flex-col h-[calc(100vh-6.5rem)] bg-[#EDF3FA] text-slate-900 select-none">
      {/* Top Toolbar - Deep Institutional Navy */}
      <div className="h-14 px-3 sm:px-4 bg-[#0F2942] border-b border-[#0A1C2E] flex items-center justify-between gap-2 sm:gap-3 z-30 text-white shadow-md">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <Link
            href="/student/library"
            className="p-1.5 rounded-xl bg-[#1B3A57] hover:bg-blue-800 text-blue-100 transition shadow-xs"
            title={lang === 'ar' ? 'العودة للمكتبة' : 'Retour à la bibliothèque'}
          >
            <Icons.ArrowLeft className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-bold truncate text-white font-serif">{book.title}</h1>
            <div className="text-[10px] text-blue-200/80 flex items-center gap-2">
              <span className="hidden sm:inline">{lang === 'ar' ? (book.levelNameAr || book.levelNameFr) : book.levelNameFr}</span>
              <span className="hidden sm:inline">•</span>
              <span className="text-blue-300 flex items-center gap-1 font-medium">
                <Icons.Shield className="w-3 h-3 text-blue-400" />
                {lang === 'ar' ? 'نفاذ سارٍ' : 'Accès 2026–2027'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Theme Palette Switcher */}
          <div className="flex items-center bg-[#1B3A57] p-0.5 rounded-xl border border-blue-900/60">
            <button
              onClick={() => setReadingTheme('IVORY')}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition ${
                readingTheme === 'IVORY' ? 'bg-[#FAF9F5] text-[#1E3A2F] shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
              title={lang === 'ar' ? 'ورق ivoire مريح للعينين' : 'Papier Ivoire (Confort Anti-Fatigue)'}
            >
              {lang === 'ar' ? 'عاجي' : 'Ivoire'}
            </button>
            <button
              onClick={() => setReadingTheme('DARK')}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition ${
                readingTheme === 'DARK' ? 'bg-slate-900 text-slate-100 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
              title={lang === 'ar' ? 'الوضع الليلي' : 'Mode Nuit'}
            >
              {lang === 'ar' ? 'ليلي' : 'Nuit'}
            </button>
            <button
              onClick={() => setReadingTheme('WHITE')}
              className={`px-2 py-1 rounded-lg text-[10px] sm:text-xs font-semibold transition ${
                readingTheme === 'WHITE' ? 'bg-white text-slate-900 shadow-xs' : 'text-blue-200 hover:text-white'
              }`}
              title={lang === 'ar' ? 'أبيض ناصع' : 'Blanc'}
            >
              {lang === 'ar' ? 'أبيض' : 'Blanc'}
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="hidden md:flex items-center gap-1 bg-[#1B3A57] px-1.5 py-0.5 rounded-xl border border-blue-900/60 text-xs">
            <button
              onClick={zoomOut}
              disabled={zoomLevel <= 70}
              className="p-1 hover:text-white text-blue-200 disabled:opacity-30"
              title={lang === 'ar' ? 'تصغير' : 'Zoom arrière'}
            >
              <Icons.Minus className="w-3 h-3" />
            </button>
            <button
              onClick={zoomReset}
              className="text-[11px] font-mono px-1 font-bold text-blue-100 hover:text-white"
              title="Réinitialiser zoom"
            >
              {zoomLevel}%
            </button>
            <button
              onClick={zoomIn}
              disabled={zoomLevel >= 160}
              className="p-1 hover:text-white text-blue-200 disabled:opacity-30"
              title={lang === 'ar' ? 'تكبير' : 'Zoom avant'}
            >
              <Icons.Plus className="w-3 h-3" />
            </button>
          </div>

          {/* Chapter Outline button */}
          <button
            onClick={() => setOutlineOpen(!outlineOpen)}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition ${
              outlineOpen ? 'bg-blue-600 text-white shadow-xs' : 'bg-[#1B3A57] hover:bg-blue-800 text-blue-200'
            }`}
          >
            <Icons.Book className="w-3.5 h-3.5" />
            <span className="hidden lg:inline">{lang === 'ar' ? 'الفهرس' : 'Sommaire'}</span>
          </button>

          {/* Page Navigator */}
          <div className="flex items-center gap-1 bg-[#1B3A57] px-2 py-1 rounded-xl border border-blue-900/60 text-xs text-white">
            <button
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1 hover:text-white text-blue-200 disabled:opacity-30"
              title={lang === 'ar' ? 'الصفحة السابقة' : 'Page précédente'}
            >
              <Icons.ChevronLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
            <span className="font-mono px-1 font-bold text-xs">
              {currentPage} / {book.pageCount}
            </span>
            <button
              disabled={currentPage >= book.pageCount}
              onClick={() => setCurrentPage((p) => Math.min(book.pageCount, p + 1))}
              className="p-1 hover:text-white text-blue-200 disabled:opacity-30"
              title={lang === 'ar' ? 'الصفحة التالية' : 'Page suivante'}
            >
              <Icons.ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
            </button>
          </div>

          {/* Bookmark Button */}
          <button
            onClick={toggleBookmark}
            className={`p-1.5 rounded-xl transition ${
              bookmarks.includes(currentPage)
                ? 'bg-amber-400 text-slate-900 shadow-xs'
                : 'bg-[#1B3A57] text-blue-200 hover:bg-blue-800'
            }`}
            title={lang === 'ar' ? 'إشارة مرجعية' : 'Marque-page'}
          >
            <Icons.Bookmark className="w-3.5 h-3.5" />
          </button>

          {/* Notes Toggle */}
          <button
            onClick={() => setNotesOpen(!notesOpen)}
            className={`p-1.5 rounded-xl transition ${
              notesOpen || pageNotes[currentPage]
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-[#1B3A57] text-blue-200 hover:bg-blue-800'
            }`}
            title={lang === 'ar' ? 'ملاحظاتي' : 'Mes notes de révision'}
          >
            <Icons.Edit className="w-3.5 h-3.5" />
          </button>

          {/* Thumbnails scrubber toggle */}
          <button
            onClick={() => setThumbnailsOpen(!thumbnailsOpen)}
            className={`p-1.5 rounded-xl transition ${
              thumbnailsOpen ? 'bg-blue-600 text-white shadow-xs' : 'bg-[#1B3A57] text-blue-200 hover:bg-blue-800'
            }`}
            title={lang === 'ar' ? 'لوحة الصفحات' : 'Miniatures des planches'}
          >
            <Icons.Grid className="w-3.5 h-3.5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-1.5 rounded-xl bg-[#1B3A57] text-blue-200 hover:bg-blue-800 transition hidden sm:inline-flex"
            title={lang === 'ar' ? 'شاشة كاملة' : 'Plein écran'}
          >
            <Icons.Maximize className="w-3.5 h-3.5" />
          </button>

          {/* Study Timer */}
          <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#1B3A57] border border-blue-900/60 text-[11px] text-blue-200 font-mono">
            <Icons.Clock className="w-3.5 h-3.5 text-blue-300" />
            <span>{Math.floor(studySeconds / 60)}m {studySeconds % 60}s</span>
          </div>
        </div>
      </div>

      {/* Main Reading Stage */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Outline Drawer */}
        {outlineOpen && (
          <div className="absolute inset-y-0 left-0 z-30 shadow-2xl">
            <ChapterOutline
              chapters={book.chapters}
              currentPage={currentPage}
              onSelectPage={(p) => {
                setCurrentPage(p);
                setOutlineOpen(false);
              }}
              onClose={() => setOutlineOpen(false)}
            />
          </div>
        )}

        {/* Notes Side Panel */}
        {notesOpen && (
          <div className="absolute top-0 right-0 z-30 w-80 h-full bg-white border-l border-blue-200 shadow-2xl p-5 flex flex-col justify-between animate-in slide-in-from-right duration-200">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Icons.Edit className="w-4 h-4 text-blue-700" />
                  <h3 className="font-bold text-sm text-slate-900">
                    {lang === 'ar' ? `ملاحظات الصفحة ${currentPage}` : `Notes de la Page ${currentPage}`}
                  </h3>
                </div>
                <button
                  onClick={() => setNotesOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <Icons.X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                {lang === 'ar'
                  ? 'سجل ملاحظاتك الرياضية والنقاط الهامة لتسهيل المراجعة قبل الامتحان.'
                  : 'Notez vos astuces, formules clés et questions pour vos révisions.'}
              </p>

              <textarea
                value={currentNoteText}
                onChange={(e) => setCurrentNoteText(e.target.value)}
                placeholder={lang === 'ar' ? 'اكتب ملاحظتك هنا...' : 'Saisissez vos remarques personnelles...'}
                className="w-full h-44 p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 resize-none font-sans"
              />
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                onClick={() => setNotesOpen(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-slate-600 hover:bg-slate-100"
              >
                {lang === 'ar' ? 'إغلاق' : 'Fermer'}
              </button>
              <button
                onClick={() => {
                  saveCurrentNote();
                  setNotesOpen(false);
                }}
                className="px-4 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs"
              >
                {lang === 'ar' ? 'حفظ الملاحظة' : 'Enregistrer'}
              </button>
            </div>
          </div>
        )}

        {/* Book Page Canvas Stage */}
        <div className="flex-1 overflow-auto p-4 sm:p-8 flex items-center justify-center bg-[#EDF3FA]">
          <div
            className={`relative rounded-2xl shadow-xl transition-all duration-200 overflow-hidden border ${themeStyles.canvasBg} ${themeStyles.borderColor}`}
            style={{
              width: `${(800 * zoomLevel) / 100}px`,
              minHeight: `${(1130 * zoomLevel) / 100}px`,
              maxWidth: '96vw',
            }}
          >
            {/* Dynamic Watermark Overlay (Anti-Screenshot Nominatif) */}
            <DynamicWatermark
              userMask={maskedUser}
              transactionRef={transactionRef}
              timestamp={lang === 'ar' ? 'دورة تونس 2026/2027 · وثيقة محمية' : 'Année 2026/2027 · Session Tunis'}
            />

            {/* Page Header */}
            <div className={`p-8 pb-4 border-b ${themeStyles.footerBg} flex items-center justify-between text-xs font-mono`}>
              <div className="flex items-center gap-2">
                <span className={`font-serif ${themeStyles.textColor} font-semibold`}>{book.title}</span>
                {bookmarks.includes(currentPage) && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-sans font-semibold">
                    <Icons.Bookmark className="w-3 h-3 fill-amber-500" />
                    {lang === 'ar' ? 'صفحة محفوظة' : 'Marquée'}
                  </span>
                )}
              </div>
              <span className="font-bold text-blue-700">
                {lang === 'ar' ? `الصفحة ${currentPage}` : `PAGE ${currentPage}`}
              </span>
            </div>

            {/* Rendered Book Content Simulator */}
            <div className="p-8 sm:p-12 space-y-6">
              {currentChapter ? (
                <>
                  <div className="space-y-1">
                    <div className="text-xs font-bold uppercase tracking-wider text-blue-700">
                      {lang === 'ar' ? 'البرنامج البيداغوجي التونسي الرسمي' : 'Programme Officiel Tunisien'}
                    </div>
                    <h2 className={`text-2xl font-bold font-serif leading-tight ${themeStyles.textColor}`}>
                      {currentChapter.title}
                    </h2>
                  </div>

                  <div className={`prose max-w-none text-sm space-y-4 font-serif leading-relaxed ${themeStyles.textColor}`}>
                    <p>
                      <strong>1. Définitions Fondamentales & Théorèmes :</strong><br />
                      Tout nombre réel positif <em>a</em> possède une racine carrée unique notée <code>√a</code>, 
                      telle que <code>(√a)² = a</code>. Lorsque <em>x</em> est un réel tel que <code>x² = b</code> avec <code>b &gt; 0</code>, 
                      les deux solutions dans ℝ sont données par :
                    </p>

                    <div className={`p-4 rounded-2xl border text-center font-mono font-bold text-base my-4 shadow-inner ${themeStyles.mathBox}`}>
                      S_ℝ = {'{ -√b ; +√b }'}
                    </div>

                    <p>
                      <strong>2. Propriétés des radicaux & Démonstrations :</strong><br />
                      Pour tous réels strictement positifs <em>a</em> et <em>b</em>, on vérifie que :
                    </p>
                    <ul className={`list-disc pl-5 space-y-1 ${themeStyles.subTextColor}`}>
                      <li><code>√(a × b) = √a × √b</code></li>
                      <li><code>√(a / b) = √a / √b</code> (avec b &gt; 0)</li>
                      <li>Propriété d&apos;identité : <code>√(a²) = |a|</code> pour tout réel a ∈ ℝ</li>
                    </ul>

                    <div className={`p-4 rounded-2xl border text-xs ${themeStyles.mathBox}`}>
                      <strong>Note méthodologique pour le Concours :</strong> Ne pas confondre la racine carrée 
                      qui est toujours positive par définition, et la solution d&apos;une équation du second degré qui peut être négative.
                    </div>
                  </div>

                  {currentChapter.exercises && currentChapter.exercises.length > 0 && (
                    <div className="mt-8 p-5 bg-blue-50/60 border border-blue-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-sm text-slate-900">
                          {lang === 'ar' ? 'تمارين تطبيقية مرافقة للدرس' : 'Exercices d\'application du chapitre'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lang === 'ar'
                            ? `${currentChapter.exercises.length} تمارين نموذجية مرفقة بالإصلاح البيداغوجي الفوري.`
                            : `${currentChapter.exercises.length} exercices disponibles avec corrigés détaillés immédiats.`}
                        </div>
                      </div>
                      <Link
                        href={`/student/exercises/${currentChapter.exercises[0].id}`}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs rounded-xl shadow-xs transition"
                      >
                        {lang === 'ar' ? 'حل التمارين ومراجعة الإصلاح ←' : 'Résoudre les exercices →'}
                      </Link>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-20 space-y-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
                    <Icons.Book className="w-6 h-6" />
                  </div>
                  <h3 className={`font-bold text-lg ${themeStyles.textColor}`}>
                    {lang === 'ar' ? `محتوى الصفحة ${currentPage}` : `Contenu de la Page ${currentPage}`}
                  </h3>
                  <p className={`text-xs max-w-sm mx-auto ${themeStyles.subTextColor}`}>
                    {lang === 'ar'
                      ? 'الوثيقة الرقمية مشفرة ومحمية ببصمة مائية ديناميكية ترصد أي محاولة تصوير أو نسخ.'
                      : 'Le document numérisé est délivré avec un jeton sécurisé à courte durée de vie et filigrane nominatif.'}
                  </p>
                </div>
              )}
            </div>

            {/* Page Footer */}
            <div className={`p-8 pt-4 border-t ${themeStyles.footerBg} flex items-center justify-between text-[11px] ${themeStyles.subTextColor}`}>
              <span>{lang === 'ar' ? 'منصة TuniEdu · يمنع النسخ أو التصوير' : 'Plateforme Éducative TuniEdu · Reproduction Interdite'}</span>
              <span className="font-mono">{maskedUser}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Thumbnail Scrubber Drawer */}
      {thumbnailsOpen && (
        <div className="bg-[#0F2942] border-t border-[#0A1C2E] p-3 z-30 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center justify-between pb-2 text-xs text-blue-200">
            <span className="font-semibold">
              {lang === 'ar' ? `معاينة الصفحات (${book.pageCount} صفحة)` : `Navigation Rapide (${book.pageCount} planches)`}
            </span>
            <button
              onClick={() => setThumbnailsOpen(false)}
              className="text-blue-300 hover:text-white"
            >
              <Icons.X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {Array.from({ length: book.pageCount }, (_, idx) => idx + 1).map((pg) => {
              const isCurrent = pg === currentPage;
              const hasBookmark = bookmarks.includes(pg);
              return (
                <button
                  key={pg}
                  onClick={() => setCurrentPage(pg)}
                  className={`relative shrink-0 w-14 h-18 rounded-lg border flex flex-col items-center justify-center text-xs font-mono transition ${
                    isCurrent
                      ? 'bg-blue-600 text-white border-white ring-2 ring-blue-400 font-bold shadow-md'
                      : 'bg-[#1B3A57] text-blue-200 border-blue-900 hover:border-blue-500 hover:text-white'
                  }`}
                >
                  {hasBookmark && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-amber-400" />
                  )}
                  <span>p. {pg}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
