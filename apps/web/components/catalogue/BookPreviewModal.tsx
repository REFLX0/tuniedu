'use client';

import React from 'react';
import Link from 'next/link';
import { Book } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { Icons } from '@/components/ui/icons';

interface BookPreviewModalProps {
  book: Book | null;
  isOpen: boolean;
  onClose: () => void;
  hasAccess: boolean;
}

export function BookPreviewModal({ book, isOpen, onClose, hasAccess }: BookPreviewModalProps) {
  const { lang } = useLanguage();

  if (!isOpen || !book) return null;

  const formattedPrice = (book.priceMillimes / 1000).toFixed(3);

  const subjectDisplay = {
    subj_math: lang === 'ar' ? 'الرياضيات' : 'Mathématiques',
    subj_phys: lang === 'ar' ? 'العلوم الفيزيائية' : 'Sciences Physiques',
    subj_svt: lang === 'ar' ? 'علوم الحياة والأرض' : 'SVT',
    subj_ara: lang === 'ar' ? 'اللغة العربية' : 'Langue Arabe',
    subj_fra: lang === 'ar' ? 'اللغة الفرنسية' : 'Français',
  }[book.subjectId] || book.subjectNameFr;

  const levelDisplay = lang === 'ar' ? (book.levelNameAr || book.levelNameFr) : book.levelNameFr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full border border-blue-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-[#0F2942] p-6 text-white relative flex items-start justify-between">
          <div className="space-y-2 max-w-[85%]">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded bg-[#1B3A57] text-blue-100 border border-blue-900/60">
                {levelDisplay}
              </span>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded bg-blue-600 text-white font-mono">
                {subjectDisplay}
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                {lang === 'ar' ? 'منهاج رسمي معتمد' : 'Programme Officiel'}
              </span>
            </div>
            <h2 className="text-xl font-bold font-serif leading-snug">{book.title}</h2>
            <div className="text-xs text-blue-200/80 flex items-center gap-2">
              <Icons.User className="w-3.5 h-3.5 text-blue-300" />
              <span>{book.professorName}</span>
              <span>·</span>
              <span>{book.pageCount} {lang === 'ar' ? 'صفحة' : 'pages'}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
            title={lang === 'ar' ? 'إغلاق' : 'Fermer'}
          >
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Summary / Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
              {lang === 'ar' ? 'وصف المصنف البيداغوجي' : 'Présentation de l\'Ouvrage'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">
              {book.description}
            </p>
          </div>

          {/* Chapters Outline */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                {lang === 'ar' ? 'فهرس المحتويات والتمارين' : 'Sommaire des Chapitres & Exercices'}
              </h3>
              <span className="text-xs text-slate-400">
                {book.chapters.length} {lang === 'ar' ? 'محاور' : 'chapitres'}
              </span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {book.chapters.map((ch, idx) => (
                <div
                  key={ch.id}
                  className="p-3 rounded-xl bg-blue-50/50 hover:bg-blue-50 border border-blue-100/70 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-md bg-blue-600 text-white font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-slate-900">{ch.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                    <span>p. {ch.startPage}–{ch.endPage}</span>
                    {ch.exercises && ch.exercises.length > 0 && (
                      <span className="text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200 font-sans font-medium text-[10px]">
                        {ch.exercises.length} {lang === 'ar' ? 'تمارين' : 'exercices'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Key Advantages */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
              <Icons.Shield className="w-5 h-5 text-blue-700 mx-auto" />
              <div className="text-xs font-bold text-slate-900">
                {lang === 'ar' ? 'حماية العينين' : 'Anti-Lumière Bleue'}
              </div>
              <div className="text-[10px] text-slate-500">
                {lang === 'ar' ? 'خلفية ورقية هادئة' : 'Papier ivoire reposant'}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
              <Icons.CheckCircle className="w-5 h-5 text-emerald-600 mx-auto" />
              <div className="text-xs font-bold text-slate-900">
                {lang === 'ar' ? 'إصلاحات مفصلة' : 'Corrigés Inclus'}
              </div>
              <div className="text-[10px] text-slate-500">
                {lang === 'ar' ? 'تعليلات وحلول فورية' : 'Démonstrations pas à pas'}
              </div>
            </div>
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/70 text-center space-y-1">
              <Icons.Clock className="w-5 h-5 text-blue-700 mx-auto" />
              <div className="text-xs font-bold text-slate-900">
                {lang === 'ar' ? 'سنة دراسية كاملة' : 'Année 2026–2027'}
              </div>
              <div className="text-[10px] text-slate-500">
                {lang === 'ar' ? 'نفاذ غير محدود' : 'Accès illimité'}
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer / CTA */}
        <div className="p-5 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-baseline gap-2">
            <span className="text-[11px] text-slate-500 uppercase font-semibold">
              {lang === 'ar' ? 'السعر السنوي :' : 'Tarif annuel :'}
            </span>
            <span className="text-2xl font-bold font-mono text-slate-950">{formattedPrice}</span>
            <span className="text-sm font-bold text-blue-700">{lang === 'ar' ? 'د.ت' : 'DT'}</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {hasAccess ? (
              <Link
                href={`/student/library/${book.id}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition"
              >
                <Icons.Book className="w-4 h-4" />
                <span>{lang === 'ar' ? 'فتح في القارئ الرقمي' : 'Ouvrir le Lecteur'}</span>
              </Link>
            ) : (
              <Link
                href={`/catalogue/${book.slug}`}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs transition"
              >
                <Icons.CreditCard className="w-4 h-4" />
                <span>{lang === 'ar' ? 'شراء الحقوق السنوية' : 'Acheter l\'Accès Annuel'}</span>
              </Link>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-white text-xs font-medium transition"
            >
              {lang === 'ar' ? 'إغلاق' : 'Fermer'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
