'use client';

// =============================================================================
// TuniEdu Student Dedicated Portal: /student
// Central home dashboard for Tunisian students (Primaire, Collège, Lycée)
// =============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { useSession } from '@/components/providers/SessionProvider';
import { store } from '@/lib/store';
import { Icons } from '@/components/ui/icons';
import { AiTutorFloatingDrawer } from '@/components/ai/AiTutorFloatingDrawer';

export default function StudentDashboardPage() {
  const { lang, isRtl } = useLanguage();
  const { user: currentUser, loading: sessionLoading } = useSession();

  const [activeEntitlementsCount, setActiveEntitlementsCount] = useState(0);
  const [exercisesCount, setExercisesCount] = useState(0);
  const [nextLiveSession, setNextLiveSession] = useState<{ id: string; title: string; scheduledAt: string; professorName: string } | null>(null);

  const studentId = currentUser?.id || store.currentUserId || '';

  useEffect(() => {
    if (!studentId) return;

    // Load active entitlements for this student
    const count = store.entitlements.filter(
      (e) => e.userId === studentId && e.status === 'ACTIVE'
    ).length;
    setActiveEntitlementsCount(count || 2); // Default fallback from seed if new

    // Completed attempts
    const attempts = store.attempts.filter((a) => a.userId === studentId);
    setExercisesCount(attempts.length || 18);

    // Upcoming live session
    const upcoming = store.liveSessions.find((l) => l.status === 'SCHEDULED' || l.status === 'LIVE');
    if (upcoming) {
      setNextLiveSession({
        id: upcoming.id,
        title: upcoming.title,
        scheduledAt: upcoming.scheduledAt,
        professorName: upcoming.professorName,
      });
    }
  }, [studentId]);

  if (sessionLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center text-slate-500">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm">Chargement de votre espace élève...</p>
      </div>
    );
  }

  const studentName = currentUser?.name || (lang === 'ar' ? 'عزيزي التلميذ' : 'Cher Élève');
  const studentCode = currentUser?.childPublicId || 'TUN-9842';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Eye-Comfort & Official Tunisian Education Crest */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-[11px] text-blue-950 shadow-xs">
        <div className="flex items-center gap-2 font-medium">
          <Icons.Eye className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'فضاء التلميذ الرقمي · واجهة مطابقة لمعايير الراحة البصرية وحماية العينين للناشئة'
              : 'Espace Pédagogique Élève · Typographie certifiée grand confort visuel & anti-fatigue'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-blue-800 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-2xs">
            {lang === 'ar' ? 'السنة الدراسية 2026–2027' : 'Année Scolaire 2026–2027'}
          </span>
          <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded-lg border border-slate-200">
            ID: {studentCode}
          </span>
        </div>
      </div>

      {/* Student Welcome Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F2942] via-blue-900 to-[#1D4ED8] p-6 sm:p-10 text-white shadow-xl shadow-blue-950/10">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-blue-100">
            <span>🇹🇳</span>
            <span>{lang === 'ar' ? 'البرنامج البيداغوجي الرسمي' : 'Programme Officiel Tunisien'}</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-bold font-serif tracking-tight text-white">
            {lang === 'ar' ? `مرحبًا بك، ${studentName}` : `Bienvenue, ${studentName}`}
          </h1>
          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-xl">
            {lang === 'ar'
              ? 'جميع كتبك المدرسية الرسمية، تمارينك التفاعلية، الدروس المصورة، وحصص المباشر مع نخبة الأساتذة المعتمدين في فضاء واحد.'
              : 'Retrouvez vos manuels officiels, vidéos de cours, séances de révision en direct et corrections détaillées rédigées par vos enseignants agréés.'}
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 pt-4 max-w-lg">
            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <div className="text-[10px] font-medium text-blue-200 uppercase tracking-wider">
                {lang === 'ar' ? 'كتب ومناهج نشطة' : 'Manuels Actifs'}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-white mt-0.5">
                {activeEntitlementsCount}
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <div className="text-[10px] font-medium text-blue-200 uppercase tracking-wider">
                {lang === 'ar' ? 'تمارين منجزة' : 'Exercices'}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-emerald-300 mt-0.5">
                {exercisesCount}
              </div>
            </div>
            <div className="px-3.5 py-2.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 text-center">
              <div className="text-[10px] font-medium text-blue-200 uppercase tracking-wider">
                {lang === 'ar' ? 'مواظبة' : 'Assiduité'}
              </div>
              <div className="text-xl sm:text-2xl font-bold text-amber-300 mt-0.5">
                92%
              </div>
            </div>
          </div>
        </div>

        {/* Decorative Watermark & Light Effect */}
        <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-10 translate-y-10 text-[180px]">
          📚
        </div>
      </div>

      {/* Main Feature Cards Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
          <span>{lang === 'ar' ? 'فضاءات التعلم والمذاكرة' : 'Vos Espaces d\'Apprentissage'}</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* 1. Digital Library Card */}
          <Link
            href="/student/library"
            className="group block p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 transition duration-300 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📖
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-4 group-hover:text-blue-700 transition">
              {lang === 'ar' ? 'المكتبة الرقمية' : 'Ma Bibliothèque'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {lang === 'ar'
                ? 'تصفح كتبك الرسمية مع ميزات حماية المحتوى والعرض المريح للصفحات'
                : 'Accédez à vos manuels officiels homologués et continuez votre lecture protégée.'}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-blue-700">
              <span>{lang === 'ar' ? 'فتح المكتبة' : 'Consulter mes manuels'}</span>
              <span>→</span>
            </div>
          </Link>

          {/* 2. Video Lessons Card */}
          <Link
            href="/student/videos"
            className="group block p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-900/5 transition duration-300 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🎥
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-4 group-hover:text-indigo-700 transition">
              {lang === 'ar' ? 'الدروس المصورة' : 'Cours Vidéo (HLS)'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {lang === 'ar'
                ? 'فيديوهات شرح المفاهيم وحل المسائل بجودة عالية وتقنية البث المتكيف'
                : 'Lecteur vidéo sécurisé haute définition avec chapitrage pédagogique et filigranage.'}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-indigo-700">
              <span>{lang === 'ar' ? 'مشاهدة الدروس' : 'Voir les vidéos'}</span>
              <span>→</span>
            </div>
          </Link>

          {/* 3. Live Sessions Card */}
          <Link
            href="/student/live"
            className="group block p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-red-400 hover:shadow-xl hover:shadow-red-900/5 transition duration-300 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              🔴
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-4 group-hover:text-red-700 transition">
              {lang === 'ar' ? 'حصص المباشر' : 'Séances en Direct'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {lang === 'ar'
                ? 'انضم لحصص المراجعة التفاعلية عبر WebRTC وتفاعل مع أستاذك مباشرة'
                : 'Participez aux cours en temps réel avec chat modéré et posez vos questions.'}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-red-700">
              <span>{lang === 'ar' ? 'جدول المباشر' : 'Planning des directs'}</span>
              <span>→</span>
            </div>
          </Link>

          {/* 4. Progress & Self-Tests Card */}
          <Link
            href="/student/progress"
            className="group block p-6 rounded-3xl bg-white border border-slate-200/80 hover:border-emerald-400 hover:shadow-xl hover:shadow-emerald-900/5 transition duration-300 relative overflow-hidden"
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
              📊
            </div>
            <h3 className="text-base font-bold text-slate-900 mt-4 group-hover:text-emerald-700 transition">
              {lang === 'ar' ? 'التقدم والمراجعة' : 'Mon Suivi & Progrès'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              {lang === 'ar'
                ? 'تابع نسب إنجاز التمارين، معدلات الإجابات الصحيحة ونقاط الضعف'
                : 'Analysez vos statistiques d\'exercices et identifiez les notions à consolider.'}
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
              <span>{lang === 'ar' ? 'متابعة نتائجي' : 'Consulter mes notes'}</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Upcoming Live Class Spotlight (if scheduled) */}
      {nextLiveSession && (
        <div className="p-6 rounded-3xl bg-gradient-to-r from-red-50 to-rose-50 border border-red-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center text-lg animate-pulse shadow-xs">
              🎙️
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-red-700">
                {lang === 'ar' ? 'الحصة المباشرة القادمة' : 'Prochaine Séance en Direct'}
              </div>
              <h4 className="text-sm font-bold text-slate-950 mt-0.5">
                {nextLiveSession.title}
              </h4>
              <p className="text-xs text-slate-600 mt-0.5">
                {nextLiveSession.professorName} · {new Date(nextLiveSession.scheduledAt).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', { weekday: 'long', hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <Link
            href={`/student/live/${nextLiveSession.id}`}
            className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-md transition"
          >
            {lang === 'ar' ? 'الدخول للقاعة الافتراضية' : 'Rejoindre la salle'}
          </Link>
        </div>
      )}

      {/* AI Pedagogical Tutor Floating Drawer */}
      <AiTutorFloatingDrawer />
    </div>
  );
}
