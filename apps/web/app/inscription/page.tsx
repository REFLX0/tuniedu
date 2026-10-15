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
};

export default function InscriptionPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const { refresh } = useSession();

  const [accountType, setAccountType] = useState<'STUDENT' | 'PARENT' | 'PROFESSOR'>('STUDENT');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [childId, setChildId] = useState('');
  const [acceptedCommissionTerms, setAcceptedCommissionTerms] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (password.length < 8) {
      setErrorMessage(
        lang === 'ar'
          ? 'يجب أن تحتوي كلمة المرور على 8 أحرف على الأقل.'
          : 'Le mot de passe doit contenir au moins 8 caractères.'
      );
      return;
    }

    if (accountType === 'PROFESSOR' && !acceptedCommissionTerms) {
      setErrorMessage(
        lang === 'ar'
          ? 'يجب الموافقة على شروط المنصة وعمولة الـ 20% على مبيعات الكتب لإتمام التسجيل كأستاذ مؤلف.'
          : 'Vous devez accepter les conditions générales et la commission de 20% sur les livres pour finaliser votre inscription enseignant.'
      );
      return;
    }

    if (accountType === 'PARENT' && !childId.trim()) {
      setErrorMessage(
        lang === 'ar'
          ? 'يرجى إدخال المعرّف الرقمي للتلميذ (Child ID) لربط حساب الولي بالتلميذ.'
          : 'Veuillez saisir l\'identifiant unique de votre enfant (Child ID) pour créer le lien parental.'
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountType,
          fullName,
          email,
          password,
          phone: phone || undefined,
          childPublicId: accountType === 'PARENT' ? childId : undefined,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setErrorMessage(data.error || (lang === 'ar' ? 'تعذّر إنشاء الحساب.' : 'Création du compte impossible.'));
        setIsSubmitting(false);
        return;
      }

      const user = data.user;
      store.upsertUser(user);
      store.setCurrentUser(user.id);
      await refresh();
      router.push(DASHBOARD_BY_ROLE[user.role] || '/');
    } catch {
      setErrorMessage(lang === 'ar' ? 'تعذّر الاتصال بالخادم.' : 'Impossible de contacter le serveur.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[88vh] bg-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-lg w-full bg-white rounded-2xl border border-blue-100 shadow-[0_4px_24px_rgba(29,78,216,0.06)] p-7 sm:p-9 space-y-7">

        {/* Child Eye-Protection & Ergonomics Certification Banner */}
        <div className="flex items-center justify-between px-3 py-2 bg-blue-50/80 border border-blue-200/80 rounded-xl text-[11px] text-blue-900">
          <div className="flex items-center gap-2 font-medium">
            <Icons.Eye className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              {lang === 'ar'
                ? 'تصميم مريح للعينين · خالٍ من التوهج لحماية نظر الأطفال والتلاميذ'
                : 'Conception ergonomique · Teintes blanches et bleues adaptées aux yeux des élèves'}
            </span>
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
            {lang === 'ar' ? 'معتمد' : 'Certifié'}
          </span>
        </div>

        {/* Portal Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-900 border border-blue-800 text-white flex items-center justify-center mx-auto shadow-xs">
            <Icons.Book className="w-6 h-6 text-blue-300" />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 font-serif">
            {lang === 'ar' ? 'إنشاء حساب جديد على TuniEdu' : 'Créer un Compte TuniEdu'}
          </h1>
          <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto">
            {lang === 'ar'
              ? 'انضم إلى المنصة الوطنية للكتب المدرسية والإعداد للمناظرات الرسمية'
              : 'Rejoignez la plateforme éducative nationale tunisienne et accédez à vos manuels officiels.'}
          </p>
        </div>

        {/* Profile Selector */}
        <div className="space-y-2.5">
          <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
            {lang === 'ar' ? 'حدد نوع الحساب المطلوب :' : 'Sélectionnez le type de compte :'}
          </label>
          <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-blue-50/50 rounded-xl text-xs font-semibold border border-blue-100">
            <button
              type="button"
              onClick={() => {
                setAccountType('STUDENT');
                setErrorMessage('');
              }}
              className={`py-2.5 px-2 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                accountType === 'STUDENT'
                  ? 'bg-blue-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-white'
              }`}
            >
              <Icons.GraduationCap className={`w-4 h-4 ${accountType === 'STUDENT' ? 'text-white' : 'text-blue-600'}`} />
              <span>{lang === 'ar' ? 'تلميذ' : 'Élève'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('PARENT');
                setErrorMessage('');
              }}
              className={`py-2.5 px-2 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                accountType === 'PARENT'
                  ? 'bg-blue-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-white'
              }`}
            >
              <Icons.Users className={`w-4 h-4 ${accountType === 'PARENT' ? 'text-white' : 'text-blue-600'}`} />
              <span>{lang === 'ar' ? 'ولي أمر' : 'Parent'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAccountType('PROFESSOR');
                setErrorMessage('');
              }}
              className={`py-2.5 px-2 rounded-lg transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                accountType === 'PROFESSOR'
                  ? 'bg-blue-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:text-blue-900 hover:bg-white'
              }`}
            >
              <Icons.FileText className={`w-4 h-4 ${accountType === 'PROFESSOR' ? 'text-white' : 'text-blue-600'}`} />
              <span>{lang === 'ar' ? 'أستاذ مؤلّف' : 'Professeur'}</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-900 flex items-start gap-2.5">
            <Icons.AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span className="leading-snug">{errorMessage}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              {lang === 'ar' ? 'الاسم الكامل :' : 'Nom et prénom :'}
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={lang === 'ar' ? 'الاسم الكامل' : 'Prénom Nom'}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 transition"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              {lang === 'ar' ? 'البريد الإلكتروني :' : 'Adresse email :'}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.tn"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 transition"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              {lang === 'ar' ? 'رقم الهاتف الجوال (تونس +216) :' : 'Téléphone mobile (Tunisie +216) :'}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Ex: 98 123 456"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 transition"
            />
          </div>

          <div>
            <label className="font-semibold text-slate-700 block mb-1.5">
              {lang === 'ar' ? 'كلمة المرور (8 أحرف على الأقل) :' : 'Mot de passe (8 caractères min.) :'}
            </label>
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/25 focus:border-blue-600 transition"
            />
          </div>

          {/* PARENT SPECIFIC: Child ID */}
          {accountType === 'PARENT' && (
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-blue-900 text-xs">
                  <Icons.Users className="w-4 h-4 text-blue-700" />
                  <span>{lang === 'ar' ? 'المعرّف الرقمي للتلميذ (Child ID) :' : 'Identifiant Unique de l\'Enfant (Child ID) :'}</span>
                </div>
                <span className="text-[10px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                  {lang === 'ar' ? 'إجباري للربط' : 'Obligatoire'}
                </span>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed">
                {lang === 'ar'
                  ? 'أدخل المعرّف الرقمي للتلميذ (مثال: TUN-9842) لربطه بحسابك وتفعيل الرقابة الأبوية وساعات الدراسة.'
                  : 'Saisissez le code d\'appairage de l\'élève (ex: TUN-9842) pour activer le suivi pédagogique parental.'}
              </p>

              <input
                type="text"
                required
                value={childId}
                onChange={(e) => setChildId(e.target.value.toUpperCase())}
                placeholder="Ex: TUN-9842"
                className="w-full px-3.5 py-2.5 rounded-lg border border-blue-300 font-mono text-xs text-blue-950 bg-white uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600"
              />
            </div>
          )}

          {/* PROFESSOR SPECIFIC: Mandatory Acceptance of 20% Platform Terms on Books */}
          {accountType === 'PROFESSOR' && (
            <div className="p-4 bg-slate-50 border border-blue-200/70 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <Icons.CreditCard className="w-4 h-4 text-blue-700" />
                  <span>
                    {lang === 'ar'
                      ? 'ميثاق النشر وعمولة المنصة (20% على كل كتاب) :'
                      : 'Conditions d\'Édition & Commission Plateforme (20%) :'}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  20% (2000 bps)
                </span>
              </div>

              <div className="p-3 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-relaxed space-y-1.5">
                <p>
                  {lang === 'ar'
                    ? 'تنص الشروط التعاقدية لمنصة TuniEdu على اقتطاع عمولة بنسبة 20% من سعر بيع كل كتاب لتغطية استضافة الخوادم المشفرة، حماية الملكية الفكرية، البصمة المائية الرقمية، ورسوم معالجة الدفع الإلكتروني. ويتم صرف 80% كعائدات صافية للمؤلف شهرياً عبر تحويل بنكي.'
                    : 'Les conditions contractuelles de TuniEdu fixent la commission plateforme à 20% (2000 bps) sur le prix de vente de chaque manuel. 80% des recettes nettes sont versées mensuellement par virement bancaire sur votre compte bancaire (RIB).'}
                </p>
              </div>

              <label className="flex items-start gap-2.5 pt-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptedCommissionTerms}
                  onChange={(e) => setAcceptedCommissionTerms(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                />
                <span className="text-[11px] text-slate-900 font-semibold leading-tight">
                  {lang === 'ar'
                    ? 'أوافق بصفتي أستاذاً مؤلفاً على شروط المنصة وعمولة الـ 20% على مبيعات كتبي.'
                    : 'J\'accepte expressément les conditions de la plateforme et la commission de 20% sur les ventes de mes manuels.'}
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || (accountType === 'PROFESSOR' && !acceptedCommissionTerms)}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs tracking-wide transition shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <span>{lang === 'ar' ? 'جارٍ إنشاء الحساب...' : 'Création du compte...'}</span>
            ) : (
              <span>
                {accountType === 'STUDENT'
                  ? lang === 'ar' ? 'إنشاء حساب التلميذ' : 'Créer mon Compte Élève'
                  : accountType === 'PARENT'
                  ? lang === 'ar' ? 'إنشاء حساب الولي وربط التلميذ' : 'Créer mon Compte Parent & Lier l\'Enfant'
                  : lang === 'ar' ? 'إنشاء حساب الأستاذ المؤلف' : 'Créer mon Compte Enseignant Auteur'}
              </span>
            )}
            <Icons.ArrowRight className="w-3.5 h-3.5" />
          </button>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            {lang === 'ar' ? 'لديك حساب بالفعل؟' : 'Vous avez déjà un compte ?'}{' '}
            <Link href="/connexion" className="text-blue-700 font-bold hover:underline">
              {lang === 'ar' ? 'تسجيل الدخول' : 'Se connecter'}
            </Link>
          </span>
          <Link href="/" className="hover:text-blue-700 transition">
            {lang === 'ar' ? 'الرئيسية' : 'Accueil'}
          </Link>
        </div>
      </div>
    </div>
  );
}
