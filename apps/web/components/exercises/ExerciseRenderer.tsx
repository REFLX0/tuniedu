'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Exercise } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { Icons } from '@/components/ui/icons';

interface ExerciseRendererProps {
  exercise: Exercise;
  hasAccess: boolean;
  onAttemptSubmitted?: (answer: string, isCorrect: boolean) => void;
  nextExerciseId?: string;
  bookId?: string;
}

export function ExerciseRenderer({
  exercise,
  hasAccess,
  onAttemptSubmitted,
  nextExerciseId,
}: ExerciseRendererProps) {
  const { lang, isRtl } = useLanguage();
  const [selectedOption, setSelectedOption] = useState<string>('');
  const [numericAnswer, setNumericAnswer] = useState<string>('');
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [showCorrection, setShowCorrection] = useState<boolean>(false);
  const [showHint, setShowHint] = useState<boolean>(false);
  const [streak, setStreak] = useState<number>(3); // Sample active streak

  const currentAnswer = exercise.type === 'MULTIPLE_CHOICE' ? selectedOption : numericAnswer;
  const isCorrect = isSubmitted && currentAnswer.trim().toLowerCase() === exercise.answerKey.trim().toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAnswer) return;
    setIsSubmitted(true);
    setShowCorrection(true);
    const correct = currentAnswer.trim().toLowerCase() === exercise.answerKey.trim().toLowerCase();
    if (correct) {
      setStreak((s) => s + 1);
    }
    if (onAttemptSubmitted) {
      onAttemptSubmitted(currentAnswer, correct);
    }
  };

  const handleReset = () => {
    setIsSubmitted(false);
    setShowCorrection(false);
    setShowHint(false);
    setSelectedOption('');
    setNumericAnswer('');
  };

  // Generate pedagogical steps from solution
  const solutionSteps = [
    {
      titleFr: 'Étape 1 : Formule de cours & Propriété fondamentale',
      titleAr: 'المرحلة 1 : خاصية الدرس والقاعدة الرياضية المعتمدة',
      descFr: 'Identifier la règle applicable du programme officiel tunisien pour la manipulation des radicaux ou équations.',
      descAr: 'تحديد القاعدة البيداغوجية المعتمدة في البرنامج الرسمي التونسي لتفكيك الجداءات أو الجذور.',
    },
    {
      titleFr: 'Étape 2 : Calcul intermédiaire & Justification',
      titleAr: 'المرحلة 2 : الحساب النموذجي والتعليل الرياضي',
      descFr: exercise.solution,
      descAr: exercise.solution,
    },
    {
      titleFr: 'Étape 3 : Conclusion & Conseil pour l\'examen',
      titleAr: 'المرحلة 3 : الاستنتاج النهائي وتوصية الامتحان',
      descFr: `La solution rigoureusement admise pour le barème est : ${exercise.answerKey}. Veillez à toujours spécifier l'ensemble de définition ℝ.`,
      descAr: `الحل النموذجي المعتمد في سلم الإصلاح هو : ${exercise.answerKey}. احرص دائماً على تحديد مجموعة التعريف في ℝ.`,
    },
  ];

  return (
    <div className="bg-white rounded-3xl border border-blue-100 shadow-sm p-6 sm:p-8 space-y-6">
      {/* Exercise Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-blue-100">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center font-bold text-xs shadow-xs">
            Q
          </span>
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {exercise.type === 'MULTIPLE_CHOICE'
                ? lang === 'ar' ? 'سؤال متعدد الخيارات (QCM)' : 'Question à Choix Multiple (QCM)'
                : lang === 'ar' ? 'حساب عددي دقيق' : 'Calcul Numérique'}
            </div>
            <div className="text-sm font-semibold text-slate-900">
              {lang === 'ar' ? `العدد المسند : ${exercise.points} نقاط` : `Barème : ${exercise.points} point(s)`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Active Streak Badge */}
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold shadow-xs">
            <Icons.Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>{streak} {lang === 'ar' ? 'إجابات صحيحة متتالية' : 'série de succès'}</span>
          </div>

          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {lang === 'ar' ? `المستوى ${exercise.difficulty}` : `Niveau ${exercise.difficulty}`}
          </span>
          {hasAccess && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
              <Icons.Unlock className="w-3 h-3 text-blue-600" />
              {lang === 'ar' ? 'الإصلاح مشمول' : 'Corrigé Inclus'}
            </span>
          )}
        </div>
      </div>

      {/* Exercise Prompt */}
      <div className="text-base sm:text-lg font-bold text-slate-950 font-serif leading-snug">
        {exercise.prompt}
      </div>

      {/* Hint Accordion */}
      {!isSubmitted && (
        <div>
          <button
            type="button"
            onClick={() => setShowHint(!showHint)}
            className="text-xs font-semibold text-blue-700 hover:text-blue-800 flex items-center gap-1.5 transition"
          >
            <Icons.Eye className="w-3.5 h-3.5" />
            <span>{showHint ? (lang === 'ar' ? 'إخفاء التلميح' : 'Masquer l\'indice') : (lang === 'ar' ? 'هل تحتاج إلى تلميح بيداغوجي ؟' : 'Besoin d\'un indice méthodologique ?')}</span>
          </button>
          {showHint && (
            <div className="mt-2 p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-950 animate-in fade-in duration-200">
              <strong>{lang === 'ar' ? 'تلميح الأستاذ :' : 'Indice de l\'enseignant :'}</strong>{' '}
              {lang === 'ar'
                ? 'تذكر أن جذر a² يساوي القيمة المطلقة لـ a، وأن حل المعادلة x² = b في ℝ يتضمن إشارتين عندما يكون b موجباً قطعا.'
                : 'Pensez à la règle de factorisation remarquable ou aux propriétés fondamentales des racines carrées dans ℝ.'}
            </div>
          )}
        </div>
      )}

      {/* Answer Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {exercise.type === 'MULTIPLE_CHOICE' && exercise.options && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {exercise.options.map((opt, idx) => {
              const isSelected = selectedOption === opt;
              let btnStyle = 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 text-slate-800 bg-white';

              if (isSubmitted) {
                if (opt === exercise.answerKey) {
                  btnStyle = 'border-blue-700 bg-blue-50 text-blue-950 font-bold ring-2 ring-blue-700/20';
                } else if (isSelected && !isCorrect) {
                  btnStyle = 'border-red-300 bg-red-50 text-red-900 font-semibold';
                }
              } else if (isSelected) {
                btnStyle = 'border-blue-700 bg-blue-50 text-blue-950 font-semibold ring-2 ring-blue-700/20';
              }

              return (
                <button
                  key={idx}
                  type="button"
                  disabled={isSubmitted}
                  onClick={() => setSelectedOption(opt)}
                  className={`p-4 rounded-2xl border text-left text-sm font-mono transition flex items-center justify-between shadow-xs ${btnStyle}`}
                >
                  <span>{opt}</span>
                  {isSubmitted && opt === exercise.answerKey && (
                    <Icons.CheckCircle className="w-5 h-5 text-blue-700 shrink-0" />
                  )}
                  {isSubmitted && isSelected && !isCorrect && (
                    <Icons.X className="w-5 h-5 text-red-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {exercise.type === 'NUMERIC' && (
          <div className="max-w-xs space-y-2">
            <label className="text-xs font-semibold text-slate-700">
              {lang === 'ar' ? 'النتيجة العددية :' : 'Votre résultat :'}
            </label>
            <input
              type="text"
              disabled={isSubmitted}
              value={numericAnswer}
              onChange={(e) => setNumericAnswer(e.target.value)}
              placeholder="Ex: 9"
              className="w-full px-4 py-3 rounded-2xl border border-slate-300 font-mono text-base text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 shadow-xs"
            />
          </div>
        )}

        {/* Action Button */}
        {!isSubmitted ? (
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={!currentAnswer}
              className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition shadow-xs disabled:opacity-40"
            >
              {lang === 'ar' ? 'تأكيد الإجابة وعرض الإصلاح' : 'Valider la réponse & Débloquer le corrigé'}
            </button>
          </div>
        ) : (
          <div className="pt-2 flex items-center gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-blue-50 text-slate-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
            >
              <Icons.Refresh className="w-3.5 h-3.5" />
              <span>{lang === 'ar' ? 'إعادة المحاولة' : 'Recommencer'}</span>
            </button>

            {nextExerciseId && (
              <Link
                href={`/student/exercises/${nextExerciseId}`}
                className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-xs"
              >
                <span>{lang === 'ar' ? 'التمرين الموالي' : 'Exercice suivant'}</span>
                <Icons.ChevronRight className={`w-3.5 h-3.5 ${isRtl ? 'rotate-180' : ''}`} />
              </Link>
            )}
          </div>
        )}
      </form>

      {/* Official Pedagogical Correction Section */}
      {showCorrection && (
        <div className="pt-6 border-t border-slate-100 space-y-5 animate-in fade-in duration-300">
          {/* Result Banner */}
          <div
            className={`p-4 rounded-2xl border ${
              isCorrect
                ? 'bg-blue-50 border-blue-200 text-blue-950'
                : 'bg-amber-50 border-amber-200 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-2 font-bold text-sm">
              {isCorrect ? (
                <>
                  <Icons.CheckCircle className="w-5 h-5 text-blue-700 shrink-0" />
                  <span>{lang === 'ar' ? 'إجابة ممتازة ! أحسنت، تعليل رياضي سليم (+ نقاط إضافية).' : 'Réponse exacte ! Excellent raisonnement (+ points acquis).'}</span>
                </>
              ) : (
                <>
                  <Icons.AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    {lang === 'ar'
                      ? 'إجابة غير صحيحة. راجع المراحل الثلاث للإصلاح النموذجي للمؤلف أسفله :'
                      : 'Réponse erronée. Examinez les étapes méthodologiques détaillées ci-dessous :'}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 3-Step Pedagogical Unfolding */}
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="text-xs font-bold text-blue-900 uppercase tracking-wider flex items-center gap-2">
                <Icons.FileText className="w-4 h-4 text-blue-700" />
                <span>{lang === 'ar' ? 'الإصلاح البيداغوجي النموذجي خطوة بخطوة' : 'Démarche Pédagogique Pas à Pas'}</span>
              </div>
              <span className="text-[10px] font-bold text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200 shadow-xs">
                {lang === 'ar' ? 'تأليف الأستاذ المعتمد' : 'Validation Inspecteur'}
              </span>
            </div>

            <div className="space-y-3">
              {solutionSteps.map((step, idx) => (
                <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-1.5">
                  <div className="text-xs font-bold text-blue-800 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-md bg-blue-100 text-blue-900 text-[10px] flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <span>{lang === 'ar' ? step.titleAr : step.titleFr}</span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed pl-7 whitespace-pre-line font-serif">
                    {lang === 'ar' ? step.descAr : step.descFr}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>{lang === 'ar' ? 'إعداد : الأستاذ هشام بن سالم' : 'Auteur agréé : Prof. Hichem Ben Salem'}</span>
              <span className="text-[11px] font-mono text-slate-400">Réf: SOL-{exercise.id}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
