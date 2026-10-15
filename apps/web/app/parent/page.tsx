'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { WeeklyProgressCard } from '@/components/parent/WeeklyProgressCard';
import { Icons } from '@/components/ui/icons';
import { store } from '@/lib/store';

interface ChildRecord {
  id: string;
  code: string;
  nameFr: string;
  nameAr: string;
  levelFr: string;
  levelAr: string;
  avatar: string;
  totalStudyHours: number;
  exercisesCompleted: number;
  averageScorePercentage: number;
  weakTopicsFr: string[];
  weakTopicsAr: string[];
}

const INITIAL_CHILDREN: ChildRecord[] = [
  {
    id: 'child_1',
    code: 'TUN-9842',
    nameFr: 'Elyes Mansour',
    nameAr: 'إلياس منصور',
    levelFr: '9ème Année de Base (Concours Neufième)',
    levelAr: 'السنة التاسعة أساسي (مناظرة النوفيام)',
    avatar: '👨‍🎓',
    totalStudyHours: 6.5,
    exercisesCompleted: 28,
    averageScorePercentage: 88,
    weakTopicsFr: [
      'Développement des identités remarquables (2x - 3)²',
      'Cosinus dans un triangle rectangle (Théorème de Pythagore)',
    ],
    weakTopicsAr: [
      'نشر وتفكيك الجداءات المعتبرة (2x - 3)²',
      'جيب تمام زاوية حادة في مثلث قائم (مبرهنة فيثاغورس)',
    ],
  },
  {
    id: 'child_2',
    code: 'TUN-4190',
    nameFr: 'Yasmine Mansour',
    nameAr: 'ياسمين منصور',
    levelFr: '7ème Année de Base',
    levelAr: 'السنة السابعة أساسي',
    avatar: '👩‍🎓',
    totalStudyHours: 4.2,
    exercisesCompleted: 22,
    averageScorePercentage: 94,
    weakTopicsFr: [
      'Nombres décimaux et priorités opératoires',
      'Symétrie axiale et constructions géométriques',
    ],
    weakTopicsAr: [
      'الأعداد العشرية والأولويات في الحساب',
      'التناظر المحوري والإنشاءات الهندسية',
    ],
  },
];

export default function ParentDashboardPage() {
  const { lang, isRtl } = useLanguage();
  const [children, setChildren] = useState<ChildRecord[]>(INITIAL_CHILDREN);
  const [activeChildId, setActiveChildId] = useState<string>('child_1');
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [inputChildCode, setInputChildCode] = useState('');
  const [linkError, setLinkError] = useState('');
  const [linkSuccess, setLinkSuccess] = useState('');

  const activeChild = children.find((c) => c.id === activeChildId) || children[0];
  const liveSessions = store.liveSessions;

  const handleLinkChild = (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError('');
    setLinkSuccess('');

    const trimmed = inputChildCode.trim().toUpperCase();
    if (!trimmed.startsWith('TUN-') || trimmed.length < 8) {
      setLinkError(
        lang === 'ar'
          ? 'صيغة المعرف غير صالحة. يجب أن يبدأ بـ TUN- متبوعاً بأربعة أرقام (مثال: TUN-5520)'
          : 'Format invalide. Le code doit débuter par TUN- suivi de 4 chiffres (ex: TUN-5520)'
      );
      return;
    }

    if (children.some((c) => c.code === trimmed)) {
      setLinkError(
        lang === 'ar' ? 'هذا التلميذ مرتبط بالفعل بحسابكم.' : 'Cet élève est déjà rattaché à votre compte.'
      );
      return;
    }

    // Add new child
    const newChild: ChildRecord = {
      id: `child_${Date.now()}`,
      code: trimmed,
      nameFr: `Élève ${trimmed}`,
      nameAr: `تلميذ ${trimmed}`,
      levelFr: '8ème Année de Base',
      levelAr: 'السنة الثامنة أساسي',
      avatar: '🧒',
      totalStudyHours: 2.5,
      exercisesCompleted: 14,
      averageScorePercentage: 82,
      weakTopicsFr: ['Théorème de Thalès', 'Calcul littéral'],
      weakTopicsAr: ['مبرهنة طاليس', 'الحساب الحرفي'],
    };

    setChildren([...children, newChild]);
    setActiveChildId(newChild.id);
    setInputChildCode('');
    setLinkSuccess(
      lang === 'ar'
        ? `تم ربط التلميذ ${trimmed} بنجاح وتفعيل المتابعة الأسبوعية !`
        : `Élève ${trimmed} rattaché avec succès ! Rapports activés.`
    );
    setTimeout(() => {
      setLinkModalOpen(false);
      setLinkSuccess('');
    }, 1500);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      {/* ── TOP BANNER: DISCOVERY & SAVED PROGRESS (FROM SCREENSHOT 4) ─────────── */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-2xl shadow-inner">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm sm:text-base tracking-wide">
                {lang === 'ar' ? 'فضاء المتابعة التربوية والأولياء' : 'Espace Supervision Parentale'}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/20 text-[10px] font-bold">
                {lang === 'ar' ? 'مفعل رسمياً' : 'Actif'}
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              {lang === 'ar'
                ? 'متابعة مباشرة لساعات المذاكرة، دقة التمارين وتقدم طفلك في الكتب المدرسية التونسية.'
                : 'Suivi transparent des heures d\'étude, des scores d\'exercices et de la progression.'}
            </p>
          </div>
        </div>

        {/* Active Child Selector Pill */}
        <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 self-stretch sm:self-auto justify-between sm:justify-start">
          <div className="flex items-center gap-2 px-3 py-1 bg-white text-slate-900 rounded-xl shadow-xs">
            <span className="text-base">{activeChild.avatar}</span>
            <div className="text-left">
              <div className="text-xs font-bold leading-tight">
                {lang === 'ar' ? activeChild.nameAr : activeChild.nameFr}
              </div>
              <div className="text-[10px] text-blue-600 font-semibold">
                {lang === 'ar' ? activeChild.levelAr : activeChild.levelFr}
              </div>
            </div>
          </div>

          <button
            onClick={() => setLinkModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-blue-500 hover:bg-blue-400 text-white text-xs font-bold transition flex items-center gap-1 shadow-xs"
            title="Lier un enfant"
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{lang === 'ar' ? 'ربط ابن' : 'Ajouter'}</span>
          </button>
        </div>
      </div>

      {/* ── CHILDREN TABS IF MULTIPLE (FROM SCREENSHOT 4) ───────────────────────── */}
      {children.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <span className="text-xs font-bold text-slate-500 mr-2 shrink-0">
            {lang === 'ar' ? 'الأبناء المسجلون :' : 'Profils rattachés :'}
          </span>
          {children.map((child) => {
            const isSelected = child.id === activeChildId;
            return (
              <button
                key={child.id}
                onClick={() => setActiveChildId(child.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-xs font-bold transition shrink-0 border ${
                  isSelected
                    ? 'bg-blue-700 text-white border-blue-700 shadow-md shadow-blue-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <span>{child.avatar}</span>
                <span>{lang === 'ar' ? child.nameAr : child.nameFr}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  isSelected ? 'bg-blue-800 text-blue-200' : 'bg-slate-100 text-slate-500'
                }`}>
                  {child.code}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── MAIN TELEMETRY STATS & WEAK TOPICS ─────────────────────────────────── */}
      <WeeklyProgressCard
        childName={lang === 'ar' ? activeChild.nameAr : activeChild.nameFr}
        level={lang === 'ar' ? activeChild.levelAr : activeChild.levelFr}
        totalStudyHours={activeChild.totalStudyHours}
        exercisesCompleted={activeChild.exercisesCompleted}
        averageScorePercentage={activeChild.averageScorePercentage}
        weakTopics={lang === 'ar' ? activeChild.weakTopicsAr : activeChild.weakTopicsFr}
      />

      {/* ── CHILD'S TEXTBOOKS PROGRESS (DIRECTLY INSPIRED BY SCREENSHOT 5) ──────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {lang === 'ar' ? 'الكتب المدرسية المقررة والمقتناة' : 'Manuels & Activités de l\'Élève'}
            </span>
            <h2 className="text-xl font-extrabold text-slate-950 mt-0.5">
              {lang === 'ar' ? 'نسبة إنجاز التمارين بكل كتاب رسمي' : 'Progression par Manuel Scolaire'}
            </h2>
          </div>
          <Link
            href="/catalogue"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            <span>{lang === 'ar' ? 'إضافة كتب أخرى' : 'Explorer d\'autres manuels'}</span>
            <Icons.ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Book 1 */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition space-y-3">
            <div className="h-32 rounded-2xl bg-gradient-to-tr from-blue-700 to-sky-600 p-3 text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 self-start">
                {lang === 'ar' ? 'الرياضيات' : 'Mathématiques'}
              </span>
              <div>
                <div className="font-extrabold text-sm leading-tight">
                  {lang === 'ar' ? 'كتاب الرياضيات 9 أساسي' : 'Manuel Mathématiques 9ème'}
                </div>
                <div className="text-[10px] text-blue-100">Prof. Hichem Ben Salem</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">{lang === 'ar' ? 'نسبة التقدم :' : 'Progression :'}</span>
                <span className="text-blue-700">85%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: '85%' }} />
              </div>
            </div>
          </div>

          {/* Book 2 */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition space-y-3">
            <div className="h-32 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 p-3 text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 self-start">
                {lang === 'ar' ? 'الفيزياء' : 'Physique-Chimie'}
              </span>
              <div>
                <div className="font-extrabold text-sm leading-tight">
                  {lang === 'ar' ? 'العلوم الفيزيائية 9 أساسي' : 'Sciences Physiques 9ème'}
                </div>
                <div className="text-[10px] text-amber-100">Prof. Aida Triki</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">{lang === 'ar' ? 'نسبة التقدم :' : 'Progression :'}</span>
                <span className="text-amber-600">62%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '62%' }} />
              </div>
            </div>
          </div>

          {/* Book 3 */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition space-y-3">
            <div className="h-32 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-3 text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 self-start">
                {lang === 'ar' ? 'العربية' : 'Langue Arabe'}
              </span>
              <div>
                <div className="font-extrabold text-sm leading-tight">
                  {lang === 'ar' ? 'ينابيع القراءة واللغة' : 'Lectures & Règles d\'Arabe'}
                </div>
                <div className="text-[10px] text-emerald-100">Inspection Pédagogique</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">{lang === 'ar' ? 'نسبة التقدم :' : 'Progression :'}</span>
                <span className="text-emerald-600">90%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: '90%' }} />
              </div>
            </div>
          </div>

          {/* Book 4 */}
          <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-blue-300 transition space-y-3">
            <div className="h-32 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 p-3 text-white flex flex-col justify-between">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/20 self-start">
                {lang === 'ar' ? 'الفرنسية' : 'Français'}
              </span>
              <div>
                <div className="font-extrabold text-sm leading-tight">
                  {lang === 'ar' ? 'كراس الأنشطة الفرنسية' : 'Cahier d\'activités Français'}
                </div>
                <div className="text-[10px] text-purple-100">CNP Tunisie</div>
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-700">{lang === 'ar' ? 'نسبة التقدم :' : 'Progression :'}</span>
                <span className="text-purple-600">45%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '45%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── RECOMMENDED LIVE SESSIONS FOR CHILD (FROM SCREENSHOT 4) ────────────── */}
      <section className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {lang === 'ar' ? 'حصص المراجعة المباشرة المقترحة' : 'Directs & Ateliers Recommandés'}
            </span>
            <h2 className="text-xl font-extrabold text-slate-950 mt-0.5">
              {lang === 'ar' ? 'حصص مباشرة موجهة لمستوى طفلك' : 'Séances adaptées au niveau de l\'enfant'}
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {liveSessions.map((session) => (
            <div
              key={session.id}
              className="p-5 rounded-3xl bg-white border border-slate-200 shadow-xs hover:border-blue-400 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                    {lang === 'ar' ? '9 أساسي' : '9ème'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {lang === 'ar' ? 'السبت 16:00 - 17:30' : 'Samedi 16:00 - 17:30'}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-950">
                  {lang === 'ar' && session.titleAr ? session.titleAr : session.title}
                </h3>
                <div className="text-xs text-slate-500">
                  {lang === 'ar' ? 'الأستاذ المحاضر :' : 'Enseignant :'} <strong>{session.professorName}</strong>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
                <div className="text-right">
                  <div className="text-sm font-extrabold text-blue-700">
                    {session.priceMillimes / 1000} {lang === 'ar' ? 'د.ت' : 'TND'}
                  </div>
                  <div className="text-[10px] text-emerald-600 font-bold">
                    {session.maxParticipants - session.currentParticipants} {lang === 'ar' ? 'مقاعد شاغرة' : 'places'}
                  </div>
                </div>
                <Link
                  href={`/checkout?bookId=${session.bookId}`}
                  className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-xs"
                >
                  {lang === 'ar' ? 'تسجيل الطفل' : 'Inscrire l\'enfant'}
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── "CE QUE VOUS OBTENEZ APRÈS CRÉATION DU COMPTE" (FROM SCREENSHOT 4) ─── */}
      <section className="p-6 sm:p-8 rounded-3xl bg-slate-50 border border-slate-200/90 space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-1">
          <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            {lang === 'ar' ? 'مزايا فضاء الأولياء' : 'Garanties & Engagements'}
          </span>
          <h2 className="text-xl font-extrabold text-slate-950">
            {lang === 'ar' ? 'ما ستحصل عليه في فضاء الأولياء' : 'Ce que vous offre l\'Espace Parents TuniEdu'}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <span className="text-2xl">📈</span>
            <h3 className="font-bold text-xs text-slate-900">
              {lang === 'ar' ? 'تتبّع تقدّم طفلك خطوة بخطوة' : 'Suivi de la progression'}
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === 'ar'
                ? 'إحصائيات دقيقة لساعات المذاكرة، نسبة الدقة في الاختبارات، والمحاور التي تم استيعابها.'
                : 'Statistiques précises des heures d\'étude, des scores d\'évaluation et des notions acquises.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <span className="text-2xl">🎬</span>
            <h3 className="font-bold text-xs text-slate-900">
              {lang === 'ar' ? 'مشاهدة جميع فيديوهات الكتب' : 'Accès aux vidéos explicatives'}
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === 'ar'
                ? 'شروحات بيداغوجية مصورة بالفيديو لكل درس وتمرين لتسهيل المراجعة المنزلية.'
                : 'Démonstrations méthodologiques pas à pas réalisées par les inspecteurs officiels.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <span className="text-2xl">🔴</span>
            <h3 className="font-bold text-xs text-slate-900">
              {lang === 'ar' ? 'التسجيل في الدروس المباشرة' : 'Réservation des cours en direct'}
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === 'ar'
                ? 'حجز مقاعد تفاعلية في مجموعات صغيرة مع الأساتذة المعتمدين قبل الامتحانات الوطنية.'
                : 'Ateliers interactifs en petits groupes avant les épreuves et concours nationaux.'}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
            <span className="text-2xl">👨‍👩‍👧</span>
            <h3 className="font-bold text-xs text-slate-900">
              {lang === 'ar' ? 'ملف عائلي موحد يضم جميع الأطفال' : 'Profil familial multi-enfants'}
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {lang === 'ar'
                ? 'لوحة تحكم واحدة تمكنك من التبديل بين جميع أبنائك في الابتدائي، الأساسي والثانوي.'
                : 'Un compte unique pour suivre tous vos enfants du primaire au lycée sans friction.'}
            </p>
          </div>
        </div>
      </section>

      {/* ── LINK CHILD MODAL ──────────────────────────────────────────────────── */}
      {linkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full border border-blue-100 shadow-2xl p-6 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
                  <Icons.Users className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">
                  {lang === 'ar' ? 'ربط حساب تلميذ جديد' : 'Rattacher un Compte Enfant'}
                </h3>
              </div>
              <button
                onClick={() => setLinkModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {lang === 'ar'
                ? 'أدخل المعرف السري الخاص بطفلك (Child ID) المتاح على فضائه أو المسلم من المدرسة لتفعيل المتابعة الأسبوعية المشتركة.'
                : 'Saisissez le Child ID délivré sur l\'espace élève de votre enfant pour activer la supervision conjointe en conformité INPDP.'}
            </p>

            <form onSubmit={handleLinkChild} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-700">
                  {lang === 'ar' ? 'رمز التلميذ (Child ID) :' : 'Code Enfant (Child ID) :'}
                </label>
                <input
                  type="text"
                  value={inputChildCode}
                  onChange={(e) => setInputChildCode(e.target.value)}
                  placeholder="Ex: TUN-5520"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 font-mono text-sm text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
                />
              </div>

              {linkError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800">
                  {linkError}
                </div>
              )}

              {linkSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
                  <Icons.CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>{linkSuccess}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setLinkModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:bg-slate-100"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  disabled={!inputChildCode.trim()}
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold shadow-xs disabled:opacity-40"
                >
                  {lang === 'ar' ? 'تأكيد الربط' : 'Valider la Liaison'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
