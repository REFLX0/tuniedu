'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLanguage } from '@/lib/language-context';
import { store, Book } from '@/lib/store';
import { BookCard } from '@/components/catalogue/BookCard';
import { BookPreviewModal } from '@/components/catalogue/BookPreviewModal';
import { Icons } from '@/components/ui/icons';

export default function HomePage() {
  const { lang, t, isRtl } = useLanguage();
  const [selectedStage, setSelectedStage] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('ALL');
  const [billingPeriod, setBillingPeriod] = useState<'MONTHLY' | 'TRIMESTER' | 'ANNUAL'>('MONTHLY');
  const [previewBook, setPreviewBook] = useState<Book | null>(null);

  const books = store.books;
  const liveSessions = store.liveSessions;

  // Filter books based on stage, subject, and search query
  const filteredBooks = books.filter((b) => {
    const matchesStage = selectedStage === 'ALL' || b.stage === selectedStage;
    const matchesSubject = selectedSubject === 'ALL' || b.subjectId === selectedSubject;
    const matchesQuery =
      searchQuery.trim() === '' ||
      b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.levelNameFr.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.professorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStage && matchesSubject && matchesQuery;
  });

  const SUBJECTS_LIST = [
    { id: 'ALL', nameFr: 'Toutes les matières', nameAr: 'جميع المواد', icon: '📚' },
    { id: 'subj_math', nameFr: 'Mathématiques', nameAr: 'الرياضيات', icon: '📐' },
    { id: 'subj_phys', nameFr: 'Physique & Chimie', nameAr: 'الفيزياء والكيمياء', icon: '⚡' },
    { id: 'subj_ara', nameFr: 'Langue Arabe', nameAr: 'اللغة العربية', icon: '📖' },
    { id: 'subj_fra', nameFr: 'Français', nameAr: 'اللغة الفرنسية', icon: '✍️' },
    { id: 'subj_svt', nameFr: 'Sciences (SVT)', nameAr: 'علوم الحياة والأرض', icon: '🔬' },
    { id: 'subj_info', nameFr: 'Informatique', nameAr: 'الإعلامية والبرمجة', icon: '💻' },
    { id: 'subj_philo', nameFr: 'Philosophie', nameAr: 'الفلسفة', icon: '🏛️' },
  ];

  const STAGE_OPTIONS = [
    { id: 'ALL', label: t.levels.all },
    { id: 'COLLEGE', label: t.levels.college, badge: lang === 'ar' ? 'مناظرة النوفيام' : 'Concours 9ème' },
    { id: 'PRIMAIRE', label: t.levels.primary, badge: lang === 'ar' ? 'مناظرة السيزيام' : 'Concours 6ème' },
    { id: 'LYCEE', label: lang === 'ar' ? 'التعليم الثانوي' : 'Lycée', badge: lang === 'ar' ? 'مناظرة البكالوريا' : 'Baccalauréat' },
  ];

  return (
    <div className="space-y-12 pb-20">
      {/* ── 01. TOP EYE-COMFORT & OFFICIAL CERTIFICATION BANNER ─────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-2.5 bg-gradient-to-r from-blue-50 via-sky-50 to-indigo-50 border border-blue-200/90 rounded-2xl text-[11px] text-blue-950 shadow-xs">
          <div className="flex items-center gap-2.5 font-medium">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600" />
            </span>
            <span>
              {lang === 'ar'
                ? 'منظومة بيداغوجية رقمية مريحة للعينين · مطابقة للبرامج الرسمية لوزارة التربية التونسية وحماية المعطيات الشخصية (INPDP)'
                : 'Ergonomie visuelle certifiée pour les élèves · Conforme aux programmes officiels du Ministère et à la loi INPDP'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 bg-white/90 px-3 py-1 rounded-full border border-blue-200 shadow-xs">
              🇹🇳 {lang === 'ar' ? 'معتمد رسميًا 2026' : 'Homologué 2026'}
            </span>
          </div>
        </div>
      </div>

      {/* ── 02. HERO SECTION WITH AUTHENTIC SIDI BOU SAID PHOTOGRAPHY ────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-b from-blue-50/70 via-white to-white border-b border-blue-100/80 pt-6 pb-12 sm:pt-10 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Visual Column: Authentic Tunisian Students Photography */}
            <div className="lg:col-span-5 order-2 lg:order-1">
              <div className="relative rounded-3xl overflow-hidden border-4 border-white shadow-2xl shadow-blue-900/10 group">
                <div className="aspect-[4/3] relative">
                  <Image
                    src="/images/hero-students-sidi-bou-said.jpg"
                    alt="Élèves tunisiens révisant à Sidi Bou Said"
                    fill
                    sizes="(max-width: 1024px) 100vw, 500px"
                    className="object-cover group-hover:scale-102 transition-transform duration-700"
                  />
                  {/* Subtle Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Floating Badge Over Image: Authentic Tunisian Identity */}
                <div className="absolute bottom-4 left-4 right-4 p-3.5 rounded-2xl bg-white/95 backdrop-blur-md border border-white/80 shadow-lg text-slate-900 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center text-xl shadow-xs">
                      🇹🇳
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {lang === 'ar' ? 'مصمم لتونس' : 'Conçu pour la Tunisie'}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {lang === 'ar' ? 'من السنة 1 ابتدائي إلى البكالوريا' : 'De la 1ère primaire au Baccalauréat'}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                      {lang === 'ar' ? 'أساتذة متفقدون' : 'Inspecteurs Vérifiés'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Editorial Column: Inspiring Headline & Calls to Action */}
            <div className="lg:col-span-7 order-1 lg:order-2 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-100/80 border border-blue-200 text-blue-900 text-xs font-semibold shadow-xs">
                <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                <span>{lang === 'ar' ? 'المنصة الوطنية الرائدة للكتب والدروس والذكاء الاصطناعي' : t.officialProgramme}</span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-950 leading-[1.15]">
                {lang === 'ar' ? (
                  <>
                    من فكرة إلى درس متكامل. <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600">
                      بكل بساطة واحترافية.
                    </span>
                  </>
                ) : (
                  <>
                    De l&apos;idée au cours complet. <br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-600 to-sky-600">
                      En toute rigueur pédagogique.
                    </span>
                  </>
                )}
              </h1>

              <p className="text-sm sm:text-base text-slate-600 max-w-xl leading-relaxed">
                {lang === 'ar'
                  ? 'حضّر دروسًا وتمارين واختبارات انطلاقًا من الكتب المدرسية التونسية الرسمية. استمع لحصص البث المباشر مع نخبة الأساتذة، وتعلّم مع المساعد البيداغوجي الذكي مع ضمان مراجعة الأستاذ.'
                  : 'Préparez vos cours, exercices et examens à partir des manuels officiels tunisiens. Suivez les cours en direct avec des enseignants agrégés et progressez avec le Tuteur IA socratique validé par vos professeurs.'}
              </p>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-3.5">
                <Link
                  href="/professor"
                  className="px-7 py-3.5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-bold text-xs tracking-wide transition shadow-lg shadow-blue-600/25 flex items-center justify-center gap-2.5 hover:scale-[1.02]"
                >
                  <Icons.FileText className="w-4 h-4 text-blue-200" />
                  <span>{lang === 'ar' ? 'أنشئ وثيقة أو درس ←' : 'Créer un document ou cours →'}</span>
                </Link>

                <Link
                  href="/catalogue"
                  className="px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300/80 font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 hover:border-blue-300"
                >
                  <Icons.Search className="w-4 h-4 text-blue-600" />
                  <span>{lang === 'ar' ? 'تصفح الدروس الجاهزة' : 'Consulter les cours & manuels'}</span>
                </Link>
              </div>

              {/* Format & Trust Badges */}
              <div className="pt-4 flex flex-wrap items-center gap-4 text-[11px] text-slate-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700">📄</span>
                  <span>PDF & DOCX</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700">🎥</span>
                  <span>Vidéos HLS & Streaming</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-700">🤖</span>
                  <span>Tuteur IA Socratique</span>
                </div>
                <span className="text-slate-300">•</span>
                <div className="flex items-center gap-1.5 text-blue-700 font-semibold">
                  <span>🇹🇳</span>
                  <span>العربية • Français</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 03. "QUE SOUHAITEZ-VOUS FAIRE ?" (ACTION HUB DIRECTLY FROM SCREENSHOT 2) ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-8 space-y-2">
          <div className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 uppercase tracking-wider">
            <span>✨</span>
            <span>{lang === 'ar' ? 'مسارات العمل والتعلم' : 'Parcours & Accès Rapide'}</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight">
            {lang === 'ar' ? 'ماذا تريد أن تفعل اليوم؟' : 'Que souhaitez-vous faire aujourd\'hui ?'}
          </h2>
          <p className="text-xs text-slate-500">
            {lang === 'ar'
              ? 'اختر المسار البيداغوجي الذي تبحث عنه للوصول المباشر إلى أدواتك المخصصة.'
              : 'Accédez directement aux espaces dédiés selon votre profil d\'élève, d\'enseignant ou de parent.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Action Card 1: Create Document */}
          <Link
            href="/professor"
            className="group relative p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                ✍️
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-950 group-hover:text-blue-700 transition">
                  {lang === 'ar' ? 'إنشاء وثيقة ودرس' : 'Créer un document'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === 'ar'
                    ? 'اختر البرنامج والموضوع، ثم أنشئ درسًا أو تمارين أو اختبارًا مع رفع مستنداتك وتوزيعها.'
                    : 'Sélectionnez le niveau et préparez vos cours, fiches d\'exercices et examens certifiés.'}
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-blue-600">
              <span>{lang === 'ar' ? 'فضاء الأستاذ المؤلّف' : 'Studio Auteur'}</span>
              <Icons.ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
            </div>
          </Link>

          {/* Action Card 2: My Documents */}
          <Link
            href="/student/library"
            className="group relative p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 text-white flex items-center justify-center text-2xl shadow-md shadow-amber-500/20 group-hover:scale-110 transition-transform">
                📁
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-950 group-hover:text-blue-700 transition">
                  {lang === 'ar' ? 'وثائقي ومكتبتي' : 'Mes documents & manuels'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === 'ar'
                    ? 'ارجع إلى كتبك المقتناة ووثائقك المحفوظة لتعديلها أو مراجعتها عبر القارئ المحمي.'
                    : 'Accédez à votre bibliothèque personnelle avec lecteur sécurisé et filigranes anti-copie.'}
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600">
              <span>{lang === 'ar' ? 'مكتبة التلميذ' : 'Bibliothèque active'}</span>
              <Icons.ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
            </div>
          </Link>

          {/* Action Card 3: Ready Lessons & Textbooks */}
          <Link
            href="/catalogue"
            className="group relative p-6 rounded-3xl bg-white border border-slate-200/90 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 text-white flex items-center justify-center text-2xl shadow-md shadow-sky-500/20 group-hover:scale-110 transition-transform">
                📚
              </div>
              <div className="space-y-1.5">
                <h3 className="font-bold text-base text-slate-950 group-hover:text-blue-700 transition">
                  {lang === 'ar' ? 'دروس وكتب جاهزة' : 'Cours & manuels homologués'}
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === 'ar'
                    ? 'تصفح الدروس حسب المستوى واللغة والمادة، واقتنِ النسخ والتمارين المحلولة بأسعار مدروسة.'
                    : 'Parcourez le catalogue officiel du primaire au baccalauréat avec démonstrations pas à pas.'}
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-sky-600">
              <span>{lang === 'ar' ? 'دليل الكتب التونسية' : 'Catalogue CNP'}</span>
              <Icons.ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
            </div>
          </Link>

          {/* Action Card 4: AI Tutor & Live Classes */}
          <Link
            href="/student/library/book_math_9b"
            className="group relative p-6 rounded-3xl bg-gradient-to-b from-purple-50/50 to-white border border-purple-200/90 hover:border-purple-400 hover:shadow-xl hover:shadow-purple-500/10 transition-all duration-300 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-pink-500 text-white flex items-center justify-center text-2xl shadow-md shadow-purple-500/20 group-hover:scale-110 transition-transform">
                🤖
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-base text-slate-950 group-hover:text-purple-700 transition">
                    {lang === 'ar' ? 'المساعد البيداغوجي' : 'Tuteur IA Socratique'}
                  </h3>
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-purple-100 text-purple-700">
                    IA
                  </span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {lang === 'ar'
                    ? 'افهم أسباب تعلّم كل درس، واحصل على إرشادات ذكية دون كشف الحل، مع رقابة مشددة من الأستاذ.'
                    : 'Méthode socratique : découvrez le sens pratique de chaque notion avec contrôle strict des inspecteurs.'}
                </p>
              </div>
            </div>
            <div className="pt-4 mt-2 border-t border-purple-100 flex items-center justify-between text-xs font-bold text-purple-600">
              <span>{lang === 'ar' ? 'مساعد التلميذ الذكي' : 'Essayer le Tuteur IA'}</span>
              <Icons.ChevronRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRtl ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
            </div>
          </Link>
        </div>
      </section>

      {/* ── 04. UNIFIED SEARCH & FILTER BAR (DIRECTLY INSPIRED BY SCREENSHOT 2) ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-4 sm:p-5 rounded-3xl bg-white border border-slate-200 shadow-md shadow-slate-200/40">
          <div className="flex flex-col lg:flex-row items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Icons.Search className={`w-4 h-4 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-4' : 'left-4'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  lang === 'ar'
                    ? 'ابحث عن درس، كتاب مدرسي، أستاذ أو محور...'
                    : 'Rechercher un cours, un manuel officiel ou un enseignant...'
                }
                className={`w-full py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium focus:outline-none focus:border-blue-600 focus:bg-white transition text-slate-900 ${
                  isRtl ? 'pr-11 pl-4' : 'pl-11 pr-4'
                }`}
              />
            </div>

            {/* Level Selector Dropdown */}
            <div className="w-full lg:w-56">
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {STAGE_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject Selector Dropdown */}
            <div className="w-full lg:w-56">
              <select
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {SUBJECTS_LIST.map((subj) => (
                  <option key={subj.id} value={subj.id}>
                    {subj.icon} {lang === 'ar' ? subj.nameAr : subj.nameFr}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Button */}
            <button
              onClick={() => {}}
              className="w-full lg:w-auto px-8 py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2 shrink-0"
            >
              <Icons.Search className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'بحث سريع' : 'Rechercher'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── 05. SUBJECTS CAROUSEL PILLS (FROM SCREENSHOT 5) ─────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {lang === 'ar' ? 'المواد الدراسية الرسمية' : 'Matières Principales'}
            </span>
            <h2 className="text-xl font-extrabold text-slate-950 mt-0.5">
              {lang === 'ar' ? 'اختر مادة لعرض الكتب المدرسية' : 'Sélectionnez une matière pour voir les manuels'}
            </h2>
          </div>
          <Link
            href="/catalogue"
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1"
          >
            <span>{lang === 'ar' ? 'عرض الكل' : 'Voir tout'}</span>
            <Icons.ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 pt-4">
          {SUBJECTS_LIST.map((subj) => {
            const isSelected = selectedSubject === subj.id;
            return (
              <button
                key={subj.id}
                onClick={() => setSelectedSubject(subj.id)}
                className={`p-3.5 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${
                  isSelected
                    ? 'bg-blue-700 text-white border-blue-700 shadow-md shadow-blue-600/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                }`}
              >
                <span className="text-2xl">{subj.icon}</span>
                <span className="text-[11px] font-bold line-clamp-1">
                  {lang === 'ar' ? subj.nameAr : subj.nameFr}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* ── 06. OFFICIAL TEXTBOOKS GRID (INSPIRED BY SCREENSHOT 5) ───────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {lang === 'ar' ? 'الكتب المدرسية المعتمدة' : 'Manuels & Corrigés Types'}
            </span>
            <h2 className="text-2xl font-extrabold text-slate-950 tracking-tight mt-0.5">
              {lang === 'ar' ? 'أدلة التمارين والإصلاحات البيداغوجية' : 'Ouvrages Pédagogiques Officiels'}
            </h2>
          </div>
          <span className="text-xs font-semibold text-slate-500">
            {filteredBooks.length} {lang === 'ar' ? 'مؤلف متوفر' : 'ouvrages disponibles'}
          </span>
        </div>

        {/* Book Cards Grid */}
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
      </section>

      {/* ── 07. UPCOMING LIVE BROADCASTS & STREAMING (FROM SCREENSHOT 4) ─────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-tr from-slate-900 via-blue-950 to-slate-900 text-white space-y-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold">
                <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                <span>{lang === 'ar' ? 'حصص البث المباشر التفاعلية' : 'Séances de Cours en Direct'}</span>
              </div>
              <h2 className="text-2xl font-extrabold text-white">
                {lang === 'ar' ? 'المجموعات المباشرة مع الأساتذة المعتمدين' : 'Directs & Ateliers Pédagogiques'}
              </h2>
            </div>
            <Link
              href="/professor"
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition self-start sm:self-auto shrink-0 shadow-xs"
            >
              {lang === 'ar' ? 'انضمام كأستاذ محاضر' : 'Rejoindre le studio enseignant'}
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {liveSessions.map((session) => (
              <div
                key={session.id}
                className="p-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 hover:border-blue-400/50 transition space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/30 text-blue-200 border border-blue-400/30">
                    {lang === 'ar' ? '9 أساسي' : '9ème de Base'}
                  </span>
                  <div className="flex items-center gap-1.5 text-xs text-amber-300 font-bold">
                    <span>{session.priceMillimes / 1000}</span>
                    <span>{lang === 'ar' ? 'د.ت' : 'TND'}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-white line-clamp-1">
                    {lang === 'ar' && session.titleAr ? session.titleAr : session.title}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>👨‍🏫</span>
                    <span>{session.professorName}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-1 text-[11px]">
                    <Icons.Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{lang === 'ar' ? 'السبت 16:00' : 'Samedi 16:00'}</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 font-bold">
                    {session.maxParticipants - session.currentParticipants} {lang === 'ar' ? 'أماكن متاحة' : 'places'}
                  </span>
                </div>

                <Link
                  href={`/checkout?bookId=${session.bookId}`}
                  className="w-full py-2.5 rounded-xl bg-white text-slate-950 hover:bg-blue-50 font-bold text-xs transition flex items-center justify-center gap-1.5"
                >
                  <Icons.Video className="w-3.5 h-3.5 text-blue-600" />
                  <span>{lang === 'ar' ? 'حجز مقعد بالبث المباشر' : 'Réserver une place'}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 08. TRANSPARENT SUBSCRIPTIONS & TRIMESTER QUOTAS (FROM SCREENSHOT 1) ─ */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold">
            <span>💳</span>
            <span>{lang === 'ar' ? 'اشتراكات بسيطة وشفافة' : 'Tarification Transparente'}</span>
          </div>
          <h2 className="text-3xl font-extrabold text-slate-950 tracking-tight">
            {lang === 'ar' ? 'اشتراكات بسيطة وشفافة مطابقة للثلاثيات' : 'Formules Adaptées au Rythme Trimestriel'}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto">
            {lang === 'ar'
              ? 'يتم تفعيل الاشتراكات بدقة متناهية عبر بوابات الدفع الوطنية (Flouci, Konnect, GPG) مع صلاحية سنوية ثابتة.'
              : 'Activez vos accès par livre, par trimestre (T1, T2, T3) ou via le pass annuel complet.'}
          </p>

          {/* Billing Switcher: Monthly vs Trimester vs Annual */}
          <div className="pt-2 flex items-center justify-center">
            <div className="p-1 rounded-full bg-slate-100 border border-slate-200 inline-flex items-center gap-1 shadow-inner text-xs font-bold">
              <button
                onClick={() => setBillingPeriod('MONTHLY')}
                className={`px-5 py-2 rounded-full transition ${
                  billingPeriod === 'MONTHLY'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {lang === 'ar' ? 'شهري' : 'Mensuel'}
              </button>
              <button
                onClick={() => setBillingPeriod('TRIMESTER')}
                className={`px-5 py-2 rounded-full transition ${
                  billingPeriod === 'TRIMESTER'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {lang === 'ar' ? 'حزمة الثلاثي (T1 / T2 / T3)' : 'Pack Trimestre'}
              </button>
              <button
                onClick={() => setBillingPeriod('ANNUAL')}
                className={`px-5 py-2 rounded-full transition ${
                  billingPeriod === 'ANNUAL'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {lang === 'ar' ? 'سنوي (تخفيض 40%)' : 'Pass Annuel (-40%)'}
              </button>
            </div>
          </div>
        </div>

        {/* 4 Pricing Cards (Identical Layout Logic to Screenshot 1, Elevated) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {/* Card 1: Discovery (Free) */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 hover:border-slate-300 transition flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {lang === 'ar' ? 'اكتشاف' : 'Découverte'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-slate-950">0</span>
                  <span className="text-xs text-slate-500">{lang === 'ar' ? 'د.ت / شهر' : 'TND'}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-slate-600 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'ar' ? '3 وثائق وفصول نموذجية / شهر' : '3 documents & chapitres / mois'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'ar' ? 'مطابقة متحققة مع برامج CNP' : 'Conformité officielle CNP'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'ar' ? 'استشارة تجريبية للمساعد الذكي' : 'Démo tuteur IA socratique'}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {}}
              className="mt-6 w-full py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition"
            >
              {lang === 'ar' ? 'باقة مجانية' : 'Formule Gratuite'}
            </button>
          </div>

          {/* Card 2: Student Pack */}
          <div className="p-6 rounded-3xl bg-white border-2 border-blue-500 shadow-xl shadow-blue-500/10 transition flex flex-col justify-between relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-wider shadow-sm">
              {lang === 'ar' ? 'الأكثر طلباً' : 'Recommandé'}
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600">
                  {lang === 'ar' ? 'باقة التلميذ' : 'Pack Élève'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-blue-900">
                    {billingPeriod === 'TRIMESTER' ? '45.000' : billingPeriod === 'ANNUAL' ? '98.000' : '19.900'}
                  </span>
                  <span className="text-xs text-slate-500">
                    {lang === 'ar'
                      ? billingPeriod === 'TRIMESTER' ? 'د.ت / ثلاثي' : billingPeriod === 'ANNUAL' ? 'د.ت / سنة' : 'د.ت / شهر'
                      : billingPeriod === 'TRIMESTER' ? 'TND / trim.' : billingPeriod === 'ANNUAL' ? 'TND / an' : 'TND / mois'}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-slate-700 border-t border-slate-100">
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'ar' ? 'نفاذ كامل لكافة فصول الكتاب' : 'Accès complet au manuel'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'ar' ? 'حلول نموذجية خطوة بخطوة' : 'Corrigés pas à pas certifiés'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'ar' ? 'مساعد بيداغوجي ذكي غير محدود' : 'Tuteur IA socratique illimité'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{lang === 'ar' ? 'فيديوهات الشرح بجودة عالية (HLS)' : 'Vidéos explicatives HLS'}</span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout?bookId=book_math_9b"
              className="mt-6 w-full py-3 rounded-2xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs transition shadow-md shadow-blue-600/20 text-center"
            >
              {lang === 'ar' ? 'اطلب التفعيل الآن ←' : 'Activer cet abonnement →'}
            </Link>
          </div>

          {/* Card 3: Teacher Studio Pack */}
          <div className="p-6 rounded-3xl bg-blue-50/70 border border-blue-200 transition flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800">
                  {lang === 'ar' ? 'باقة المدرّس والمؤلّف' : 'Studio Enseignant'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-slate-900">29.900</span>
                  <span className="text-xs text-slate-500">{lang === 'ar' ? 'د.ت / شهر' : 'TND / mois'}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-slate-700 border-t border-blue-200/60">
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{lang === 'ar' ? 'إيداع ونشر غير محدود للكتب (PDF)' : 'Publication manuels illimitée'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{lang === 'ar' ? 'استوديو بث مباشر مدمج للدروس' : 'Studio live streaming WebRTC'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{lang === 'ar' ? 'لوحة تدقيق إصلاحات الذكاء الاصطناعي' : 'File de revue des réponses IA'}</span>
                </div>
                <div className="flex items-center gap-2 font-bold text-blue-900">
                  <Icons.Check className="w-4 h-4 text-blue-700 shrink-0" />
                  <span>{lang === 'ar' ? '80% أرباح صافية للأستاذ المؤلّف' : '80% de reversement net auteur'}</span>
                </div>
              </div>
            </div>

            <Link
              href="/professor"
              className="mt-6 w-full py-3 rounded-2xl bg-blue-900 hover:bg-slate-900 text-white font-bold text-xs transition text-center"
            >
              {lang === 'ar' ? 'انضم كأستاذ معتمد' : 'Rejoindre en tant qu\'auteur'}
            </Link>
          </div>

          {/* Card 4: Pro Plus (Dark Luxury Card from Screenshot 1) */}
          <div className="p-6 rounded-3xl bg-slate-950 text-white border border-slate-800 transition flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="space-y-4 relative z-10">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                  {lang === 'ar' ? 'الباقة الشاملة Pro Plus' : 'Pro Plus Annuel'}
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-3xl font-extrabold text-white">39.900</span>
                  <span className="text-xs text-slate-400">{lang === 'ar' ? 'د.ت / شهر' : 'TND / mois'}</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 text-xs text-slate-300 border-t border-slate-800">
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{lang === 'ar' ? '300 وثيقة واختبار / شهر' : '300 documents & tests / mois'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{lang === 'ar' ? 'مع الإصلاح النموذجي أو دونه' : 'Avec ou sans corrigé type'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{lang === 'ar' ? 'فضاء متابعة عائلية متكامل للأولياء' : 'Espace de télémétrie parentale'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Icons.Check className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>{lang === 'ar' ? 'أولوية في حصص البث المباشر' : 'Accès prioritaire aux directs'}</span>
                </div>
              </div>
            </div>

            <Link
              href="/checkout?bookId=book_math_9b"
              className="mt-6 w-full py-3 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold text-xs transition text-center shadow-lg shadow-purple-600/30 relative z-10"
            >
              {lang === 'ar' ? 'اطلب التفعيل' : 'Activer Pro Plus'}
            </Link>
          </div>
        </div>
      </section>

      {/* ── 09. TRUST, SECURITY & INPDP PILLARS (FROM SCREENSHOT 2) ─────────────── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/90 shadow-xs">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center sm:text-left">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center text-xl mx-auto sm:mx-0">
                🖥️
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                {lang === 'ar' ? 'واجهة سهلة وبسيطة' : 'Interface Fluide & Ergonomique'}
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'ar' ? 'تجربة استخدام سلسة على الحواسيب، اللوحات والهواتف.' : 'Expérience optimisée pour un confort de lecture maximal.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center text-xl mx-auto sm:mx-0">
                🔄
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                {lang === 'ar' ? 'تحديثات مستمرة' : 'Actualisation Permanente'}
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'ar' ? 'محتوى متجدد بانتظام ومطابق للبرامج الرسمية التونسية.' : 'Mise à jour synchronisée avec le calendrier scolaire officiel.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center text-xl mx-auto sm:mx-0">
                🛡️
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                {lang === 'ar' ? 'خصوصية وأمان (INPDP)' : 'Protection des Données (INPDP)'}
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'ar' ? 'بيانات وحسابات محمية وفق القانون التونسي 2004-63.' : 'Conformité stricte à la législation tunisienne sur les mineurs.'}
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center text-xl mx-auto sm:mx-0">
                👨‍👩‍👧
              </div>
              <h3 className="font-bold text-xs sm:text-sm text-slate-900">
                {lang === 'ar' ? 'متابعة بيداغوجية للأولياء' : 'Télémétrie Parentale'}
              </h3>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'ar' ? 'فضاء خاص للأولياء لمتابعة التمارين والوقت المنقضي.' : 'Rapports d\'assiduité et progression en temps réel pour la famille.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Book Preview Modal */}
      <BookPreviewModal
        book={previewBook}
        isOpen={Boolean(previewBook)}
        onClose={() => setPreviewBook(null)}
        hasAccess={previewBook ? store.hasActiveEntitlement(store.getCurrentUser()?.id ?? '', previewBook.id) : false}
      />
    </div>
  );
}
