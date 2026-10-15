'use client';

import React, { useState } from 'react';
import { store, FinancialLedgerEntry } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { Icons } from '@/components/ui/icons';

export function LedgerView() {
  const { lang, isRtl } = useLanguage();
  const [ledgerEntries, setLedgerEntries] = useState<FinancialLedgerEntry[]>([...store.ledger]);
  const [filterType, setFilterType] = useState<'ALL' | 'SALE' | 'PLATFORM_COMMISSION' | 'PAYOUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  const [payoutAmountDT, setPayoutAmountDT] = useState('50.000');
  const [payoutProfId] = useState('prof_hichem_profile');
  const [notificationMsg, setNotificationMsg] = useState('');

  // Financial calculations
  const totalGrossMillimes = ledgerEntries
    .filter((e) => e.type === 'SALE')
    .reduce((sum, e) => sum + e.amountMillimes, 0);

  const totalCommissionMillimes = ledgerEntries
    .filter((e) => e.type === 'PLATFORM_COMMISSION')
    .reduce((sum, e) => sum + e.amountMillimes, 0);

  const totalAuthorRoyaltiesMillimes = totalGrossMillimes - totalCommissionMillimes;

  const totalPayoutsMillimes = ledgerEntries
    .filter((e) => e.type === 'PAYOUT')
    .reduce((sum, e) => sum + e.amountMillimes, 0);

  const pendingRoyaltiesMillimes = Math.max(0, totalAuthorRoyaltiesMillimes - totalPayoutsMillimes);

  const formatDT = (millimes: number) => {
    return (millimes / 1000).toFixed(3) + ' DT';
  };

  const filteredEntries = ledgerEntries.filter((entry) => {
    if (filterType !== 'ALL' && entry.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = entry.reference.toLowerCase().includes(q);
      const matchDesc = entry.description.toLowerCase().includes(q);
      if (!matchRef && !matchDesc) return false;
    }
    return true;
  });

  const handleExecutePayout = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(payoutAmountDT);
    if (isNaN(amountNum) || amountNum <= 0) return;

    const millimes = Math.round(amountNum * 1000);
    store.recordPayout(
      payoutProfId,
      millimes,
      `BCT-VIR-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
    );

    setLedgerEntries([...store.ledger]);
    setIsPayoutModalOpen(false);
    setNotificationMsg(
      lang === 'ar'
        ? `تم تسجيل أمر التحويل البنكي بنجاح بمبلغ ${(millimes / 1000).toFixed(3)} د.ت عبر المقاصة البنكية.`
        : `Ordre de virement bancaire de ${(millimes / 1000).toFixed(3)} DT enregistré avec succès vers la BIAT.`
    );
    setTimeout(() => setNotificationMsg(''), 6000);
  };

  const handleExportCSV = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,ID,Date,Reference,Type,Description,AmountMillimes,AmountDT\n' +
      ledgerEntries
        .map((e) => `${e.id},${e.createdAt},${e.reference},${e.type},"${e.description}",${e.amountMillimes},${(e.amountMillimes / 1000).toFixed(3)}`)
        .join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `tuniedu_grand_livre_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setNotificationMsg(lang === 'ar' ? 'تم تصدير ملف المحاسبة بنجاح.' : 'Grand livre comptable exporté au format CSV.');
    setTimeout(() => setNotificationMsg(''), 4000);
  };

  return (
    <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-8 shadow-sm space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-blue-100">
        <div>
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            {lang === 'ar' ? 'المطابقة المالية والمحاسبية الوطنية' : 'Comptabilité & Grand Livre Plateforme'}
          </div>
          <h2 className="text-lg font-bold text-slate-950 font-serif">
            {lang === 'ar' ? 'سجل العمليات والعمولات (20% منصة / 80% مؤلف)' : 'Grand Livre des Transactions & Commissions (20% / 80%)'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {lang === 'ar'
              ? 'تتبع دقيق بالمليم التونسي لكل عملية شراء، عمولة، وتحويلات بنكية موجهة للأساتذة المؤلفين.'
              : 'Traçabilité intégrale au millime tunisien de chaque vente, prélèvement de commission et versement auteur.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
          >
            <Icons.FileText className="w-3.5 h-3.5 text-blue-700" />
            <span>{lang === 'ar' ? 'تصدير Grand Livre (CSV)' : 'Exporter Relevé (CSV)'}</span>
          </button>

          <button
            onClick={() => setIsPayoutModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
          >
            <Icons.CreditCard className="w-3.5 h-3.5 text-blue-200" />
            <span>{lang === 'ar' ? 'إجراء تحويل بنكي للمؤلف' : 'Déclencher Virement Auteur'}</span>
          </button>
        </div>
      </div>

      {notificationMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-center gap-2">
          <Icons.CheckCircle className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Gross Sales */}
        <div className="p-4 rounded-2xl bg-blue-50/40 border border-blue-100 space-y-1">
          <div className="text-[10px] text-slate-500 uppercase font-semibold">
            {lang === 'ar' ? 'إجمالي المبيعات المحققة' : 'Recettes Brutes Encaissées'}
          </div>
          <div className="text-2xl font-bold text-slate-900 font-serif">
            {formatDT(totalGrossMillimes)}
          </div>
          <div className="text-[11px] text-blue-700 font-mono">
            {totalGrossMillimes.toLocaleString()} {lang === 'ar' ? 'مليم' : 'millimes'}
          </div>
        </div>

        {/* Platform 20% Commission */}
        <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 space-y-1">
          <div className="text-[10px] text-blue-900 uppercase font-semibold flex items-center justify-between">
            <span>{lang === 'ar' ? 'عمولة المنصة (20%)' : 'Commission TuniEdu (20%)'}</span>
            <span className="text-[9px] bg-blue-700 text-white px-1.5 py-0.5 rounded font-mono">2000 bps</span>
          </div>
          <div className="text-2xl font-bold text-blue-950 font-serif">
            {formatDT(totalCommissionMillimes)}
          </div>
          <div className="text-[11px] text-blue-800 font-mono">
            {totalCommissionMillimes.toLocaleString()} {lang === 'ar' ? 'مليم' : 'millimes'}
          </div>
        </div>

        {/* Total Author Royalties (80%) */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
          <div className="text-[10px] text-slate-600 uppercase font-semibold flex items-center justify-between">
            <span>{lang === 'ar' ? 'مستحقات المؤلفين (80%)' : 'Redevances Auteurs (80%)'}</span>
            <span className="text-[9px] bg-slate-700 text-white px-1.5 py-0.5 rounded font-mono">8000 bps</span>
          </div>
          <div className="text-2xl font-bold text-slate-900 font-serif">
            {formatDT(totalAuthorRoyaltiesMillimes)}
          </div>
          <div className="text-[11px] text-slate-600 font-mono">
            {totalAuthorRoyaltiesMillimes.toLocaleString()} {lang === 'ar' ? 'مليم' : 'millimes'}
          </div>
        </div>

        {/* Pending Payout to Professors */}
        <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1">
          <div className="text-[10px] text-amber-800 uppercase font-semibold">
            {lang === 'ar' ? 'الرصيد المتبقي للتحويل' : 'Solde Auteurs en Attente'}
          </div>
          <div className="text-2xl font-bold text-amber-950 font-serif">
            {formatDT(pendingRoyaltiesMillimes)}
          </div>
          <div className="text-[11px] text-amber-700 font-mono">
            {totalPayoutsMillimes > 0 ? `${formatDT(totalPayoutsMillimes)} virés` : 'Aucun virement récent'}
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterType === 'ALL'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'كل العمليات' : 'Toutes les écritures'} ({ledgerEntries.length})
          </button>
          <button
            onClick={() => setFilterType('SALE')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterType === 'SALE'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'المبيعات' : 'Ventes (SALE)'}
          </button>
          <button
            onClick={() => setFilterType('PLATFORM_COMMISSION')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterType === 'PLATFORM_COMMISSION'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'العمولات (20%)' : 'Commissions 20%'}
          </button>
          <button
            onClick={() => setFilterType('PAYOUT')}
            className={`px-3 py-1.5 rounded-xl font-medium transition ${
              filterType === 'PAYOUT'
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {lang === 'ar' ? 'التحويلات البنكية' : 'Virements (PAYOUT)'}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Icons.Search className={`w-3.5 h-3.5 text-slate-400 absolute top-1/2 -translate-y-1/2 ${isRtl ? 'right-3' : 'left-3'}`} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث بالمرجع أو الوصف...' : 'Recherche réf, descriptif...'}
            className={`w-full py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 ${
              isRtl ? 'pr-8 pl-3' : 'pl-8 pr-3'
            }`}
          />
        </div>
      </div>

      {/* Ledger Table */}
      <div className="border border-blue-100 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-blue-50/60 text-slate-600 uppercase text-[10px] tracking-wider border-b border-blue-100">
              <tr>
                <th className="py-3 px-4">{lang === 'ar' ? 'المرجع والرمز' : 'Réf. Pièce'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'التاريخ (توقيت تونس)' : 'Date & Heure'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'نوع القيد المحاسبي' : 'Nature de l\'Écriture'}</th>
                <th className="py-3 px-4">{lang === 'ar' ? 'البيان والوصف' : 'Libellé & Détails'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'القيمة (مليم)' : 'Montant (Millimes)'}</th>
                <th className="py-3 px-4 text-right">{lang === 'ar' ? 'القيمة (د.ت)' : 'Montant (DT)'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-blue-50 font-sans">
              {filteredEntries.map((entry) => {
                const isSale = entry.type === 'SALE';
                const isComm = entry.type === 'PLATFORM_COMMISSION';
                const isPayout = entry.type === 'PAYOUT';

                return (
                  <tr key={entry.id} className="hover:bg-blue-50/30 transition">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">
                      {entry.reference}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(entry.createdAt).toLocaleDateString('fr-TN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: 'Africa/Tunis',
                      })}
                    </td>
                    <td className="py-3 px-4">
                      {isSale && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {lang === 'ar' ? 'بيع كتاب (+)' : 'VENTE (+)'}
                        </span>
                      )}
                      {isComm && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                          {lang === 'ar' ? 'عمولة 20%' : 'COMMISSION 20%'}
                        </span>
                      )}
                      {isPayout && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                          {lang === 'ar' ? 'تحويل بنكي (-)' : 'VIREMENT BCT (-)'}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-800 max-w-xs truncate">
                      {entry.description}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                      {entry.amountMillimes.toLocaleString()} mil
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                      {isPayout ? `-${formatDT(entry.amountMillimes)}` : formatDT(entry.amountMillimes)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payout Trigger Modal */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/40 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-blue-100 shadow-xl max-w-md w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
                  <Icons.CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-950 text-sm font-serif">
                    {lang === 'ar' ? 'أمر تحويل بنكي لمستحقات الأستاذ' : 'Ordre de Virement Bancaire Auteur'}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    {lang === 'ar' ? 'المقاصة البنكية الوطنية (BCT)' : 'Télécompensation interbancaire BCT'}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <Icons.X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecutePayout} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {lang === 'ar' ? 'الأستاذ المستفيد والمعطيات البنكية :' : 'Enseignant bénéficiaire & RIB :'}
                </label>
                <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
                  <div className="font-bold text-slate-900">Prof. Hichem Ben Salem</div>
                  <div className="text-slate-500 font-mono text-[11px]">
                    Banque : BIAT · RIB : 08 012 0001234567890 44
                  </div>
                  <div className="text-blue-700 font-semibold text-[11px]">
                    {lang === 'ar' ? 'الرصيد المستحق غير المحول :' : 'Redevances nettes dues :'} {formatDT(pendingRoyaltiesMillimes)}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-semibold mb-1">
                  {lang === 'ar' ? 'المبلغ بالدينار التونسي (DT) :' : 'Montant à virer (DT) :'}
                </label>
                <input
                  type="text"
                  value={payoutAmountDT}
                  onChange={(e) => setPayoutAmountDT(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-600/30"
                  placeholder="ex: 50.000"
                  required
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {lang === 'ar'
                    ? 'سيتم تحويل المبلغ وحفظ رقم مرجع رسمي في السجل المالي للمنصة.'
                    : 'Le montant sera déduit du solde restant et horodaté dans le Grand Livre.'}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                >
                  {lang === 'ar' ? 'إلغاء' : 'Annuler'}
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold shadow-xs"
                >
                  {lang === 'ar' ? 'تأكيد وإصدار التحويل' : 'Valider le Virement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
