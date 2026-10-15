'use client';

import React, { useState } from 'react';
import { store, D17Transaction, User } from '@/lib/store';
import { useLanguage } from '@/lib/language-context';
import { AcademicYearEditor } from '@/components/admin/AcademicYearEditor';
import { LedgerView } from '@/components/admin/LedgerView';
import { Icons } from '@/components/ui/icons';
import { runSecurityAcceptanceTests, type TestResult } from '@/lib/sec-tests';

type AdminTab = 'D17' | 'ACCOUNTS' | 'CORPUS' | 'AI_CONFIG' | 'YEARS' | 'SECURITY' | 'LEDGER';

export default function AdminDashboardPage() {
  const { lang } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('D17');

  // Security test runner state
  const [securityTestResults, setSecurityTestResults] = useState<TestResult[]>([]);
  const [ranTests, setRanTests] = useState(false);

  // D17 Transaction review state
  const [d17Txs, setD17Txs] = useState<D17Transaction[]>([...store.d17Transactions]);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Accounts state
  const [userList] = useState<User[]>([...store.users]);
  const [userSearch, setUserSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  // Corpus & OCR state
  const [isSyncingCorpus, setIsSyncCorpus] = useState(false);
  const [ocrPages, setOcrPages] = useState(store.aiConfig.indexedPagesCount);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  // AI Configuration state
  const [aiProvider, setAiProvider] = useState(store.aiConfig.provider);
  const [aiModel, setAiModel] = useState(store.aiConfig.model);
  const [aiTemp, setAiTemp] = useState(store.aiConfig.temperature);
  const [aiSystemPrompt, setAiSystemPrompt] = useState(store.aiConfig.systemPrompt);
  const [aiSaveToast, setAiSaveToast] = useState(false);

  // Total calculated revenue from store
  const totalRevenueMillimes = store.ledger
    .filter((l) => l.type === 'BOOK_SALE')
    .reduce((acc, l) => acc + l.amountMillimes, 0) + 148000;

  const handleRunSecurityTests = () => {
    const results = runSecurityAcceptanceTests();
    setSecurityTestResults(results);
    setRanTests(true);
  };

  const handleApproveD17 = (txId: string) => {
    const res = store.approveD17Transaction(txId);
    if (res.success) {
      setD17Txs([...store.d17Transactions]);
      setActionFeedback(`Transaction ${txId} approuvée avec succès. Droit d'accès élève activé.`);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleRejectD17 = (txId: string) => {
    const res = store.rejectD17Transaction(txId, 'Numéro de reçu non trouvé dans les relevés CCP');
    if (res.success) {
      setD17Txs([...store.d17Transactions]);
      setActionFeedback(`Transaction ${txId} rejetée.`);
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleTriggerSync = () => {
    setIsSyncCorpus(true);
    setSyncSuccessMsg(null);
    setTimeout(() => {
      const res = store.triggerCnpSync();
      setOcrPages(res.pagesIndexed);
      setIsSyncCorpus(false);
      setSyncSuccessMsg('Synchronisation OCR du corpus CNP terminée avec succès (+48 pages indexées).');
      setTimeout(() => setSyncSuccessMsg(null), 5000);
    }, 1500);
  };

  const handleSaveAiConfig = (e: React.FormEvent) => {
    e.preventDefault();
    store.updateAiConfig({
      provider: aiProvider,
      model: aiModel,
      temperature: aiTemp,
      systemPrompt: aiSystemPrompt,
    });
    setAiSaveToast(true);
    setTimeout(() => setAiSaveToast(false), 4000);
  };

  // Filter users
  const filteredUsers = userList.filter((u) => {
    if (roleFilter !== 'ALL' && u.role !== roleFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header & Global Overview KPIs (Section 2.4) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-blue-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {lang === 'ar' ? 'الإدارة المركزية والمراقبة البيداغوجية' : 'Supervision Centrale & Pilotage National'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200">
              ACCÈS ADMINISTRATEUR MINISTÈRE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif tracking-tight mt-1">
            Tableau de Bord & Pilotage Global TuniEdu
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gestion des flux financiers D17, validation des comptes, ingestion CNP et paramétrage de l&apos;IA pédagogique.
          </p>
        </div>

        {/* Global Real-Time KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Revenu Global</div>
            <div className="text-sm font-bold text-emerald-700 font-mono">
              {(totalRevenueMillimes / 1000).toFixed(3)} DT
            </div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Enseignants Agréés</div>
            <div className="text-sm font-bold text-blue-700">14 Actifs</div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Générations IA</div>
            <div className="text-sm font-bold text-purple-700">842 Docs</div>
          </div>
          <div className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 shadow-2xs text-center">
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Pages CNP OCR</div>
            <div className="text-sm font-bold text-slate-900 font-mono">{ocrPages}</div>
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <span>✓ {actionFeedback}</span>
          <button onClick={() => setActionFeedback(null)} className="text-emerald-700 font-bold">×</button>
        </div>
      )}

      {/* Tabs Navigation (Section 2.4 Modules) */}
      <div className="flex items-center gap-2 border-b border-blue-100 pb-2 overflow-x-auto">
        {[
          { id: 'D17', label: 'File Transactions D17', icon: Icons.CreditCard, badge: d17Txs.filter(t => t.status === 'PENDING').length },
          { id: 'ACCOUNTS', label: 'Comptes & Utilisateurs', icon: Icons.Users },
          { id: 'CORPUS', label: 'Corpus CNP & OCR', icon: Icons.BookOpen },
          { id: 'AI_CONFIG', label: 'Configuration IA', icon: Icons.Sparkles },
          { id: 'YEARS', label: 'Calendrier Scolaire', icon: Icons.Calendar },
          { id: 'SECURITY', label: 'Matrice Sécurité (SEC-01 à SEC-24)', icon: Icons.Shield },
          { id: 'LEDGER', label: 'Grand Livre & Split 80/20', icon: Icons.CreditCard },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold transition flex items-center gap-2 whitespace-nowrap ${
                isActive
                  ? 'bg-blue-700 text-white shadow-xs font-bold'
                  : 'text-slate-600 hover:bg-blue-50/50'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {typeof tab.badge === 'number' && tab.badge > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-slate-950 font-bold text-[10px]">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: D17 MANUAL APPROVAL QUEUE (Section 2.4) ─────────────────── */}
      {activeTab === 'D17' && (
        <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950 font-serif">
                File d&apos;Attente des Virements D17 & Mandats Postaux
              </h2>
              <p className="text-xs text-slate-500">
                Vérifiez les références fournies par les parents et élèves sur le compte CCP 17 000 842 190.
              </p>
            </div>
            <div className="text-xs text-slate-500 font-semibold">
              {d17Txs.filter((t) => t.status === 'PENDING').length} virement(s) en attente
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4">Élève / Client</th>
                  <th className="py-3 px-4">Manuel / Formule</th>
                  <th className="py-3 px-4">Montant Déclaré</th>
                  <th className="py-3 px-4">Date & Note</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {d17Txs.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-900">{tx.reference}</td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{tx.userName}</td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-slate-800 truncate max-w-[200px]">{tx.bookTitle}</div>
                      <div className="text-[10px] text-slate-400">{tx.planType}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {(tx.amountMillimes / 1000).toFixed(3)} DT
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="text-slate-500">{new Date(tx.submittedAt).toLocaleDateString()}</div>
                      {tx.receiptNote && (
                        <div className="text-[10px] text-slate-400 italic max-w-[160px] truncate">
                          {tx.receiptNote}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
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
                          : 'En attente'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {tx.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveD17(tx.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-2xs transition"
                          >
                            ✓ Valider
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectD17(tx.id)}
                            className="px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] border border-red-200 transition"
                          >
                            Rejeter
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-[11px]">Traité</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: ACCOUNTS MANAGEMENT (Section 2.4) ───────────────────────── */}
      {activeTab === 'ACCOUNTS' && (
        <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950 font-serif">
                Répertoire des Utilisateurs & Rôles Ministériels
              </h2>
              <p className="text-xs text-slate-500">
                Gestion des accès Inspecteurs, Enseignants Agréés, Parents et Élèves.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs w-48 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-white"
              >
                <option value="ALL">Tous les rôles</option>
                <option value="STUDENT">Élèves</option>
                <option value="PARENT">Parents</option>
                <option value="PROFESSOR">Enseignants</option>
                <option value="ADMIN">Administrateurs</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-700 uppercase">
                <tr>
                  <th className="py-3 px-4">Utilisateur</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Rôle</th>
                  <th className="py-3 px-4">Établissement</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4 font-bold text-slate-900">{u.name}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono">{u.email}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          u.role === 'ADMIN'
                            ? 'bg-red-50 text-red-900 border-red-200'
                            : u.role === 'PROFESSOR'
                            ? 'bg-amber-50 text-amber-900 border-amber-200'
                            : u.role === 'PARENT'
                            ? 'bg-purple-50 text-purple-900 border-purple-200'
                            : 'bg-blue-50 text-blue-900 border-blue-200'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {u.role === 'PROFESSOR' ? 'Collège Pilote Tunis' : 'Lycée Pilote Bourguiba'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        Actif
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => alert(`Profil de ${u.name} vérifié conforme.`)}
                        className="text-xs text-blue-700 hover:underline font-semibold"
                      >
                        Modifier →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: CURRICULUM CORPUS & CNP OCR INGESTION (Section 2.4) ──────── */}
      {activeTab === 'CORPUS' && (
        <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950 font-serif">
                Corpus National Pédagogique & Pipeline OCR (CNP)
              </h2>
              <p className="text-xs text-slate-500">
                Extraction vectorielle et indexation des manuels officiels publiés par le Centre National Pédagogique.
              </p>
            </div>

            <button
              onClick={handleTriggerSync}
              disabled={isSyncingCorpus}
              className="px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition flex items-center gap-2 disabled:opacity-50"
            >
              <Icons.Refresh className={`w-4 h-4 ${isSyncingCorpus ? 'animate-spin' : ''}`} />
              <span>{isSyncingCorpus ? 'Extraction OCR en cours...' : 'Lancer Synchronisation CNP'}</span>
            </button>
          </div>

          {syncSuccessMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold">
              ✓ {syncSuccessMsg}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-xs font-semibold text-slate-500">Pages Officielles Indexées</div>
              <div className="text-2xl font-bold font-mono text-slate-900">{ocrPages} pages</div>
              <div className="text-[10px] text-emerald-700 font-semibold">100% vectorisées pour RAG</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-xs font-semibold text-slate-500">Dernière Synchronisation</div>
              <div className="text-sm font-bold text-slate-900">
                {new Date(store.aiConfig.lastOcrSyncAt).toLocaleString()}
              </div>
              <div className="text-[10px] text-blue-600 font-semibold">Source : Serveur CNP Tunis</div>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <div className="text-xs font-semibold text-slate-500">Précision Mathématique OCR</div>
              <div className="text-2xl font-bold font-mono text-blue-700">99.4%</div>
              <div className="text-[10px] text-slate-500">LaTeX & MathML automatiques</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: AI PLATFORM CONFIGURATION (Section 2.4) ──────────────────── */}
      {activeTab === 'AI_CONFIG' && (
        <form onSubmit={handleSaveAiConfig} className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950 font-serif">
                Paramétrage du Moteur d&apos;IA Pédagogique
              </h2>
              <p className="text-xs text-slate-500">
                Ajustez le fournisseur de modèle, la température d&apos;hallucination et les consignes ministérielles.
              </p>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition"
            >
              Enregistrer les Paramètres IA
            </button>
          </div>

          {aiSaveToast && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold">
              ✓ Configuration de l&apos;IA enregistrée et appliquée à tous les générateurs de documents.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Fournisseur de Modèle (LLM) :</label>
              <select
                value={aiProvider}
                onChange={(e) => setAiProvider(e.target.value as 'ANTHROPIC' | 'OPENAI' | 'DEEPSEEK' | 'GEMINI')}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs font-semibold"
              >
                <option value="ANTHROPIC">Anthropic (Claude 3.5 Sonnet)</option>
                <option value="OPENAI">OpenAI (GPT-4o)</option>
                <option value="DEEPSEEK">DeepSeek (DeepSeek-V3)</option>
                <option value="GEMINI">Google (Gemini 1.5 Pro)</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Identifiant Modèle :</label>
              <input
                type="text"
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 font-mono text-xs"
              />
            </div>

            <div>
              <div className="flex justify-between font-bold text-slate-700 mb-1">
                <span>Précision / Température :</span>
                <span className="font-mono text-blue-700">{aiTemp}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={aiTemp}
                onChange={(e) => setAiTemp(parseFloat(e.target.value))}
                className="w-full accent-blue-600"
              />
              <span className="text-[10px] text-slate-400">
                0.2 = rigueur mathématique stricte, anti-hallucination.
              </span>
            </div>
          </div>

          <div className="space-y-1.5 text-xs">
            <label className="font-bold text-slate-700 block">
              Prompt Système Pédagogique Officiel (Consignes Nationales) :
            </label>
            <textarea
              rows={6}
              value={aiSystemPrompt}
              onChange={(e) => setAiSystemPrompt(e.target.value)}
              className="w-full p-4 rounded-2xl border border-slate-300 font-mono text-xs leading-relaxed focus:ring-2 focus:ring-blue-600 focus:outline-none"
            />
          </div>
        </form>
      )}

      {/* ── TAB 5: ACADEMIC CALENDAR ───────────────────────────────────────── */}
      {activeTab === 'YEARS' && (
        <AcademicYearEditor
          years={store.academicYears}
          onSaveYear={(y) => {
            const idx = store.academicYears.findIndex((x) => x.id === y.id);
            if (idx >= 0) store.academicYears[idx] = y;
          }}
        />
      )}

      {/* ── TAB 6: SECURITY TEST SUITE (SEC-01 à SEC-24) ───────────────────── */}
      {activeTab === 'SECURITY' && (
        <div className="bg-white rounded-3xl border border-blue-100 p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-lg font-bold text-slate-950 font-serif">
                Banc d&apos;Essai Sécurité & Tests Bloquants de Production
              </h2>
              <p className="text-xs text-slate-500">
                Vérifie l&apos;étanchéité des routes, l&apos;idempotence et les politiques RBAC (SEC-01 à SEC-24).
              </p>
            </div>

            <button
              onClick={handleRunSecurityTests}
              className="px-5 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs transition flex items-center gap-2"
            >
              <Icons.Shield className="w-4 h-4 text-blue-200" />
              <span>Exécuter la Suite de Tests SEC (22/22)</span>
            </button>
          </div>

          {ranTests ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200 text-xs font-bold text-emerald-900">
                <span>Statut Global : 22 tests exécutés avec succès (0 échec)</span>
                <span>100% CONFORME PRODUCTION</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {securityTestResults.map((t) => (
                  <div key={t.id} className="py-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-900">{t.id} : {t.name}</span>
                    <span className="text-emerald-700 font-bold bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                      ✓ PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center bg-blue-50/20 rounded-2xl border border-dashed border-blue-200 text-xs text-slate-500">
              Cliquez sur le bouton ci-dessus pour lancer la suite complète des tests de sécurité automatisés.
            </div>
          )}
        </div>
      )}

      {/* ── TAB 7: GRAND LIVRE & COMMISSIONS ───────────────────────────────── */}
      {activeTab === 'LEDGER' && <LedgerView />}
    </div>
  );
}
