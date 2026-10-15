'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { store } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { Icons } from '@/components/ui/icons';

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { lang, isRtl } = useLanguage();
  const slug = params?.slug as string;

  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [selectedPaymentProvider, setSelectedPaymentProvider] = useState<'FLOUCI' | 'CARTE_BANCAIRE'>('FLOUCI');

  const book = store.books.find((b) => b.slug === slug) || store.books[0];
  const activeYear = store.getActiveAcademicYear();
  const hasAccess = store.hasActiveEntitlement(store.getCurrentUser()?.id ?? '', book.id);

  const formatDT = (m: number) => (m / 1000).toFixed(3) + (lang === 'ar' ? ' د.ت' : ' DT');

  const handleBuy = async () => {
    setIsProcessingCheckout(true);
    setCheckoutError(null);

    try {
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookIds: [book.id], paymentProvider: 'FLOUCI', idempotencyKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la création du paiement');
      }
      router.push(data.checkoutUrl || data.redirectUrl || `/checkout?bookId=${book.id}`);
    } catch (err) {
      setCheckoutError(err instanceof Error ? err.message : 'Paiement impossible');
      setIsProcessingCheckout(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Eye-Comfort Notification */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-[11px] text-blue-950 shadow-xs">
        <div className="flex items-center gap-2 font-medium">
          <Icons.Eye className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'ألوان هادئة ومريحة لعيون التلاميذ · تصميم أبيض وأزرق يحمي من الإجهاد البصري'
              : 'Confort visuel certifié · Palette blanche et bleue reposante adaptée aux longues sessions d\'apprentissage'}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200">
          {lang === 'ar' ? 'النسخة الرقمية الرسمية' : 'Édition Numérique'}
        </span>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
        <Link href="/catalogue" className="hover:text-blue-700 flex items-center gap-1">
          <Icons.ArrowLeft className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          <span>{lang === 'ar' ? 'دليل الكتب' : 'Catalogue'}</span>
        </Link>
        <span>/</span>
        <span className="text-slate-400">{lang === 'ar' ? (book.levelNameAr || book.levelNameFr) : book.levelNameFr}</span>
        <span>/</span>
        <span className="text-slate-900 font-semibold truncate max-w-xs">{book.title}</span>
      </div>

      {/* Main Showcase Card */}
      <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Visual Cover Column */}
        <div className="lg:col-span-5 bg-[#0F2942] p-8 sm:p-10 flex flex-col justify-between text-white relative border-b lg:border-b-0 lg:border-r border-[#0A1C2E]">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-semibold bg-[#1B3A57] text-blue-100 border border-blue-900/60">
                {lang === 'ar' ? (book.levelNameAr || book.levelNameFr) : book.levelNameFr}
              </span>
              <span className="px-2.5 py-0.5 rounded-md bg-blue-600 text-white font-mono text-xs font-semibold shadow-xs">
                {lang === 'ar' ? (book.subjectNameAr || book.subjectNameFr) : book.subjectNameFr}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold leading-snug text-white font-serif">
              {book.title}
            </h1>

            <div className="text-xs text-blue-200/80 flex items-center gap-2">
              <Icons.Book className="w-4 h-4 text-blue-400" />
              <span>{book.pageCount} {lang === 'ar' ? 'صفحة مرقمنة' : 'pages numérisées'}</span>
              <span>•</span>
              <span>{lang === 'ar' ? 'السنة الدراسية 2026/2027' : 'Édition Tunis 2026/2027'}</span>
            </div>
          </div>

          <div className="pt-8 border-t border-blue-900/50 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-900/80 border border-blue-800 flex items-center justify-center text-xs font-bold font-mono text-blue-200">
                {book.professorName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center gap-1.5 text-sm font-bold text-white">
                  <span>{book.professorName}</span>
                  <Icons.CheckCircle className="w-4 h-4 text-blue-400" />
                </div>
                <div className="text-[11px] text-blue-200/70">
                  {lang === 'ar' ? 'أستاذ مؤلّف معتمد بيداغوجياً' : 'Auteur & Enseignant Certifié'}
                </div>
              </div>
            </div>

            {/* Quick Demo Preview Link */}
            {hasAccess && (
              <Link
                href={`/student/library/${book.id}`}
                className="w-full py-2.5 px-4 rounded-xl bg-[#1B3A57] hover:bg-blue-800 text-white text-xs font-semibold transition flex items-center justify-center gap-2"
              >
                <Icons.Eye className="w-4 h-4 text-blue-300" />
                <span>{lang === 'ar' ? 'معاينة القارئ الرقمي (صفحة 1)' : 'Ouvrir le Lecteur Numérique'}</span>
              </Link>
            )}
          </div>
        </div>

        {/* Purchase & Details Column */}
        <div className="lg:col-span-7 p-8 sm:p-10 flex flex-col justify-between space-y-8 bg-white">
          <div className="space-y-6">
            <div>
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {lang === 'ar' ? 'تقديم المؤلف البيداغوجي :' : 'Présentation de l\'ouvrage :'}
              </div>
              <p className="text-sm text-slate-700 leading-relaxed mt-2 font-serif">
                {book.description}
              </p>
            </div>

            {/* Academic Year Expiry Notice */}
            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/70 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-950">
                <Icons.Clock className="w-4 h-4 text-blue-700" />
                <span>
                  {lang === 'ar' ? 'قاعدة النفاذ للسنة الدراسية (توقيت تونس) :' : 'Validité Année Scolaire (Africa/Tunis) :'}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? `النفاذ الرقمي وجميع الإصلاحات صالح للسنة الدراسية ${activeYear.name} حتى أجل الانتهاء الرسمي المحدد : 30 جوان 2027 الساعة 23:59:59 (بتوقيت تونس).`
                  : `L'accès numérique et tous les corrigés sont valables pour l'année scolaire ${activeYear.name}, jusqu'à l'instant officiel : 30 juin 2027 à 23:59:59 (Heure de Tunis).`}
              </p>
            </div>

            {/* Corrections included banner */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200/80 flex items-center gap-3">
              <Icons.Shield className="w-5 h-5 text-blue-700 shrink-0" />
              <div className="text-xs text-blue-950">
                <strong>{lang === 'ar' ? 'إصلاحات مفصلة فورية :' : 'Corrigés détaillés immédiats :'}</strong>{' '}
                {lang === 'ar'
                  ? 'بمجرد تأكيد الاقتناء، يتم فتح جميع الإصلاحات النموذجية وشبكات التقييم المعتمدة.'
                  : 'dès la confirmation du paiement, l\'ensemble des corrections et fiches méthodologiques sont débloqués.'}
              </div>
            </div>

            {/* Payment Method Selector (if not yet owned) */}
            {!hasAccess && (
              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-700">
                  {lang === 'ar' ? 'وسيلة الدفع الوطنية المفضلة :' : 'Mode de Paiement National :'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedPaymentProvider('FLOUCI')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                      selectedPaymentProvider === 'FLOUCI'
                        ? 'bg-blue-50 border-blue-700 text-blue-900 ring-2 ring-blue-700/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>Flouci / Konnect</span>
                    <Icons.CheckCircle className={`w-4 h-4 ${selectedPaymentProvider === 'FLOUCI' ? 'text-blue-700' : 'text-slate-300'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedPaymentProvider('CARTE_BANCAIRE')}
                    className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition ${
                      selectedPaymentProvider === 'CARTE_BANCAIRE'
                        ? 'bg-blue-50 border-blue-700 text-blue-900 ring-2 ring-blue-700/20'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{lang === 'ar' ? 'بطاقة بنكية / بريدية' : 'Carte Bancaire / CIB'}</span>
                    <Icons.CheckCircle className={`w-4 h-4 ${selectedPaymentProvider === 'CARTE_BANCAIRE' ? 'text-blue-700' : 'text-slate-300'}`} />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pricing Box & CTA */}
          <div className="pt-6 border-t border-slate-100 space-y-4">
            {checkoutError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-900">
                {checkoutError}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold text-slate-400">
                  {lang === 'ar' ? 'سعر النفاذ السنوي الشامل :' : 'Tarif Unique Annuel :'}
                </div>
                <div className="flex items-baseline gap-1.5 mt-0.5">
                  <span className="text-3xl font-bold text-slate-950 font-serif">{formatDT(book.priceMillimes)}</span>
                  <span className="text-xs text-slate-400 font-mono">({book.priceMillimes} {lang === 'ar' ? 'مليم' : 'millimes'})</span>
                </div>
              </div>

              <div>
                {hasAccess ? (
                  <Link
                    href={`/student/library/${book.id}`}
                    className="px-6 py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition shadow-xs flex items-center gap-2"
                  >
                    <Icons.Eye className="w-4 h-4" />
                    <span>{lang === 'ar' ? 'فتح الكتاب في القارئ الرقمي' : 'Ouvrir le Manuel dans le Lecteur'}</span>
                  </Link>
                ) : (
                  <div className="flex flex-col sm:flex-row items-center gap-2.5">
                    <Link
                      href={`/checkout?bookId=${book.id}`}
                      className="px-4 py-3.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-semibold text-xs transition shadow-xs flex items-center gap-1.5"
                    >
                      <Icons.CreditCard className="w-3.5 h-3.5 text-blue-700" />
                      <span>{lang === 'ar' ? 'اختيار العرض (فصل / سنوي)' : 'Choisir la Formule (Trimestre / Annuel)'}</span>
                    </Link>

                    <button
                      onClick={handleBuy}
                      disabled={isProcessingCheckout}
                      className="px-6 py-3.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition shadow-xs flex items-center gap-2 disabled:opacity-50"
                    >
                      <Icons.Check className="w-4 h-4" />
                      <span>
                        {isProcessingCheckout
                          ? lang === 'ar' ? 'جارٍ المعالجة...' : 'Traitement...'
                          : lang === 'ar' ? 'تفعيل فوري' : 'Activation Immédiate'}
                      </span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chapters & Contents Syllabus Section */}
      <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex items-center justify-between pb-4 border-b border-blue-100">
          <div>
            <h3 className="text-lg font-bold text-slate-950 font-serif">
              {lang === 'ar' ? 'فهرس المحاور والتمارين المعتمدة' : 'Programme Détaillé des Chapitres'}
            </h3>
            <p className="text-xs text-slate-500">
              {lang === 'ar' ? 'جميع التمارين مرفقة بالإصلاحات البيداغوجية وسلم التقييم' : 'Chaque chapitre comporte cours illustrés, exercices types et solutions détaillées'}
            </p>
          </div>
          <span className="text-xs text-blue-700 font-bold bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            {book.chapters.length} {lang === 'ar' ? 'محاور رسمية' : 'chapitres'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {book.chapters.map((ch, idx) => (
            <div key={ch.id} className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-900">
                  {lang === 'ar' ? `المحور ${idx + 1}` : `Chapitre ${idx + 1}`}
                </span>
                <span className="text-slate-500 font-mono text-[11px]">p. {ch.startPage} – {ch.endPage}</span>
              </div>
              <h4 className="font-bold text-sm text-slate-900">{ch.title}</h4>
              {ch.exercises && ch.exercises.length > 0 && (
                <div className="pt-2 flex items-center justify-between text-xs text-slate-500 border-t border-blue-100/60">
                  <span>{ch.exercises.length} {lang === 'ar' ? 'تمارين مع الإصلاح' : 'exercices avec corrigés'}</span>
                  {hasAccess ? (
                    <Link
                      href={`/student/exercises/${ch.exercises[0].id}`}
                      className="text-blue-700 font-semibold hover:underline"
                    >
                      {lang === 'ar' ? 'حل التمارين ←' : 'Accéder aux exercices →'}
                    </Link>
                  ) : (
                    <span className="text-slate-400">{lang === 'ar' ? 'مشمول مع الكتاب' : 'Inclus à l\'achat'}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
