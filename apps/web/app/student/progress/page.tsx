'use client';

import React from 'react';
import Link from 'next/link';
import { store } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { Icons } from '@/components/ui/icons';

export default function StudentProgressPage() {
  const { lang } = useLanguage();
  const currentUserId = store.currentUserId;
  const attempts = store.attempts.filter((a) => a.userId === currentUserId);
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const totalScore = attempts.reduce((acc, a) => acc + a.score, 0);
  const accuracyPercent = attempts.length > 0 ? Math.round((correctCount / attempts.length) * 100) : 88;

  const achievements = [
    {
      titleFr: 'Candidat Pilote Certifié',
      titleAr: 'مترشح معاهد نموذجية مؤهل',
      descFr: 'Score global supérieur à 85% aux épreuves d\'application.',
      descAr: 'معدل عام يفوق 85% في التمارين التطبيقية.',
      icon: Icons.GraduationCap,
      color: 'bg-blue-50 text-blue-800 border-blue-200',
    },
    {
      titleFr: 'Maîtrise des Radicaux',
      titleAr: 'إتقان حساب الجذور التربيعية',
      descFr: '3 exercices résolus sans faute sur le chapitre 1.',
      descAr: '3 تمارين منجزة دون خطأ في المحور الأول.',
      icon: Icons.Sparkles,
      color: 'bg-amber-50 text-amber-800 border-amber-200',
    },
    {
      titleFr: 'Assiduité Exemplaire',
      titleAr: 'مواظبة نموذجية',
      descFr: 'Sessions actives enregistrées dans le fuseau Africa/Tunis.',
      descAr: 'جلسات مذاكرة منتظمة مسجلة بتوقيت تونس.',
      icon: Icons.Clock,
      color: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    },
  ];

  const chaptersProgress = [
    { titleFr: 'Les Racines Carrées dans ℝ', titleAr: 'الجذور التربيعية في ℝ', score: 95, statusFr: 'Maîtrisé', statusAr: 'مكتسب' },
    { titleFr: 'Calcul Littéral & Identités Remarquables', titleAr: 'الحساب الحرفي والجداءات المعتبرة', score: 82, statusFr: 'En consolidation', statusAr: 'قيد التدعيم' },
    { titleFr: 'Théorème de Pythagore & Trigonométrie', titleAr: 'مبرهنة فيثاغورس وحساب المثلثات', score: 88, statusFr: 'Maîtrisé', statusAr: 'مكتسب' },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Eye-Comfort Notification */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-[11px] text-blue-950 shadow-xs">
        <div className="flex items-center gap-2 font-medium">
          <Icons.Eye className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'سجل التقييمات البيداغوجية · تتبع موضوعي لمستوى التحصيل للمناظرات'
              : 'Relevé d\'évaluation pédagogique · Suivi continu des compétences scolaires'}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200">
          {lang === 'ar' ? 'متابعة رسمية' : 'Suivi Officiel'}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-blue-100">
        <div>
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            {lang === 'ar' ? 'فضاء التقييم الفردي' : 'Tableau de Bord Personnel'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif tracking-tight mt-1">
            {lang === 'ar' ? 'تقدمي المدرسي وسجل التقييمات' : 'Mes Progrès & Historique des Évaluations'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'متابعة التحضير للمناظرات الوطنية وساعات المواظبة الأسبوعية.'
              : 'Suivi de votre préparation aux concours et de votre assiduité scolaire.'}
          </p>
        </div>

        <Link
          href="/student/library"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-700 text-white font-semibold text-xs hover:bg-blue-800 transition shadow-xs"
        >
          <Icons.Book className="w-4 h-4" />
          <span>{lang === 'ar' ? 'مواصلة المراجعة' : 'Continuer mes Révisions'}</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {lang === 'ar' ? 'التمارين المنجزة' : 'Exercices Traités'}
          </div>
          <div className="text-3xl font-bold text-slate-950 font-serif">{attempts.length || 18}</div>
          <div className="text-xs text-blue-700 font-medium">
            {correctCount || 16} {lang === 'ar' ? 'إجابات صحيحة' : 'succès'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {lang === 'ar' ? 'مجموع النقاط' : 'Points Cumulés'}
          </div>
          <div className="text-3xl font-bold text-blue-700 font-serif">{totalScore || 48} pts</div>
          <div className="text-xs text-slate-500">
            {lang === 'ar' ? 'عبر الكتب المفعلة' : 'Sur les manuels'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-100 shadow-sm space-y-1">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {lang === 'ar' ? 'معدل الدقة والنجاح' : 'Taux d\'Exactitude'}
          </div>
          <div className="text-3xl font-bold text-emerald-600 font-serif">{accuracyPercent}%</div>
          <div className="text-xs text-slate-500">
            {lang === 'ar' ? 'مؤشر ممتاز' : 'Niveau de maîtrise élevé'}
          </div>
        </div>

        <div className="bg-[#0F2942] text-white p-5 rounded-3xl border border-[#0A1C2E] shadow-sm space-y-1">
          <div className="text-xs font-semibold text-blue-200 uppercase tracking-wider">
            {lang === 'ar' ? 'ساعات المذاكرة' : 'Temps d\'Étude'}
          </div>
          <div className="text-3xl font-bold text-white font-serif">4h 15m</div>
          <div className="text-[11px] text-blue-300">
            {lang === 'ar' ? 'توقيت تونس الرسمي' : 'Africa/Tunis certifié'}
          </div>
        </div>
      </div>

      {/* Exam Readiness & Achievements Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Achievements */}
        <div className="md:col-span-1 bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Icons.Sparkles className="w-4 h-4 text-amber-500" />
            <h3 className="font-bold text-sm text-slate-900">
              {lang === 'ar' ? 'أوسمة الجدارة والتفوق' : 'Badges & Distinctions'}
            </h3>
          </div>
          <div className="space-y-3">
            {achievements.map((a, idx) => {
              const IconComp = a.icon;
              return (
                <div key={idx} className={`p-3.5 rounded-2xl border ${a.color} space-y-1`}>
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <IconComp className="w-4 h-4" />
                    <span>{lang === 'ar' ? a.titleAr : a.titleFr}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {lang === 'ar' ? a.descAr : a.descFr}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chapters Mastery Overview */}
        <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-blue-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-sm text-slate-900">
              {lang === 'ar' ? 'مستوى التمكن من المحاور الرسمية' : 'Maîtrise par Chapitre du Programme'}
            </h3>
            <span className="text-xs text-blue-700 font-semibold">
              {lang === 'ar' ? 'برنامج مناظرة النوفيام' : 'Concours Neufième'}
            </span>
          </div>

          <div className="space-y-4 pt-1">
            {chaptersProgress.map((cp, idx) => (
              <div key={idx} className="space-y-1.5 bg-slate-50 p-4 rounded-2xl border border-slate-200/70">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                  <span>{lang === 'ar' ? cp.titleAr : cp.titleFr}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-sans font-bold">
                      {lang === 'ar' ? cp.statusAr : cp.statusFr}
                    </span>
                    <span className="text-blue-700 font-bold">{cp.score}%</span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${cp.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Attempts History Table */}
      <div className="bg-white rounded-3xl border border-blue-100 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-blue-100">
          <h3 className="font-bold text-base text-slate-950 font-serif">
            {lang === 'ar' ? 'سجل المحاولات والإصلاحات البيداغوجية' : 'Dernières Soumissions & Corrigés Consultés'}
          </h3>
          <p className="text-xs text-slate-500">
            {lang === 'ar' ? 'تفاصيل الإجابات والتحقق الآلي' : 'Détail de vos réponses et vérifications automatiques'}
          </p>
        </div>

        <div className="divide-y divide-slate-100 overflow-x-auto">
          {attempts.map((att) => (
            <div key={att.id} className="p-4 sm:p-5 flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    att.isCorrect
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                  }`}
                >
                  {att.isCorrect ? '✓' : '✗'}
                </span>
                <div className="min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    Exercice réf. {att.exerciseId}
                  </div>
                  <div className="text-slate-500 text-[11px] font-mono">
                    Réponse soumise : &quot;{att.submittedAnswer}&quot;
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-right shrink-0">
                <div>
                  <div className="font-bold text-blue-700 font-mono">+{att.score} pts</div>
                  <div className="text-[10px] text-slate-400">
                    {new Date(att.submittedAt).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
