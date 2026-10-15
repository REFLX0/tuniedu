'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import { Icons } from '@/components/ui/icons';

export default function GenerationStudioPage() {
  const { lang } = useLanguage();

  // Multi-step form state (Reverse-Engineered from Section 2.1)
  const [cycle, setCycle] = useState<'PRIMAIRE' | 'COLLEGE' | 'LYCEE'>('COLLEGE');
  const [level, setLevel] = useState('9ème Année de Base');
  const [subject, setSubject] = useState('Mathématiques');
  const [outputType, setOutputType] = useState<'EXAMEN' | 'EXERCICES' | 'COURS'>('EXAMEN');
  const [outputFormat, setOutputFormat] = useState<'PDF' | 'DOCX'>('PDF');
  const [outputLanguage, setOutputLanguage] = useState<'AR' | 'FR' | 'EN'>('FR');
  const [includeAnswerKey, setIncludeAnswerKey] = useState(true);
  const [topicPrompt, setTopicPrompt] = useState(
    'Théorème de Thalès et triangles semblables avec calculs de segments et questions de synthèse pour concours pilote'
  );

  // Generation status state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [, setGenerationComplete] = useState(true); // Default to showcasing the preview
  const [activePreviewTab, setActivePreviewTab] = useState<'DOCUMENT' | 'CORRIGE'>('DOCUMENT');
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

  const handleGenerate = () => {
    setIsGenerating(true);
    setGenerationProgress(10);
    setGenerationComplete(false);

    const interval = setInterval(() => {
      setGenerationProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setIsGenerating(false);
          setGenerationComplete(true);
          return 100;
        }
        return prev + 20;
      });
    }, 300);
  };

  const handleDownload = (format: string) => {
    setDownloadSuccess(
      lang === 'ar'
        ? `تم تصدير الوثيقة بصيغة ${format} بنجاح وفق المعايير الرسمية لوزارة التربية.`
        : `Document exporté au format ${format} avec succès (Conforme Ministère de l'Éducation).`
    );
    setTimeout(() => setDownloadSuccess(null), 3000);
  };

  const SUGGESTED_CHAPTERS = [
    'Théorème de Thalès et réciproque',
    'Identités remarquables et factorisation',
    'Calcul trigonométrique dans le triangle rectangle',
    'Vecteurs et translations dans le plan',
    'Fonctions affines et équations de droites',
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-10 pb-24">
      {/* ── TOP HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {lang === 'ar' ? 'استوديو توليد الوثائق البيداغوجية' : 'Studio de Génération Pédagogique IA'}
            </span>
            <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800 border border-blue-200">
              CNP 2026/2027
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-950 tracking-tight mt-1">
            {lang === 'ar' ? 'توليد الدروس والامتحانات التونسية الرسمية' : 'Création Assistée de Devoirs & Examens'}
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            {lang === 'ar'
              ? 'أنشئ امتحانات واختبارات تأليفية أو فروض مراقبة مطابقة تماماً للمنهاج الرسمي التونسي وسلم التنقيط على 20، مع إمكانية التصدير بصيغة PDF أو Word.'
              : 'Générez des examens de synthèse, devoirs de contrôle et fiches d\'exercices rigoureusement conformes au programme tunisien avec barème officiel sur 20.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/professor"
            className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition flex items-center gap-1.5"
          >
            <Icons.Book className="w-3.5 h-3.5 text-blue-600" />
            <span>{lang === 'ar' ? 'استوديو الأستاذ' : 'Espace Enseignant'}</span>
          </Link>
          <Link
            href="/checkout?bookId=book_math_9b"
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5"
          >
            <span>⚡ {lang === 'ar' ? 'حصص التوليد' : 'Quotas & Formules'}</span>
          </Link>
        </div>
      </div>

      {/* ── NOTIFICATION FOR DOWNLOAD ────────────────────────────────────────── */}
      {downloadSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-bold text-emerald-800 flex items-center gap-2 animate-in fade-in">
          <Icons.CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{downloadSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ── LEFT COLUMN: WORKFLOW FORM CONTROLS (SECTIONS 1, 2, 3) ──────────── */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1. CURRICULUM SELECTOR */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-6 h-6 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                1
              </span>
              <h2 className="font-bold text-sm text-slate-900">
                {lang === 'ar' ? 'تحديد المنهاج والمستوى الدراسي' : 'Cycle & Niveau Scolaire Officiel'}
              </h2>
            </div>

            {/* Cycle Selector Buttons */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                {lang === 'ar' ? 'المرحلة التعليمية :' : 'Cycle Pédagogique :'}
              </label>
              <div className="grid grid-cols-3 gap-2">
                {([
                  { id: 'PRIMAIRE', labelAr: 'الابتدائي', labelFr: 'Primaire' },
                  { id: 'COLLEGE', labelAr: 'الإعدادي (أساسي)', labelFr: 'Collège' },
                  { id: 'LYCEE', labelAr: 'الثانوي (باكالوريا)', labelFr: 'Lycée' },
                ] as const).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCycle(c.id);
                      if (c.id === 'PRIMAIRE') setLevel('6ème Année Primaire (Concours Sixième)');
                      else if (c.id === 'COLLEGE') setLevel('9ème Année de Base (Concours Neufième)');
                      else setLevel('4ème Année Secondaire (Baccalauréat)');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition border ${
                      cycle === c.id
                        ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                    }`}
                  >
                    {lang === 'ar' ? c.labelAr : c.labelFr}
                  </button>
                ))}
              </div>
            </div>

            {/* Level Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                {lang === 'ar' ? 'السنة الدراسية المحددة :' : 'Classe & Niveau :'}
              </label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                {cycle === 'PRIMAIRE' && (
                  <>
                    <option value="1ère Année Primaire">1ère Année Primaire (السنة الأولى ابتدائي)</option>
                    <option value="2ème Année Primaire">2ème Année Primaire (السنة الثانية ابتدائي)</option>
                    <option value="3ème Année Primaire">3ème Année Primaire (السنة الثالثة ابتدائي)</option>
                    <option value="4ème Année Primaire">4ème Année Primaire (السنة الرابعة ابتدائي)</option>
                    <option value="5ème Année Primaire">5ème Année Primaire (السنة الخامسة ابتدائي)</option>
                    <option value="6ème Année Primaire (Concours Sixième)">6ème Année (مناظرة السيزيام)</option>
                  </>
                )}
                {cycle === 'COLLEGE' && (
                  <>
                    <option value="7ème Année de Base">7ème Année de Base (السابعة أساسي)</option>
                    <option value="8ème Année de Base">8ème Année de Base (الثامنة أساسي)</option>
                    <option value="9ème Année de Base (Concours Neufième)">9ème Année (مناظرة النوفيام - التاسعة أساسي)</option>
                  </>
                )}
                {cycle === 'LYCEE' && (
                  <>
                    <option value="1ère Année Secondaire">1ère Année Secondaire (Tronc Commun)</option>
                    <option value="2ème Sciences / Lettres / Info">2ème Année Secondaire</option>
                    <option value="3ème Année Secondaire">3ème Année Secondaire</option>
                    <option value="4ème Année Secondaire (Baccalauréat)">4ème Année (Baccalauréat - الدورة الرئيسية)</option>
                  </>
                )}
              </select>
            </div>

            {/* Subject Selector */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-500 uppercase">
                {lang === 'ar' ? 'المادة التعليمية :' : 'Discipline / Matière :'}
              </label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              >
                <option value="Mathématiques">📐 Mathématiques (الرياضيات)</option>
                <option value="Sciences Physiques">⚡ Sciences Physiques (الفيزياء والكيمياء)</option>
                <option value="Langue Arabe">📖 Langue Arabe (اللغة العربية والإنشاء)</option>
                <option value="Français">✍️ Français (Langue & Production Écrite)</option>
                <option value="Anglais">🇬🇧 Anglais (English Language)</option>
                <option value="SVT">🔬 Sciences de la Vie et de la Terre (علوم الطبيعة)</option>
                <option value="Informatique">💻 Informatique & Algorithmique (الإعلامية)</option>
              </select>
            </div>
          </div>

          {/* 2. OUTPUT CONFIGURATION */}
          <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                2
              </span>
              <h2 className="font-bold text-sm text-slate-900">
                {lang === 'ar' ? 'إعدادات الوثيقة والإصلاح' : 'Format & Type de Document'}
              </h2>
            </div>

            {/* Document Type */}
            <div className="grid grid-cols-3 gap-2">
              {([
                { id: 'EXAMEN', labelAr: 'امتحان تأليفي', labelFr: 'Devoir Synthèse' },
                { id: 'EXERCICES', labelAr: 'سلسلة تمارين', labelFr: 'Fiche Exercices' },
                { id: 'COURS', labelAr: 'ملخص درس', labelFr: 'Fiche Cours' },
              ] as const).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setOutputType(t.id)}
                  className={`py-2 rounded-xl text-xs font-bold transition border ${
                    outputType === t.id
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white'
                  }`}
                >
                  {lang === 'ar' ? t.labelAr : t.labelFr}
                </button>
              ))}
            </div>

            {/* Language & Output Format */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {lang === 'ar' ? 'لغة الصياغة :' : 'Langue du devoir :'}
                </label>
                <select
                  value={outputLanguage}
                  onChange={(e) => setOutputLanguage(e.target.value as 'AR' | 'FR' | 'EN')}
                  className="w-full py-2 px-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-800"
                >
                  <option value="FR">🇫🇷 Français (Officiel)</option>
                  <option value="AR">🇹🇳 العربية (الرسمي)</option>
                  <option value="EN">🇬🇧 English</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">
                  {lang === 'ar' ? 'صيغة الملف :' : 'Format de sortie :'}
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOutputFormat('PDF')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      outputFormat === 'PDF'
                        ? 'bg-rose-50 text-rose-700 border-rose-300 font-extrabold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    📄 PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setOutputFormat('DOCX')}
                    className={`py-2 rounded-xl text-xs font-bold border transition ${
                      outputFormat === 'DOCX'
                        ? 'bg-blue-50 text-blue-700 border-blue-300 font-extrabold'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    📝 Word
                  </button>
                </div>
              </div>
            </div>

            {/* Answer Key Toggle */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-900">
                  {lang === 'ar' ? 'إرفاق الإصلاح النموذجي المفصل' : 'Inclure le Corrigé Type avec Barème (/20)'}
                </div>
                <div className="text-[10px] text-slate-500">
                  {lang === 'ar' ? 'تعليلات مفصلة ومطابقة لمقاييس مناظرات تونس' : 'Démonstrations méthodologiques pas à pas'}
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeAnswerKey}
                onChange={(e) => setIncludeAnswerKey(e.target.checked)}
                className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
            </div>

            {/* Topic Input Prompt */}
            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-bold text-slate-700">
                {lang === 'ar' ? 'الموضوع والمحاور البيداغوجية المستهدفة :' : 'Consignes & Notions Clés :'}
              </label>
              <textarea
                value={topicPrompt}
                onChange={(e) => setTopicPrompt(e.target.value)}
                rows={3}
                placeholder="Ex: Théorème de Thalès, triangles semblables..."
                className="w-full p-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-blue-600 focus:bg-white transition"
              />
            </div>

            {/* Suggested Chapter Pills */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase">
                {lang === 'ar' ? 'محاور مقترحة من المنهاج الرسمي :' : 'Chapitres officiels suggérés :'}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {SUGGESTED_CHAPTERS.map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setTopicPrompt(ch)}
                    className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-blue-50 hover:text-blue-700 text-[10px] text-slate-600 font-medium transition"
                  >
                    + {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white font-extrabold text-xs tracking-wide transition shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>{lang === 'ar' ? 'جاري توليد الوثيقة وفق المنهاج...' : 'Génération du sujet en cours...'}</span>
                </>
              ) : (
                <>
                  <span>✨</span>
                  <span>{lang === 'ar' ? 'توليد الامتحان والوثيقة الآن ←' : 'Générer le Document Pédagogique →'}</span>
                </>
              )}
            </button>

            {isGenerating && (
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                  <span>{lang === 'ar' ? 'التدقيق البيداغوجي وفق برامج CNP...' : 'Vérification barème et conformité CNP...'}</span>
                  <span>{generationProgress}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all duration-300"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── RIGHT COLUMN: STRUCTURED EXAMINATION DOCUMENT PREVIEW ───────────── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <h2 className="text-base font-bold text-slate-900">
                {lang === 'ar' ? 'معاينة الامتحان المولد (مطبوعات رسمية)' : 'Aperçu du Devoir Conforme CNP'}
              </h2>
            </div>

            {/* Document / Corrigé Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setActivePreviewTab('DOCUMENT')}
                className={`px-3 py-1 rounded-lg transition ${
                  activePreviewTab === 'DOCUMENT'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                📄 {lang === 'ar' ? 'نص الفرض' : 'Épreuve (Sujet)'}
              </button>
              {includeAnswerKey && (
                <button
                  type="button"
                  onClick={() => setActivePreviewTab('CORRIGE')}
                  className={`px-3 py-1 rounded-lg transition ${
                    activePreviewTab === 'CORRIGE'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-950'
                  }`}
                >
                  ✅ {lang === 'ar' ? 'الإصلاح النموذجي' : 'Corrigé Type'}
                </button>
              )}
            </div>
          </div>

          {/* Institutional Document Rendering (Paper Canvas) */}
          <div className="bg-white rounded-3xl border border-slate-300/80 shadow-xl p-8 sm:p-12 space-y-8 text-slate-900 font-sans relative">
            {/* Top Institutional Header */}
            <div className="border-b-2 border-slate-900 pb-4 space-y-3">
              <div className="flex items-start justify-between text-[11px] font-bold text-slate-800 leading-relaxed">
                <div className="text-left">
                  <div>RÉPUBLIQUE TUNISIENNE</div>
                  <div>MINISTÈRE DE L&apos;ÉDUCATION</div>
                  <div className="text-slate-500 font-medium">Lycée Pilote Bourguiba Tunis</div>
                </div>
                <div className="text-center px-3 py-1 rounded-lg bg-slate-100 border border-slate-300 font-mono text-xs">
                  Année Scolaire 2026–2027
                </div>
                <div className="text-right">
                  <div>DEVOIR DE SYNTHÈSE N°1</div>
                  <div>Discipline : {subject}</div>
                  <div className="text-slate-500 font-medium">Niveau : {level}</div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-200 text-xs font-bold text-slate-900">
                <div>Durée : <strong>2 Heures</strong></div>
                <div>Coefficient : <strong>3</strong></div>
                <div className="px-3 py-1 rounded-md bg-blue-50 text-blue-800 border border-blue-200">
                  Note : ...... / <strong>20</strong>
                </div>
              </div>
            </div>

            {/* Document Content View */}
            {activePreviewTab === 'DOCUMENT' ? (
              <div className="space-y-6 text-xs text-slate-800 leading-relaxed">
                {/* Exercise 1: QCM */}
                <div className="space-y-2.5 p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-950">
                    <span>Exercice 1 : Questionnaire à Choix Multiples (QCM)</span>
                    <span className="text-xs text-blue-700 font-mono">(4 points)</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Pour chacune des questions suivantes, une seule des trois réponses proposées est exacte. Cocher la bonne réponse.
                  </p>
                  <div className="space-y-2 pt-1 font-medium">
                    <div>
                      <strong>1.</strong> Dans un triangle ABC, si M ∈ [AB] et N ∈ [AC] avec (MN) // (BC), alors d&apos;après le théorème de Thalès :
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pl-4 text-[11px]">
                      <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center gap-2">
                        <input type="radio" name="q1" className="cursor-pointer" />
                        <span>AM/AB = AN/AC = MN/BC</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center gap-2">
                        <input type="radio" name="q1" className="cursor-pointer" />
                        <span>AM/MB = AN/NC</span>
                      </div>
                      <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center gap-2">
                        <input type="radio" name="q1" className="cursor-pointer" />
                        <span>AB/AM = MN/BC</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Exercise 2: Application Problem */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-950">
                    <span>Exercice 2 : Calcul de longueurs et configurations géométriques</span>
                    <span className="text-xs text-blue-700 font-mono">(8 points)</span>
                  </div>
                  <p>
                    Soit ABC un triangle tel que AB = 8 cm, AC = 10 cm et BC = 12 cm. On place un point M sur le segment [AB] tel que AM = 3.2 cm. La parallèle à (BC) passant par M coupe [AC] en N.
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 font-medium">
                    <li>Faire une figure soignée et en vraie grandeur.</li>
                    <li>Calculer la longueur exacte du segment [AN]. Justifier la démarche.</li>
                    <li>Montrer que la longueur MN = 4.8 cm.</li>
                    <li>
                      Soit P le point du segment [BC] tel que BP = 4.8 cm. Démontrer que la droite (MP) est parallèle à la droite (AC).
                    </li>
                  </ol>
                </div>

                {/* Exercise 3: Synthesis & Rigor */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between font-bold text-sm text-slate-950">
                    <span>Exercice 3 : Problème de synthèse et modélisation</span>
                    <span className="text-xs text-blue-700 font-mono">(8 points)</span>
                  </div>
                  <p>
                    Un géomètre souhaite mesurer la hauteur d&apos;un minaret à Kairouan sans y monter directement. Il dispose d&apos;une perche verticale de 2.50 m placée à 18 m de la tour, de sorte que le sommet de la perche et le sommet du minaret soient alignés avec l&apos;œil d&apos;observation au sol.
                  </p>
                  <ol className="list-decimal pl-5 space-y-1.5 font-medium">
                    <li>Modéliser la situation à l&apos;aide d&apos;un schéma géométrique et identifier la configuration de Thalès.</li>
                    <li>Sachant que l&apos;observateur est à 3 m de la perche, calculer la hauteur totale H du minaret.</li>
                    <li>Discuter la précision du résultat au centimètre près.</li>
                  </ol>
                </div>
              </div>
            ) : (
              /* Corrigé View */
              <div className="space-y-6 text-xs text-slate-800 leading-relaxed animate-in fade-in">
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900 font-bold">
                  <span>✅ CORRIGÉ OFFICIEL HOMOLOGUÉ AVEC BARÈME PAR QUESTION</span>
                  <span>TOTAL : 20 / 20</span>
                </div>

                <div className="space-y-2 border-l-2 border-emerald-500 pl-4">
                  <h4 className="font-bold text-sm text-slate-900">Exercice 1 : QCM (4 points)</h4>
                  <p className="text-emerald-700 font-medium">
                    1. Réponse A : AM/AB = AN/AC = MN/BC (Propriété fondamentale de Thalès dans le triangle ABC avec (MN) // (BC)). <strong>[4 pts]</strong>
                  </p>
                </div>

                <div className="space-y-2 border-l-2 border-emerald-500 pl-4">
                  <h4 className="font-bold text-sm text-slate-900">Exercice 2 : Démarche et Calculs (8 points)</h4>
                  <p>
                    1. Figure géométrique conforme aux mesures données. <strong>[1 pt]</strong><br />
                    2. Dans le triangle ABC, M ∈ [AB], N ∈ [AC] et (MN) // (BC). D&apos;après le théorème de Thalès : AM/AB = AN/AC. D&apos;où AN = (AM × AC) / AB = (3.2 × 10) / 8 = 32 / 8 = <strong>4 cm</strong>. <strong>[2.5 pts]</strong><br />
                    3. De même, MN/BC = AM/AB, donc MN = (3.2 × 12) / 8 = 38.4 / 8 = <strong>4.8 cm</strong>. <strong>[2 pts]</strong><br />
                    4. Réciproque de Thalès : BM/BA = (8 - 3.2)/8 = 4.8/8 = 0.6. BP/BC = 4.8/12 = 0.4. Les rapports sont vérifiés selon l&apos;ordre des points, (MP) // (AC). <strong>[2.5 pts]</strong>
                  </p>
                </div>

                <div className="space-y-2 border-l-2 border-emerald-500 pl-4">
                  <h4 className="font-bold text-sm text-slate-900">Exercice 3 : Modélisation et Hauteur (8 points)</h4>
                  <p>
                    1. Identification du triangle rectangle d&apos;observation : H/2.5 = (18 + 3)/3 = 21/3 = 7. <strong>[3 pts]</strong><br />
                    2. H = 7 × 2.5 = <strong>17.50 mètres</strong>. <strong>[3.5 pts]</strong><br />
                    3. Conclusion : La hauteur réelle du minaret est de 17.5 m, validée à ± 2 cm près. <strong>[1.5 pt]</strong>
                  </p>
                </div>
              </div>
            )}

            {/* Document Action Footer */}
            <div className="pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                <Icons.CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>Format A4 standard · Imprimable directement</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleDownload('PDF')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>📄</span>
                  <span>{lang === 'ar' ? 'تحميل بصيغة PDF' : 'Télécharger PDF'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownload('Word (DOCX)')}
                  className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <span>📝</span>
                  <span>{lang === 'ar' ? 'تحميل بصيغة Word' : 'Télécharger DOCX'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
