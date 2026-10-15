'use client';

import React, { useState } from 'react';
import { store } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { BookCard } from '@/components/catalogue/BookCard';
import { LevelSelector } from '@/components/catalogue/LevelSelector';
import { SubjectFilter } from '@/components/catalogue/SubjectFilter';
import { BookPreviewModal } from '@/components/catalogue/BookPreviewModal';
import { Icons } from '@/components/ui/icons';
import { Book } from '@/lib/store';

export default function CataloguePage() {
  const { lang, isRtl } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [sortBy, setSortBy] = useState<'RECOMMENDED' | 'PRICE_ASC' | 'PRICE_DESC' | 'PAGES'>('RECOMMENDED');
  const [previewBook, setPreviewBook] = useState<Book | null>(null);

  const books = store.books;

  const filteredBooks = books
    .filter((b) => {
      // Stage filter
      if (selectedStage !== 'ALL' && b.stage !== selectedStage) return false;
      // Subject filter
      if (selectedSubject !== 'ALL' && b.subjectId !== selectedSubject) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = b.title.toLowerCase().includes(q);
        const matchProf = b.professorName.toLowerCase().includes(q);
        const matchDesc = b.description.toLowerCase().includes(q);
        if (!matchTitle && !matchProf && !matchDesc) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'PRICE_ASC') return a.priceMillimes - b.priceMillimes;
      if (sortBy === 'PRICE_DESC') return b.priceMillimes - a.priceMillimes;
      if (sortBy === 'PAGES') return b.pageCount - a.pageCount;
      return 0; // RECOMMENDED
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Eye-Comfort Certified Badge */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-[11px] text-blue-950 shadow-xs">
        <div className="flex items-center gap-2 font-medium">
          <Icons.Eye className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'مكتبة رقمية مهيأة لراحة العينين · ألوان بيضاء وزرقاء مريحة ومناسبة للمطالعة الطويلة'
              : 'Affichage pédagogique anti-fatigue visuelle · Palette blanche et bleue certifiée pour les élèves'}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200">
          {lang === 'ar' ? 'البرنامج الرسمي' : 'Programme Officiel'}
        </span>
      </div>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-blue-100">
        <div>
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            {lang === 'ar' ? 'المنشورات البيداغوجية المعتمدة' : 'Éditions Scolaires Officielles'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif tracking-tight mt-1">
            {lang === 'ar' ? 'دليل الكتب والكتب المدرسية الرقمية' : 'Catalogue des Manuels & Ouvrages'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            {lang === 'ar'
              ? 'كتب معتمدة تتضمن الدروس، التمارين النموذجية والإصلاحات المفصلة بإشراف أساتذة تونسيين معتمدين.'
              : 'Découvrez les manuels avec cours, exercices types et corrigés pas à pas rédigés par les professeurs.'}
          </p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-80">
          <Icons.Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3.5' : 'left-3.5'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث بالعنوان، الأستاذ، المادة...' : 'Rechercher par titre, prof, matière...'}
            className={`w-full py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 shadow-xs ${
              isRtl ? 'pr-10 pl-4' : 'pl-10 pr-4'
            }`}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className={`absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 ${isRtl ? 'left-3' : 'right-3'}`}
            >
              <Icons.X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Filters Area */}
      <div className="space-y-4 bg-white p-4 sm:p-5 rounded-2xl border border-blue-100 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs font-semibold text-slate-900">
            {lang === 'ar' ? 'تصفية حسب المرحلة التعليمية :' : 'Filtrer par Cycle :'}
          </div>
          {/* Sorting */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">{lang === 'ar' ? 'ترتيب حسب :' : 'Trier par :'}</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'RECOMMENDED' | 'PRICE_ASC' | 'PRICE_DESC' | 'PAGES')}
              className="py-1 px-2.5 rounded-lg border border-slate-300 text-xs text-slate-800 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
            >
              <option value="RECOMMENDED">{lang === 'ar' ? 'المقترحة للأسبوع' : 'Recommandés'}</option>
              <option value="PRICE_ASC">{lang === 'ar' ? 'السعر: من الأقل إلى الأعلى' : 'Prix croissant'}</option>
              <option value="PRICE_DESC">{lang === 'ar' ? 'السعر: من الأعلى إلى الأقل' : 'Prix décroissant'}</option>
              <option value="PAGES">{lang === 'ar' ? 'عدد الصفحات' : 'Nombre de pages'}</option>
            </select>
          </div>
        </div>

        <LevelSelector
          selectedStage={selectedStage}
          onSelectStage={setSelectedStage}
        />

        <div className="pt-2 border-t border-blue-50 flex items-center justify-between">
          <div className="text-xs font-semibold text-slate-900">
            {lang === 'ar' ? 'المادة الدراسية :' : 'Matière :'}
          </div>
          <span className="text-[11px] text-slate-400 font-medium">
            {filteredBooks.length} {lang === 'ar' ? 'كتاب متاح' : 'ouvrage(s) disponible(s)'}
          </span>
        </div>
        <SubjectFilter
          selectedSubject={selectedSubject}
          onSelectSubject={setSelectedSubject}
        />
      </div>

      {/* Books Grid */}
      {filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBooks.map((book) => {
            const hasAccess = store.hasActiveEntitlement(store.getCurrentUser()?.id ?? '', book.id);
            return (
              <BookCard
                key={book.id}
                book={book}
                hasAccess={hasAccess}
                onPreview={(b) => setPreviewBook(b)}
              />
            );
          })}
        </div>
      ) : (
        <div className="py-20 text-center space-y-4 bg-white rounded-2xl border border-blue-100 p-8 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
            <Icons.Search className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-slate-900">
            {lang === 'ar' ? 'لا يوجد كتاب يطابق المعايير المحددة' : 'Aucun manuel ne correspond à vos critères'}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {lang === 'ar'
              ? 'يرجى تجربة إعادة ضبط معايير البحث أو اختيار مادة أخرى.'
              : 'Essayez de réinitialiser vos filtres ou de rechercher un autre mot-clé.'}
          </p>
          <button
            onClick={() => {
              setSelectedStage('ALL');
              setSelectedSubject('ALL');
              setSearchQuery('');
            }}
            className="px-4 py-2 rounded-xl bg-blue-700 text-white font-semibold text-xs hover:bg-blue-800 transition shadow-xs"
          >
            {lang === 'ar' ? 'إعادة ضبط التصفية' : 'Réinitialiser les filtres'}
          </button>
        </div>
      )}

      {/* Quick Preview Modal */}
      <BookPreviewModal
        book={previewBook}
        isOpen={Boolean(previewBook)}
        onClose={() => setPreviewBook(null)}
        hasAccess={previewBook ? store.hasActiveEntitlement(store.getCurrentUser()?.id ?? '', previewBook.id) : false}
      />
    </div>
  );
}
