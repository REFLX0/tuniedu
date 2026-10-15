'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { store } from '@/lib/store';
import { useSession } from '@/components/providers/SessionProvider';
import { Icons } from '@/components/ui/icons';

const DASHBOARD_BY_ROLE: Record<string, string> = {
  STUDENT: '/student/library',
  PARENT: '/parent',
  PROFESSOR: '/professor',
  ADMIN: '/admin',
  REVIEWER: '/admin',
};

export default function ConnexionPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { refresh } = useSession();

  const [emailOrPhone, setEmailOrPhone] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailOrPhone, password }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(
          data.error ||
            (lang === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'Email ou mot de passe incorrect.')
        );
        setIsSubmitting(false);
        return;
      }

      const user = data.user;
      store.upsertUser(user);
      store.setCurrentUser(user.id);
      await refresh();

      router.push(DASHBOARD_BY_ROLE[user.role] || '/');
    } catch {
      setErrorMessage(
        lang === 'ar' ? 'تعذّر الاتصال بالخادم. حاول مرة أخرى.' : 'Impossible de contacter le serveur. Réessayez.'
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[88vh] bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-blue-100 shadow-[0_4px_24px_rgba(29,78,216,0.06)] p-7 sm:p-9 space-y-7">

        {/* Child Eye-Protection & Visual Ergonomics Badge (White & Blue) */}
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-[11px] text-blue-900">
          <div className="flex items-center gap-2 font-medium">
            <Icons.Eye className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'حماية بصرية للأطفال والتلاميذ · واجهة بيضاء وزرقاء مريحة للنظر'
                : 'Confort visuel certifié pour les élèves · Palette blanche et bleue reposante pour les yeux'}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
            {lang === 'ar' ? 'معتمد' : 'Certifié'}
          </span>
        </div>

        {/* Institutional Crest & Portal Title */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-900 border border-blue-800 text-white flex items-center justify-center mx-auto shadow-xs">
            <Icons.Book className="w-6 h-6 text-blue-300" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            {lang === 'ar' ? 'فضاء تسجيل الدخول البيداغوجي الموحد' : 'Portail d\'Accès Éducatif Sécurisé'}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            {lang === 'ar'
              ? 'المنصة الوطنية التونسية للكتب المدرسية المعتمدة ومتابعة التحصيل العلمي'
              : 'Accès institutionnel aux manuels scolaires officiels et au suivi des apprentissages'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2.5">
            <Icons.AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Main Authentication Form */}
        <form onSubmit={handleLogin} className="space-y-4 text-xs">

          {/* Main Identifier Field */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              {lang === 'ar' ? 'البريد الإلكتروني أو رقم الهاتف :' : 'Email ou numéro de téléphone :'}
            </label>
            <input
              type="text"
              required
              autoComplete="username"
              value={emailOrPhone}
              onChange={(e) => setEmailOrPhone(e.target.value)}
              placeholder="vous@exemple.tn"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 transition"
            />
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-700">
                {lang === 'ar' ? 'كلمة المرور :' : 'Mot de passe :'}
              </label>
            </div>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 transition"
            />
          </div>

          {/* Child Mode Comfort Notice */}
          <div className="p-3 bg-blue-50/60 border border-blue-200/80 rounded-xl flex items-center gap-2.5 text-[11px] text-blue-900">
            <Icons.Shield className="w-4 h-4 text-blue-700 shrink-0" />
            <span className="leading-snug">
              {lang === 'ar'
                ? 'فضاء مخصص للأطفال والتلاميذ : واجهة مريحة باللون الأبيض والأزرق، وحماية ضد النسخ غير المصرح به.'
                : 'Espace sécurisé pour les élèves : interface épurée blanche et bleue, typographie aérée et lecture protégée.'}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs tracking-wide transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <span>{lang === 'ar' ? 'جارٍ التحقق من الهوية...' : 'Vérification de l\'accès...'}</span>
            ) : (
              <span>{lang === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}</span>
            )}
            <Icons.ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Footer Navigation */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <Link href="/inscription" className="hover:text-blue-700 font-medium transition">
            {lang === 'ar' ? 'إنشاء حساب جديد' : 'Créer un compte'}
          </Link>
          <span className="text-slate-300">·</span>
          <Link href="/" className="hover:text-blue-700 transition">
            {lang === 'ar' ? 'العودة للموقع الرسمي' : 'Retour au portail officiel'}
          </Link>
        </div>
      </div>
    </div>
  );
}
