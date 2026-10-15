'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AiCorrectionProposalDTO } from '@tuniedu/shared-types';

export function TeacherAiApprovalQueue() {
  const [proposals, setProposals] = useState<AiCorrectionProposalDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED'>('PENDING_REVIEW');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchProposals = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = filter === 'ALL' ? '/api/ai/proposals' : `/api/ai/proposals?status=${filter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (res.ok) {
        setProposals(data.proposals || []);
      }
    } catch (err) {
      console.error('Error fetching proposals:', err);
    } finally {
      setIsLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  const handleReview = async (proposalId: string, status: 'APPROVED' | 'EDITED' | 'REJECTED') => {
    try {
      const res = await fetch(`/api/ai/proposals/${proposalId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          notes: teacherNotes || undefined,
          editedSolution: status === 'EDITED' ? editedText : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setActionSuccessMessage(data.message || 'Action enregistrée');
      setTimeout(() => setActionSuccessMessage(null), 4000);
      setEditingId(null);
      setEditedText('');
      setTeacherNotes('');
      fetchProposals();
    } catch (err) {
      alert(`Erreur : ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl text-white">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">⚖️</span>
            <h2 className="text-xl font-bold tracking-tight">Validation Pédagogique des Corrections IA</h2>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Garantissez la conformité des méthodes de résolution avec le programme officiel du Ministère de l&apos;Éducation
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs font-semibold">
          <button
            onClick={() => setFilter('PENDING_REVIEW')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'PENDING_REVIEW' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            En Attente ({proposals.filter((p) => p.status === 'PENDING_REVIEW').length})
          </button>
          <button
            onClick={() => setFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'APPROVED' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Validées
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition ${
              filter === 'ALL' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Toutes
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccessMessage && (
        <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2 animate-in fade-in">
          <span>✅</span>
          <span>{actionSuccessMessage}</span>
        </div>
      )}

      {/* Proposals List */}
      <div className="mt-6 space-y-5">
        {isLoading ? (
          <div className="text-center py-12 text-slate-400">
            <div className="animate-spin text-3xl mb-2">⏳</div>
            Chargement des propositions de correction...
          </div>
        ) : proposals.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl text-slate-400">
            <span className="text-3xl block mb-2">🎉</span>
            Toutes les corrections sont validées ! Aucune intervention requise pour le moment.
          </div>
        ) : (
          proposals.map((prop) => (
            <div
              key={prop.id}
              className={`p-5 rounded-xl border transition-all ${
                prop.status === 'PENDING_REVIEW'
                  ? 'bg-slate-800/60 border-amber-500/40 shadow-lg shadow-amber-500/5'
                  : 'bg-slate-800/30 border-slate-800'
              }`}
            >
              {/* Top metadata */}
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/50 text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200">Élève : {prop.studentName}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-slate-400">{prop.bookTitle}</span>
                  <span className="text-slate-500">•</span>
                  <span className="text-emerald-400 font-medium">{prop.chapterTitle}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      prop.status === 'PENDING_REVIEW'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : prop.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-red-500/20 text-red-300 border border-red-500/40'
                    }`}
                  >
                    {prop.status === 'PENDING_REVIEW'
                      ? '⚠️ À Valider par l\'Enseignant'
                      : prop.status === 'APPROVED'
                      ? '✅ Approuvée'
                      : '❌ Rejetée'}
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(prop.createdAt).toLocaleDateString('fr-TN')}
                  </span>
                </div>
              </div>

              {/* Warning Flag if out of syllabus */}
              {prop.curriculumMethodWarning && (
                <div className="mt-3 p-3 bg-red-900/30 border border-red-500/40 rounded-lg text-xs text-red-200 flex items-start gap-2">
                  <span className="text-base">🚨</span>
                  <div>
                    <strong className="block font-bold text-red-300">Alerte Conformité Programme Officiel :</strong>
                    {prop.curriculumMethodWarning}
                  </div>
                </div>
              )}

              {/* Exercise prompt & Student Answer */}
              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold block mb-1">Énoncé de l&apos;exercice :</span>
                  <p className="text-slate-200 font-medium">{prop.exercisePrompt}</p>
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <span className="text-slate-400 font-semibold block mb-0.5">Réponse proposée par l&apos;élève :</span>
                    <p className="font-mono text-cyan-300 bg-slate-950 px-2 py-1 rounded inline-block">
                      {prop.studentAnswer}
                    </p>
                  </div>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 font-semibold block mb-1">
                    Explication proposée par l&apos;IA (Confiance: {Math.round(prop.aiConfidence * 100)}%) :
                  </span>
                  <p className="text-slate-300 whitespace-pre-line leading-relaxed">
                    {prop.teacherEditedSolution || prop.aiProposedSolution}
                  </p>
                </div>
              </div>

              {/* Teacher Decision Controls */}
              {prop.status === 'PENDING_REVIEW' && (
                <div className="mt-4 pt-3 border-t border-slate-700/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span>💡</span>
                    <span>Validez la démarche pour qu&apos;elle s&apos;affiche sur l&apos;espace de l&apos;élève.</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {editingId === prop.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleReview(prop.id, 'EDITED')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition"
                        >
                          Enregistrer & Approuver
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition"
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingId(prop.id);
                            setEditedText(prop.aiProposedSolution);
                          }}
                          className="bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1"
                        >
                          ✏️ Adapter la rédaction
                        </button>
                        <button
                          onClick={() => handleReview(prop.id, 'APPROVED')}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 shadow"
                        >
                          ✅ Approuver telle quelle
                        </button>
                        <button
                          onClick={() => handleReview(prop.id, 'REJECTED')}
                          className="bg-red-600/30 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/40 px-3 py-1.5 rounded-lg text-xs font-semibold transition"
                        >
                          ❌ Rejeter
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* In-place editor if teacher clicked "Adapter la rédaction" */}
              {editingId === prop.id && (
                <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">
                    Rédaction adaptée selon les exigences du Ministère :
                  </label>
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    rows={3}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    placeholder="Écrivez la solution selon les notations officielles tunisiennes..."
                  />
                  <input
                    type="text"
                    value={teacherNotes}
                    onChange={(e) => setTeacherNotes(e.target.value)}
                    placeholder="Remarque pour l'élève (optionnel)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
