'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { store, D17Transaction } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { useSession } from '@/components/providers/SessionProvider';
import { Icons } from '@/components/ui/icons';

type PaymentMode = 'DIGITAL' | 'D17' | 'PREPAID_CARD';

interface CheckoutResponse {
  success: boolean;
  purchaseId: string;
  totalMillimes: number;
  currency: string;
  status: string;
  entitlementsGranted: unknown[];
  checkoutUrl: string;
  redirectUrl: string;
}

type PrepaidRedemptionResult = ReturnType<typeof store.redeemPrepaidCard>;

function CheckoutPageContent() {
  const searchParams = useSearchParams();
  const { lang } = useLanguage();
  const { user: currentUser } = useSession();

  const [activeCartBookId, setActiveCartBookId] = useState<string | null>(
    searchParams.get('bookId') || 'book_math_9b'
  );

  const selectedBook = activeCartBookId ? store.books.find((b) => b.id === activeCartBookId) || store.books[0] : null;
  const pricing = selectedBook ? store.getBookPricing(selectedBook.id) : null;

  // Checkout flow state
  const [selectedPlan, setSelectedPlan] = useState<'BOOK_ONLY' | 'TRIMESTER_BUNDLE' | 'ANNUAL_PASS'>('TRIMESTER_BUNDLE');
  const [selectedTrimester, setSelectedTrimester] = useState<'T1' | 'T2' | 'T3'>('T1');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('DIGITAL');
  const [digitalProvider, setDigitalProvider] = useState<'FLOUCI' | 'KONNECT' | 'GPG'>('FLOUCI');

  // D17 State
  const [d17Reference, setD17Reference] = useState('');
  const [d17Note, setD17Note] = useState('');
  const [d17SubmittedTx, setD17SubmittedTx] = useState<D17Transaction | null>(null);

  // Prepaid Card State
  const [prepaidCode, setPrepaidCode] = useState('');
  const [prepaidSuccess, setPrepaidSuccess] = useState<PrepaidRedemptionResult | null>(null);

  // General states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderComplete, setOrderComplete] = useState<CheckoutResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Price computation
  const bookOnlyPrice = (selectedBook && (pricing?.bookOnlyPriceMillimes || selectedBook.priceMillimes)) || 22000;
  const bundlePrice = (selectedBook && (pricing?.bundlePriceMillimes || Math.round(selectedBook.priceMillimes * 1.8))) || 39600;
  const annualPrice = (selectedBook && (pricing?.annualPassPriceMillimes || Math.round(selectedBook.priceMillimes * 3.8))) || 83600;

  const currentPriceMillimes =
    selectedPlan === 'BOOK_ONLY'
      ? bookOnlyPrice
      : selectedPlan === 'TRIMESTER_BUNDLE'
      ? bundlePrice
      : annualPrice;

  const formatDT = (m: number) => (m / 1000).toFixed(3) + ' DT';

  // Digital Gateway submission
  const handleConfirmDigitalOrder = async () => {
    if (!selectedBook) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `idemp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookIds: [selectedBook.id],
          paymentProvider: digitalProvider,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur lors de la validation du paiement');
      }

      setOrderComplete(data);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Impossible de finaliser la commande');
    } finally {
      setIsSubmitting(false);
    }
  };

  // D17 Submission
  const handleSubmitD17 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBook) return;
    if (!d17Reference.trim()) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال رقم أو مرجع وصل التحويل D17' : 'Veuillez renseigner le numéro de transaction D17');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const result = store.submitD17Transaction({
      userId: currentUser?.id ?? '',
      bookId: selectedBook.id,
      planType: selectedPlan,
      reference: d17Reference,
      amountMillimes: currentPriceMillimes,
      receiptNote: d17Note.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      setErrorMessage(result.error);
    } else {
      setD17SubmittedTx(result.transaction);
    }
  };

  // Instant simulation of D17 validation by admin
  const handleSimulateAdminApproval = () => {
    if (!d17SubmittedTx) return;
    const approval = store.approveD17Transaction(d17SubmittedTx.id);
    if (approval.success) {
      const updatedTx = store.d17Transactions.find((t) => t.id === d17SubmittedTx.id);
      if (updatedTx) setD17SubmittedTx({ ...updatedTx });
    }
  };

  // Prepaid card redemption
  const handleRedeemPrepaid = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prepaidCode.trim()) {
      setErrorMessage(lang === 'ar' ? 'يرجى إدخال رمز البطاقة المشحونة' : 'Veuillez saisir le code secret de la carte prépayée');
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    const res = store.redeemPrepaidCard(prepaidCode, currentUser?.id ?? '');
    setIsSubmitting(false);

    if (!res.success) {
      setErrorMessage(res.error || 'Code invalide');
    } else {
      setPrepaidSuccess(res);
    }
  };

  // User's order history
  const userPurchases = store.purchases.filter((p) => p.userId === (currentUser?.id ?? ''));
  const userD17Txs = store.d17Transactions.filter((t) => t.userId === (currentUser?.id ?? ''));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {lang === 'ar' ? 'بوابة الدفع والاشتراكات الوطنية' : 'Boutique Officielle & Souscriptions'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              {lang === 'ar' ? 'دفع آمن D17 · Flouci · Konnect' : 'D17 · Flouci · Cartes Bancaires'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif tracking-tight mt-1">
            {lang === 'ar' ? 'سلة المشتريات وتأكيد الاشتراك' : 'Panier & Finalisation de Commande'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'تفعيل فوري أو يدوي للمحتوى التعليمي المصادق عليه لجميع المستويات التونسية.'
              : 'Activation immédiate des manuels et séances de révision avec le barème officiel.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 font-semibold">
            <span>🏛️</span>
            <span>{lang === 'ar' ? 'البريد التونسي · D17' : 'CCP La Poste : 17 000 842 190'}</span>
          </div>
        </div>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-900 flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-700 hover:text-red-900 font-bold text-sm">
            ×
          </button>
        </div>
      )}

      {/* ── STATE 1: EMPTY BASKET ────────────────────────────────────────── */}
      {!selectedBook ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-6 shadow-sm">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-4xl text-slate-400">
            🛒
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-slate-900 font-serif">
              {lang === 'ar' ? 'سلة المشتريات فارغة حالياً' : 'Votre panier est actuellement vide'}
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {lang === 'ar'
                ? 'لم تقم بإضافة أي كتاب مدرسي أو اشتراك trimestriel بعد. تصفح دليل الكتب لاختيار منهاجك.'
                : 'Sélectionnez un manuel ou un pack trimestriel dans le catalogue officiel pour commencer.'}
            </p>
          </div>
          <div>
            <Link
              href="/catalogue"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition"
            >
              <Icons.BookOpen className="w-4 h-4" />
              <span>{lang === 'ar' ? 'استكشاف دليل الكتب والمنشورات' : 'Explorer le Catalogue des Manuels'}</span>
            </Link>
          </div>
        </div>
      ) : orderComplete ? (
        /* ── STATE 2: DIGITAL ORDER COMPLETED (Instant) ───────────────────── */
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 sm:p-10 text-center space-y-6 shadow-xl animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl">
            ✓
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 font-serif">
              {lang === 'ar' ? 'تم تأكيد طلبك بنجاح !' : 'Paiement Confirmé avec Succès !'}
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Votre droit d&apos;accès au manuel officiel et aux séances vidéo associées a été instantanément inscrit sur votre compte élève.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-md mx-auto text-xs space-y-2.5 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Numéro de Reçu :</span>
              <span className="font-mono font-bold text-slate-900">{orderComplete.purchaseId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Montant Débité :</span>
              <span className="font-bold text-slate-900 font-mono">{(orderComplete.totalMillimes / 1000).toFixed(3)} DT</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Fournisseur :</span>
              <span className="font-semibold text-blue-700">{digitalProvider}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Validité jusqu&apos;au :</span>
              <span className="font-semibold text-emerald-700">30 Juin 2027 (Fin d&apos;Année Scolaire)</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-4">
            <Link
              href={`/student/library/${selectedBook.id}`}
              className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-xs flex items-center gap-2"
            >
              <span>Accéder au Manuel dans la Bibliothèque</span>
              <span>→</span>
            </Link>
            <button
              onClick={() => {
                setOrderComplete(null);
                setActiveCartBookId(null);
              }}
              className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Faire un autre achat
            </button>
          </div>
        </div>
      ) : d17SubmittedTx ? (
        /* ── STATE 3: D17 SUBMISSION & REVIEW ─────────────────────────────── */
        <div className="bg-white rounded-3xl border border-blue-200 p-8 sm:p-10 space-y-6 shadow-xl animate-in zoom-in-95">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center text-2xl font-bold">
                📮
              </div>
              <div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                  {d17SubmittedTx.status === 'APPROVED' ? 'PAIEMENT APPROUVÉ' : 'EN ATTENTE DE VÉRIFICATION'}
                </span>
                <h2 className="text-xl font-bold text-slate-900 font-serif mt-1">
                  Virement D17 : Réf. {d17SubmittedTx.reference}
                </h2>
              </div>
            </div>

            <div className="text-right">
              <div className="text-xs text-slate-400">Montant déclaré :</div>
              <div className="text-2xl font-bold font-mono text-blue-700">
                {formatDT(d17SubmittedTx.amountMillimes)}
              </div>
            </div>
          </div>

          {d17SubmittedTx.status === 'APPROVED' ? (
            <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs space-y-3 text-emerald-950">
              <div className="font-bold flex items-center gap-2 text-sm text-emerald-800">
                <span>✓</span>
                <span>Paiement D17 Validé avec succès par l&apos;administration TuniEdu !</span>
              </div>
              <p>
                Votre reçu postal a été vérifié par notre service comptabilité. Vos droits d&apos;accès au manuel{' '}
                <strong>{selectedBook.title}</strong> ont été immédiatement activés.
              </p>
              <div className="pt-2">
                <Link
                  href={`/student/library/${selectedBook.id}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold transition shadow-xs"
                >
                  <span>Ouvrir mon manuel dans la bibliothèque</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50/70 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-2">
                <div className="font-bold flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  <span>Demande d&apos;activation en cours de traitement</span>
                </div>
                <p className="leading-relaxed">
                  Votre référence D17 <strong>{d17SubmittedTx.reference}</strong> a été enregistrée dans la file
                  d&apos;attente de notre équipe comptable. La validation manuelle prend généralement entre 15 et 45 minutes
                  aux horaires ouvrables de la Poste Tunisienne.
                </p>
              </div>

              {/* Interactive Demo Simulator Button */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-800">Mode Démonstration & Test Pédagogique :</span>
                  <p className="text-slate-500 text-[11px]">
                    Simulez l&apos;approbation immédiate de la commande par le contrôleur administratif.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSimulateAdminApproval}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shrink-0 shadow-xs transition"
                >
                  ⚡ Valider immédiatement (Simulation Admin)
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              onClick={() => setD17SubmittedTx(null)}
              className="text-xs text-slate-500 hover:text-slate-800 font-semibold"
            >
              ← Revenir au formulaire de commande
            </button>
            <Link href="/student/library" className="text-xs text-blue-700 hover:underline font-semibold">
              Consulter mes documents →
            </Link>
          </div>
        </div>
      ) : prepaidSuccess ? (
        /* ── STATE 4: PREPAID CARD REDEEMED ───────────────────────────────── */
        <div className="bg-white rounded-3xl border border-emerald-200 p-8 sm:p-10 text-center space-y-6 shadow-xl animate-in zoom-in-95">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto text-3xl">
            🎁
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-slate-900 font-serif">
              Carte Prépayée Activée avec Succès !
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Le code secret a été validé. Vos accès aux cours, vidéos et exercices corrigés sont maintenant actifs.
            </p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 max-w-sm mx-auto text-xs space-y-2 text-left">
            <div className="flex justify-between">
              <span className="text-slate-500">Code Carte :</span>
              <span className="font-mono font-bold text-slate-800">{prepaidCode.toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Type de Droit :</span>
              <span className="font-semibold text-blue-700">Accès Annuel Homologué</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bénéficiaire :</span>
              <span className="font-semibold text-slate-800">{currentUser?.name ?? 'Invité'}</span>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href={`/student/library/${selectedBook.id}`}
              className="px-6 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-bold transition shadow-xs inline-flex items-center gap-2"
            >
              <span>Accéder directement au contenu</span>
              <span>→</span>
            </Link>
          </div>
        </div>
      ) : (
        /* ── POPULATED BASKET & CHECKOUT FORM ─────────────────────────────── */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Plan, Trimester, and Payment Modes */}
          <div className="lg:col-span-7 space-y-6">
            {/* Selected Book Header Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-900 text-white flex items-center justify-center text-lg font-bold">
                  📖
                </div>
                <div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
                    {selectedBook.levelNameFr}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mt-1">{selectedBook.title}</h3>
                  <p className="text-xs text-slate-400">Auteur agréé : {selectedBook.professorName}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveCartBookId(null)}
                className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-xl transition"
                title="Vider le panier"
              >
                <Icons.Trash className="w-4 h-4" />
              </button>
            </div>

            {/* Formula Selector: 3 Options */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                1. Choisissez votre Formule d&apos;Accès :
              </label>

              {/* Plan 1: Book Only */}
              <div
                onClick={() => setSelectedPlan('BOOK_ONLY')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedPlan === 'BOOK_ONLY'
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📄</span>
                    <div>
                      <div className="font-bold text-sm text-slate-900">Livre Numérique Seul</div>
                      <div className="text-xs text-slate-500">
                        Manuel complet, cours illustrés, exercices et corrigés détaillés.
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-slate-900">{formatDT(bookOnlyPrice)}</div>
                    <div className="text-[10px] text-slate-400">Accès annuel</div>
                  </div>
                </div>
              </div>

              {/* Plan 2: Trimester Bundle (Recommended) */}
              <div
                onClick={() => setSelectedPlan('TRIMESTER_BUNDLE')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all relative ${
                  selectedPlan === 'TRIMESTER_BUNDLE'
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <span className="absolute -top-2.5 right-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                  Recommandé par les enseignants
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📦</span>
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        Pack Trimestriel Intégral
                      </div>
                      <div className="text-xs text-slate-500">
                        Livre + Vidéos HLS de cours + Séances interactives en direct (Lives) du trimestre.
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-blue-700 text-base">{formatDT(bundlePrice)}</div>
                    <div className="text-[10px] text-slate-400">Par trimestre</div>
                  </div>
                </div>
              </div>

              {/* Plan 3: Annual Pass */}
              <div
                onClick={() => setSelectedPlan('ANNUAL_PASS')}
                className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                  selectedPlan === 'ANNUAL_PASS'
                    ? 'bg-blue-50/70 border-blue-600 ring-2 ring-blue-600/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🌟</span>
                    <div>
                      <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                        Pass Annuel Intégral
                        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.2 rounded">
                          -15% remise
                        </span>
                      </div>
                      <div className="text-xs text-slate-500">
                        Tous les 3 trimestres inclus (T1 + T2 + T3) : Livres, Toutes les vidéos & Tous les Lives.
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-emerald-700 text-base">{formatDT(annualPrice)}</div>
                    <div className="text-[10px] text-slate-400">Pour toute l&apos;année</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Trimester selection (if Trimestrial Bundle selected) */}
            {selectedPlan === 'TRIMESTER_BUNDLE' && (
              <div className="space-y-2 pt-1">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Sélectionnez votre Trimestre :
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'T1', label: 'Trimestre 1', dates: 'Sept – Déc', active: true },
                    { id: 'T2', label: 'Trimestre 2', dates: 'Jan – Mars', active: false },
                    { id: 'T3', label: 'Trimestre 3', dates: 'Avr – Juin', active: false },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTrimester(t.id as 'T1' | 'T2' | 'T3')}
                      className={`p-3 rounded-xl border text-center transition ${
                        selectedTrimester === t.id
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="text-xs font-bold">{t.label}</div>
                      <div className={`text-[10px] ${selectedTrimester === t.id ? 'text-blue-100' : 'text-slate-400'}`}>
                        {t.dates} {t.active && '● En cours'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Mode Selector Tabs (Digital vs D17 vs Prepaid Card) */}
            <div className="space-y-3 pt-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                2. Choisissez votre Mode de Règlement :
              </label>

              <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setPaymentMode('DIGITAL')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMode === 'DIGITAL'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>💳</span>
                  <span>En Ligne (Flouci)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('D17')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMode === 'D17'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>📮</span>
                  <span>Poste D17</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode('PREPAID_CARD')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                    paymentMode === 'PREPAID_CARD'
                      ? 'bg-white text-blue-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>🎟️</span>
                  <span>Carte Prépayée</span>
                </button>
              </div>

              {/* Sub-Panel: Mode 1 - Digital Providers */}
              {paymentMode === 'DIGITAL' && (
                <div className="p-4 bg-white rounded-2xl border border-slate-200 space-y-3 animate-in fade-in">
                  <div className="text-xs font-semibold text-slate-700">Sélectionnez votre portefeuille :</div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { id: 'FLOUCI', label: 'Flouci', icon: '📱', sub: 'Wallet & QR Code' },
                      { id: 'KONNECT', label: 'Konnect', icon: '💳', sub: 'Carte Bancaire' },
                      { id: 'GPG', label: 'GPG / CIB', icon: '🏦', sub: 'Carte E-Dinar' },
                    ].map((prov) => (
                      <button
                        key={prov.id}
                        type="button"
                        onClick={() => setDigitalProvider(prov.id as 'FLOUCI' | 'KONNECT' | 'GPG')}
                        className={`p-3 rounded-xl border text-left transition ${
                          digitalProvider === prov.id
                            ? 'bg-blue-50 border-blue-600 ring-2 ring-blue-600/20 text-blue-900'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="text-lg">{prov.icon}</div>
                        <div className="text-xs font-bold mt-1">{prov.label}</div>
                        <div className="text-[10px] text-slate-400">{prov.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sub-Panel: Mode 2 - D17 La Poste Tunisienne */}
              {paymentMode === 'D17' && (
                <form onSubmit={handleSubmitD17} className="p-5 bg-white rounded-2xl border border-blue-200 space-y-4 animate-in fade-in">
                  {/* Postal account badge */}
                  <div className="p-3.5 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="font-bold flex items-center gap-1.5">
                        <span>🏛️</span>
                        <span>Compte Courant Postal (CCP) TuniEdu :</span>
                      </div>
                      <div className="font-mono text-base font-extrabold text-blue-800 tracking-wider mt-0.5">
                        17 000 842 190
                      </div>
                      <div className="text-[10px] text-blue-600">Titulaire : Plateforme TuniEdu Nationale</div>
                    </div>
                    <div className="text-right sm:border-l sm:border-blue-200 sm:pl-3">
                      <div className="text-[10px] text-slate-500">Montant exact à virer :</div>
                      <div className="font-mono font-bold text-sm text-slate-900">
                        {formatDT(currentPriceMillimes)}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        Numéro de Reçu / Référence de la transaction D17 *
                      </label>
                      <input
                        type="text"
                        value={d17Reference}
                        onChange={(e) => setD17Reference(e.target.value)}
                        placeholder="Ex: D17-98421045 ou 8 chiffres du reçu postal"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-none"
                        required
                      />
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        Visible sur le SMS de confirmation D17 ou le ticket émis par le guichet postal.
                      </span>
                    </div>

                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        Note additionnelle ou bureau de poste (Optionnel)
                      </label>
                      <input
                        type="text"
                        value={d17Note}
                        onChange={(e) => setD17Note(e.target.value)}
                        placeholder="Ex: Bureau de poste Menzah VI, expéditeur Mounir"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-none"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'Vérification en cours...' : 'Soumettre le Reçu D17 pour Validation'}
                    </button>
                  </div>
                </form>
              )}

              {/* Sub-Panel: Mode 3 - Prepaid Scratch Card */}
              {paymentMode === 'PREPAID_CARD' && (
                <form onSubmit={handleRedeemPrepaid} className="p-5 bg-white rounded-2xl border border-emerald-200 space-y-4 animate-in fade-in">
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950">
                    <div className="font-bold flex items-center gap-1.5">
                      <span>🎟️</span>
                      <span>Carte Prépayée Scolaire (Partenaires & Librairies)</span>
                    </div>
                    <p className="text-[11px] text-emerald-800 mt-1">
                      Grattez la bande grise au verso de votre carte physique TuniEdu/Abajim achetée en librairie pour révéler le code à 12 caractères.
                    </p>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="font-bold text-slate-800 block mb-1">
                        Code Secret de la Carte Prépayée *
                      </label>
                      <input
                        type="text"
                        value={prepaidCode}
                        onChange={(e) => setPrepaidCode(e.target.value.toUpperCase())}
                        placeholder="Ex: ABA-2026-9812-4410"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-mono font-bold tracking-wider text-slate-900 focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                        required
                      />
                    </div>

                    {/* Quick test code buttons */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] text-slate-400 font-semibold">Codes de test :</span>
                      <button
                        type="button"
                        onClick={() => setPrepaidCode('ABA-2026-9812-4410')}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        ABA-2026-9812-4410
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrepaidCode('ABA-2026-5519-7723')}
                        className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700"
                      >
                        ABA-2026-5519-7723
                      </button>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? 'Vérification...' : 'Valider & Activer la Carte Prépayée'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          {/* Right Column: Order Summary & Confirmation Box */}
          <div className="lg:col-span-5">
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-7 shadow-xl space-y-6 sticky top-24 border border-slate-800">
              <h3 className="font-bold text-base border-b border-slate-800 pb-3 flex items-center justify-between">
                <span>Récapitulatif Commande</span>
                <span className="text-xs text-blue-400 font-normal">TND (Dinar Tunisien)</span>
              </h3>

              <div className="space-y-3 text-xs text-slate-300">
                <div className="flex justify-between">
                  <span>Article :</span>
                  <span className="font-medium text-white truncate max-w-[180px]">{selectedBook.title}</span>
                </div>
                <div className="flex justify-between">
                  <span>Formule :</span>
                  <span className="font-semibold text-blue-300">
                    {selectedPlan === 'BOOK_ONLY'
                      ? 'Livre Seul'
                      : selectedPlan === 'TRIMESTER_BUNDLE'
                      ? `Pack Trimestriel (${selectedTrimester})`
                      : 'Pass Annuel Intégral'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Validité :</span>
                  <span className="text-slate-400">Jusqu&apos;au 30 Juin 2027</span>
                </div>
                <div className="flex justify-between">
                  <span>Frais de dossier :</span>
                  <span className="text-emerald-400 font-semibold">0.000 DT (Gratuit)</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-baseline justify-between">
                <div>
                  <div className="text-xs text-slate-400">Total TTC à régler :</div>
                  <div className="text-3xl font-bold font-mono text-white mt-0.5">
                    {formatDT(currentPriceMillimes)}
                  </div>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {currentPriceMillimes} millimes
                </span>
              </div>

              {/* Digital Confirm Button (Only when Digital Mode selected) */}
              {paymentMode === 'DIGITAL' && (
                <button
                  type="button"
                  onClick={handleConfirmDigitalOrder}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-blue-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
                  id="btn-confirm-checkout"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      <span>Traitement bancaire sécurisé...</span>
                    </>
                  ) : (
                    <>
                      <span>Régler avec {digitalProvider}</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              )}

              {paymentMode === 'D17' && (
                <div className="text-[11px] text-amber-300 text-center bg-amber-950/40 p-3 rounded-xl border border-amber-800/50">
                  Remplissez le formulaire de référence D17 à gauche pour finaliser votre commande postale.
                </div>
              )}

              {paymentMode === 'PREPAID_CARD' && (
                <div className="text-[11px] text-emerald-300 text-center bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/50">
                  Saisissez le code secret gratté dans l&apos;encart à gauche pour débloquer votre accès instantanément.
                </div>
              )}

              <div className="text-[11px] text-slate-400 text-center leading-relaxed">
                Paiement direct sécurisé. Votre reçu et vos codes d&apos;accès seront disponibles immédiatement.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION: PURCHASE & D17 HISTORY (Section 2.2 of Dossier) ─────── */}
      <div className="pt-8 border-t border-slate-200 space-y-4">
        <h2 className="text-lg font-bold text-slate-900 font-serif flex items-center gap-2">
          <Icons.Clock className="w-5 h-5 text-slate-400" />
          <span>Historique de vos commandes et virements D17</span>
        </h2>

        {userPurchases.length === 0 && userD17Txs.length === 0 ? (
          <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-center text-xs text-slate-500">
            Aucun historique de paiement pour l&apos;année scolaire en cours.
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4">Article / Manuel</th>
                  <th className="py-3 px-4">Mode</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {userD17Txs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{tx.reference}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">{tx.bookTitle}</td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-blue-700">La Poste D17</span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatDT(tx.amountMillimes)}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          tx.status === 'APPROVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : tx.status === 'REJECTED'
                            ? 'bg-red-50 text-red-800 border-red-200'
                            : 'bg-amber-50 text-amber-800 border-amber-200'
                        }`}
                      >
                        {tx.status === 'APPROVED'
                          ? 'Validé'
                          : tx.status === 'REJECTED'
                          ? 'Rejeté'
                          : 'En attente revue'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {tx.status === 'APPROVED' ? (
                        <Link
                          href={`/student/library/${tx.bookId}`}
                          className="text-xs text-blue-600 hover:underline font-bold"
                        >
                          Accéder →
                        </Link>
                      ) : (
                        <span className="text-slate-400 text-[11px]">En vérification</span>
                      )}
                    </td>
                  </tr>
                ))}

                {userPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{p.id}</td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {p.items[0]?.bookTitleSnapshot || 'Manuel TuniEdu'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-blue-700">Flouci / Carte</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">{formatDT(p.totalMillimes)}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Payé & Livré
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/student/library/${p.items[0]?.bookId}`}
                        className="text-xs text-blue-600 hover:underline font-bold"
                      >
                        Ouvrir →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-6xl mx-auto px-4 py-16 text-center text-sm text-slate-500">
          Chargement du panier…
        </div>
      }
    >
      <CheckoutPageContent />
    </Suspense>
  );
}
