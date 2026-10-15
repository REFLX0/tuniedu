'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { Book } from '@/lib/store';
import { Icons } from '@/components/ui/icons';

interface BookCardProps {
  book: Book;
  hasAccess?: boolean;
  onPreview?: (book: Book) => void;
}

export function BookCard({ book, hasAccess, onPreview }: BookCardProps) {
  const { lang, isRtl } = useLanguage();
  const formattedPrice = (book.priceMillimes / 1000).toFixed(3);

  // Subject translation mapping
  const subjectDisplay = {
    subj_math: lang === 'ar' ? 'الرياضيات' : 'Mathématiques',
    subj_phys: lang === 'ar' ? 'العلوم الفيزيائية' : 'Sciences Physiques',
    subj_svt: lang === 'ar' ? 'علوم الحياة والأرض' : 'SVT',
    subj_ara: lang === 'ar' ? 'اللغة العربية' : 'Langue Arabe',
    subj_fra: lang === 'ar' ? 'اللغة الفرنسية' : 'Français',
  }[book.subjectId] || book.subjectNameFr;

  const levelDisplay = lang === 'ar' ? (book.levelNameAr || book.levelNameFr) : book.levelNameFr;

  return (
    <div className="bg-white rounded-xl border border-blue-100/90 shadow-xs hover:border-blue-300 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden group">
      {/* Editorial Header / Book Binding Card */}
      <div className="bg-[#0F2942] border-b border-[#0A1C2E] p-5 text-white flex flex-col justify-between h-44 relative">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[11px] font-semibold px-2.5 py-1 rounded bg-[#1B3A57] text-blue-100 border border-blue-900/60">
            {levelDisplay}
          </span>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white font-mono shadow-xs">
            {subjectDisplay}
          </span>
        </div>

        <div>
          <div className="text-[11px] text-blue-200/80 font-medium flex items-center gap-1.5 mb-1">
            <Icons.Book className="w-3.5 h-3.5 text-blue-300" />
            <span>{book.pageCount} {lang === 'ar' ? 'صفحة' : 'pages numérisées'}</span>
            <span>·</span>
            <span>{lang === 'ar' ? 'طبعة 2026/2027' : 'Édition 2026/2027'}</span>
          </div>
          <h3 className="font-bold text-sm text-white group-hover:text-blue-100 line-clamp-2 leading-snug font-serif">
            {book.title}
          </h3>
        </div>
      </div>

      {/* Body Information */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4 bg-white">
        <div className="space-y-3">
          {/* Author & Verification Seal */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-blue-50 border border-blue-200 flex items-center justify-center text-xs font-bold text-blue-900">
              {book.professorName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-900 truncate">
                  {book.professorName}
                </span>
                <span title="Auteur agréé" className="text-blue-600 inline-flex items-center">
                  <Icons.CheckCircle className="w-3.5 h-3.5" />
                </span>
              </div>
              <div className="text-[10px] text-slate-500">
                {lang === 'ar' ? 'مؤلف وأستاذ معتمد' : 'Enseignant Auteur Homologué'}
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
            {book.description}
          </p>
        </div>

        {/* Pricing & Call To Action */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
              {lang === 'ar' ? 'تسعيرة سنوية رسمية' : 'Accès Annuel Officiel'}
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-slate-950 font-mono">{formattedPrice}</span>
              <span className="text-xs font-bold text-blue-700">{lang === 'ar' ? 'د.ت' : 'DT'}</span>
              <span className="text-[10px] text-slate-400 font-mono">({book.priceMillimes} mil.)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onPreview && (
              <button
                type="button"
                onClick={() => onPreview(book)}
                className="inline-flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 text-slate-700 text-xs font-medium transition"
                title={lang === 'ar' ? 'معاينة الفهرس والمحتوى' : 'Aperçu rapide du manuel'}
              >
                <Icons.Book className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">{lang === 'ar' ? 'معاينة' : 'Aperçu'}</span>
              </button>
            )}

            {hasAccess ? (
              <Link
                href={`/student/library/${book.id}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Icons.Eye className="w-3.5 h-3.5" />
                <span>{lang === 'ar' ? 'قراءة الكتاب' : 'Consulter'}</span>
              </Link>
            ) : (
              <Link
                href={`/catalogue/${book.slug}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition"
              >
                <span>{lang === 'ar' ? 'التفاصيل والاقتناء' : 'Détails & Achat'}</span>
                <Icons.ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
