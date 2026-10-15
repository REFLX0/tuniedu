'use client';

// =============================================================================
// TuniEdu Teacher Studio: /professor
// Manages Books (PDF), Video Lessons (HLS), and Live Broadcast Sessions (WebRTC)
// =============================================================================

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { store, VideoContent, LiveSession } from '@/lib/store';
import type { LiveSessionDTO } from '@tuniedu/shared-types';
import { useLanguage } from '@/lib/language-context';
import { useSession } from '@/components/providers/SessionProvider';
import { SalesLedgerTable } from '@/components/professor/SalesLedgerTable';
import { SecureUploadModal } from '@/components/professor/SecureUploadModal';
import { VideoUploadModal } from '@/components/professor/VideoUploadModal';
import { LiveSessionModal } from '@/components/professor/LiveSessionModal';
import { TeacherBroadcastStudio } from '@/components/live/TeacherBroadcastStudio';
import { TeacherAiApprovalQueue } from '@/components/professor/TeacherAiApprovalQueue';
import { Icons } from '@/components/ui/icons';

const TUNISIAN_BANKS = [
  { id: 'BIAT', name: 'Banque Internationale Arabe de Tunisie (BIAT)' },
  { id: 'ATTIJARI', name: 'Attijariwafa Bank Tunisie' },
  { id: 'STB', name: 'Société Tunisienne de Banque (STB)' },
  { id: 'BNA', name: 'Banque Nationale Agricole (BNA)' },
  { id: 'AMEN', name: 'Amen Bank' },
  { id: 'UBCI', name: 'Union Bancaire pour le Commerce et l\'Industrie (UBCI)' },
  { id: 'BH', name: 'Banque de l\'Habitat (BH Bank)' },
  { id: 'POSTE_D17', name: 'La Poste Tunisienne — Compte D17 / CCP' },
];

export default function ProfessorStudioPage() {
  const { lang } = useLanguage();
  const { user: currentUser } = useSession();
  const professorId = currentUser?.professorProfile?.id || 'prof_hichem_profile';
  const [activeTab, setActiveTab] = useState<'MANUSCRIPTS' | 'VIDEOS' | 'LIVES' | 'LEDGER' | 'AI_QUEUE'>('MANUSCRIPTS');
  const pendingAiCount = store.aiProposals.filter((p) => p.status === 'PENDING_REVIEW').length;

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [liveModalOpen, setLiveModalOpen] = useState(false);
  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [payoutSuccessMessage, setPayoutSuccessMessage] = useState('');

  // Active Broadcast Studio session
  const [studioSession, setStudioSession] = useState<LiveSessionDTO | null>(null);

  // Bank & payout state
  const [selectedBank, setSelectedBank] = useState('BIAT');
  const [ribInput, setRibInput] = useState('08 024 0123456789012 34');

  // Teacher assets
  const profBooks = store.books.filter((b) => b.professorId === professorId);
  const profLedger = store.ledger.filter((l) => l.professorId === professorId);
  const [profVideos, setProfVideos] = useState<VideoContent[]>(
    store.videos.filter((v) => v.professorId === professorId)
  );
  const [profLives, setProfLives] = useState<LiveSession[]>([]);

  // Hydrate durable (Postgres) video records for this professor on mount.
  useEffect(() => {
    fetch(`/api/videos?professorId=${encodeURIComponent(professorId)}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data?.videos) setProfVideos(data.videos);
      })
      .catch(() => {});
  }, [professorId]);

  // Hydrate durable (Postgres) live sessions for this professor.
  const hydrateLives = useCallback(() => {
    fetch(`/api/lives/upcoming?professorId=${encodeURIComponent(professorId)}`, {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((data) => {
        if (data?.sessions) setProfLives(data.sessions);
      })
      .catch(() => {});
  }, [professorId]);

  useEffect(() => {
    hydrateLives();
  }, [hydrateLives]);

  const totalSalesMillimes = profLedger
    .filter((l) => l.type === 'SALE')
    .reduce((acc, l) => acc + l.amountMillimes, 0);

  const totalCommissionsMillimes = profLedger
    .filter((l) => l.type === 'PLATFORM_COMMISSION')
    .reduce((acc, l) => acc + l.amountMillimes, 0);

  const netEarningsMillimes = totalSalesMillimes - totalCommissionsMillimes;

  const handleConfirmPayout = (e: React.FormEvent) => {
    e.preventDefault();
    setPayoutModalOpen(false);
    setPayoutSuccessMessage(
      lang === 'ar'
        ? `تم تسجيل طلب التحويل البنكي (${selectedBank}) بمبلغ صافي ${(netEarningsMillimes / 1000).toFixed(3)} د.ت. تتم المعالجة في غضون 48 ساعة عمل.`
        : `Demande de virement (${selectedBank}) de ${(netEarningsMillimes / 1000).toFixed(3)} DT enregistrée. Traitement sous 48h ouvrées.`
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Studio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-blue-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
              {lang === 'ar' ? 'فضاء الأستاذ المؤلف والمدرب' : 'Studio Auteur & Enseignant'}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-200 flex items-center gap-1 shadow-xs">
              <Icons.CheckCircle className="w-3 h-3 text-blue-700" />
              {lang === 'ar' ? 'مدرّس معتمد وموثق' : 'Statut Vérifié'}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif tracking-tight mt-1">
            Prof. Hichem Ben Salem — Espace Édition & Diffusion
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Gérez vos manuels scolaires (PDF), vos vidéos pédagogiques (HLS) et vos séances interactives en direct (WebRTC).
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => setVideoModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition"
          >
            <span>📹</span>
            <span>Ajouter Vidéo</span>
          </button>

          <button
            onClick={() => setLiveModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition"
          >
            <span>🔴</span>
            <span>Programmer un Live</span>
          </button>

          <button
            onClick={() => setUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs transition"
          >
            <Icons.Upload className="w-3.5 h-3.5" />
            <span>Nouveau Manuscrit</span>
          </button>
        </div>
      </div>

      {payoutSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 flex items-center gap-2 shadow-xs animate-in fade-in duration-200">
          <Icons.CheckCircle className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>{payoutSuccessMessage}</span>
        </div>
      )}

      {/* Broadcast Studio View if a live is currently selected */}
      {studioSession && (
        <div className="p-6 bg-slate-900 rounded-3xl text-white space-y-4 border border-slate-800 shadow-2xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-base font-bold">Studio de Diffusion en Direct</h2>
            </div>
            <button
              onClick={() => setStudioSession(null)}
              className="text-xs px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Fermer le Studio ✕
            </button>
          </div>
          <TeacherBroadcastStudio
            session={studioSession}
            onStatusChange={(updated) => {
              setStudioSession(updated);
              hydrateLives();
            }}
          />
        </div>
      )}

      {/* Royalties Split & Financial Snapshot Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-xs space-y-2">
          <div className="text-xs text-slate-500 font-medium">Chiffre d&apos;Affaires Brut</div>
          <div className="text-2xl font-bold font-mono text-slate-950">
            {(totalSalesMillimes / 1000).toFixed(3)}{' '}
            <span className="text-xs font-sans text-blue-700 font-bold">DT</span>
          </div>
          <div className="text-[11px] text-slate-400">
            {profLedger.filter((l) => l.type === 'SALE').length} commandes validées
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-blue-100 shadow-xs space-y-2">
          <div className="text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Commission Plateforme (20%)</span>
            <span className="text-[10px] bg-blue-50 text-blue-800 font-bold px-1.5 py-0.5 rounded border border-blue-200">2000 bps</span>
          </div>
          <div className="text-2xl font-bold font-mono text-slate-600">
            -{(totalCommissionsMillimes / 1000).toFixed(3)}{' '}
            <span className="text-xs font-sans text-slate-500 font-bold">DT</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Hébergement haute sécurité & frais bancaires
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900 to-slate-900 text-white p-6 rounded-3xl shadow-sm space-y-3">
          <div className="text-xs text-blue-200 font-medium">
            Redevance Nette Disponible (80%)
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            {(netEarningsMillimes / 1000).toFixed(3)}{' '}
            <span className="text-xs font-sans text-blue-300 font-bold">DT</span>
          </div>
          <button
            onClick={() => setPayoutModalOpen(true)}
            className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs"
          >
            <Icons.CreditCard className="w-4 h-4" />
            <span>Demander le Virement</span>
          </button>
        </div>
      </div>

      {/* Main Studio Tabs Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6 text-xs font-bold">
          {([
            { id: 'MANUSCRIPTS', label: 'Manuels & Cours (PDF)', count: profBooks.length },
            { id: 'VIDEOS', label: 'Vidéos Pédagogiques (HLS)', count: profVideos.length },
            { id: 'LIVES', label: 'Séances en Direct (WebRTC)', count: profLives.length },
            { id: 'AI_QUEUE', label: 'Validation Corrections IA', count: pendingAiCount },
            { id: 'LEDGER', label: 'Grand Livre & Rémunérations (80%)', count: undefined as number | undefined },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-3 border-b-2 flex items-center gap-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* TAB 1: MANUSCRIPTS & BOOKS */}
      {activeTab === 'MANUSCRIPTS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-950 font-serif">
              Vos Manuels Publiés & En Ligne
            </h2>
            <button
              onClick={() => setUploadModalOpen(true)}
              className="text-xs font-bold text-blue-600 hover:underline"
            >
              + Déposer un manuscrit
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {profBooks.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-3xl border border-blue-100 p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-blue-300 transition"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-900 border border-blue-100">
                      {b.levelNameFr}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                      PUBLIÉ
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-slate-950 leading-snug">{b.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{b.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400">Prix élève :</div>
                    <div className="text-sm font-bold text-slate-950 font-mono">
                      {(b.priceMillimes / 1000).toFixed(3)} DT
                    </div>
                  </div>
                  <Link
                    href={`/catalogue/${b.slug}`}
                    className="px-3.5 py-1.5 rounded-xl border border-blue-200 text-blue-900 hover:bg-blue-50 text-xs font-semibold shadow-xs"
                  >
                    Fiche Publique
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: VIDEOS (PHASE 3) */}
      {activeTab === 'VIDEOS' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950 font-serif">
                Studio Vidéos Pédagogiques (VOD)
              </h2>
              <p className="text-xs text-slate-500">
                Vidéos encodées en HLS multi-qualités avec filigrane dynamique anti-piratage.
              </p>
            </div>
            <button
              onClick={() => setVideoModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs"
            >
              + Importer une Vidéo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {profVideos.map((vid) => (
              <div
                key={vid.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    {vid.isFreePreview ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Extrait Gratuit
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                        Inclus au Trimestre
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-400">
                      ⏱ {Math.floor(vid.durationSeconds / 60)} min
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-slate-900 line-clamp-1">{vid.title}</h4>
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">{vid.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded">
                    ✓ Transcodé 1080p HLS
                  </span>
                  <Link
                    href={`/student/videos/${vid.id}`}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                  >
                    ▶ Visionner
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: LIVES (PHASE 4) */}
      {activeTab === 'LIVES' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-slate-950 font-serif">
                Séances de Diffusion en Direct (Live WebRTC)
              </h2>
              <p className="text-xs text-slate-500">
                Animez vos cours en direct avec vos élèves, répondez à leurs questions et convertissez automatiquement le flux en replay VOD.
              </p>
            </div>
            <button
              onClick={() => setLiveModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs"
            >
              + Programmer une Séance
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {profLives.map((live) => (
              <div
                key={live.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4"
              >
                <div className="flex items-center justify-between">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${
                      live.status === 'LIVE'
                        ? 'bg-red-600 text-white animate-pulse'
                        : live.status === 'ENDED'
                        ? 'bg-slate-100 text-slate-600'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {live.status === 'LIVE' ? '🔴 EN DIRECT' : live.status === 'ENDED' ? 'Clôturé' : 'Programmé'}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-700">
                    {live.priceMillimes / 1000} DT / Billet
                  </span>
                </div>

                <div>
                  <h3 className="font-bold text-base text-slate-900">{live.title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{live.description}</p>
                </div>

                <div className="text-xs text-slate-500 flex items-center justify-between pt-3 border-t border-slate-100">
                  <span>📅 {new Date(live.scheduledAt).toLocaleString('fr-TN')}</span>
                  <span>⏱ {live.estimatedDurationMinutes} minutes</span>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    onClick={() => setStudioSession(live)}
                    className="flex-1 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition"
                  >
                    <span>🎙️ Ouvrir le Studio de Diffusion</span>
                  </button>
                  <Link
                    href={`/student/live/${live.id}`}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold"
                  >
                    Vue Élève
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: LEDGER */}
      {activeTab === 'LEDGER' && (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950 font-serif">
              Grand Livre & Rémunérations (80% Enseignant · 20% Plateforme)
            </h2>
            <p className="text-xs text-slate-500">
              Traçabilité financière immuable de chaque vente, commission et virement bancaire.
            </p>
          </div>
          <SalesLedgerTable
            entries={profLedger}
            totalSalesMillimes={totalSalesMillimes}
            totalCommissionsMillimes={totalCommissionsMillimes}
            netEarningsMillimes={netEarningsMillimes}
            onRequestPayout={() => setPayoutModalOpen(true)}
          />
        </div>
      )}

      {/* TAB 5: AI CORRECTIONS VALIDATION QUEUE */}
      {activeTab === 'AI_QUEUE' && (
        <TeacherAiApprovalQueue />
      )}

      {/* Modals */}
      <SecureUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        authorName="Prof. Hichem Ben Salem"
        books={profBooks.map((b) => ({ id: b.id, title: b.title }))}
        onUploadSuccess={() => setUploadModalOpen(false)}
      />

      <VideoUploadModal
        isOpen={videoModalOpen}
        onClose={() => setVideoModalOpen(false)}
        books={profBooks.map((b) => ({
          id: b.id,
          title: b.title,
          chapters: b.chapters.map((ch) => ({ id: ch.id, title: ch.title })),
        }))}
        onSuccess={(newVid) => {
          setProfVideos((prev) => [newVid, ...prev]);
        }}
        lang={lang}
      />

      <LiveSessionModal
        isOpen={liveModalOpen}
        onClose={() => setLiveModalOpen(false)}
        books={profBooks.map((b) => ({ id: b.id, title: b.title }))}
        onSuccess={(newLive) => {
          setProfLives((prev) => [newLive, ...prev]);
        }}
        lang={lang}
      />

      {/* Payout Withdrawal Modal */}
      {payoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-blue-100">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-950 font-serif">
                Demande de Virement Bancaire (RIB Tunisien)
              </h3>
              <button onClick={() => setPayoutModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-xl font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmPayout} className="space-y-4">
              <div className="bg-blue-50/70 p-4 rounded-2xl border border-blue-100 text-xs text-blue-950 space-y-1">
                <div className="font-semibold">Montant net transférable (80% des ventes) :</div>
                <div className="text-xl font-bold font-mono text-blue-900">
                  {(netEarningsMillimes / 1000).toFixed(3)} DT
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Établissement bancaire ou postal en Tunisie :
                </label>
                <select
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 focus:bg-white"
                >
                  {TUNISIAN_BANKS.map((bank) => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Relevé d&apos;Identité Bancaire (RIB 20 chiffres) :
                </label>
                <input
                  type="text"
                  required
                  value={ribInput}
                  onChange={(e) => setRibInput(e.target.value)}
                  className="w-full font-mono text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPayoutModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 rounded-xl shadow-xs"
                >
                  Confirmer le Virement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
