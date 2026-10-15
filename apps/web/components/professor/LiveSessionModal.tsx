'use client';

// =============================================================================
// TuniEdu Professor Live Session Scheduler Modal (Phase 4)
// Allows certified teachers to schedule interactive live broadcast sessions
// =============================================================================

import React, { useState } from 'react';
import type { LiveSession } from '@/lib/store';

interface LiveSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (session: LiveSession) => void;
  books: Array<{ id: string; title: string }>;
  lang?: 'fr' | 'ar';
}

export function LiveSessionModal({
  isOpen,
  onClose,
  onSuccess,
  books,
  lang = 'fr',
}: LiveSessionModalProps) {
  const [selectedBookId, setSelectedBookId] = useState(books[0]?.id || '');
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [scheduledDate, setScheduledDate] = useState('2026-10-25T18:00');
  const [durationMinutes, setDurationMinutes] = useState('90');
  const [ticketPriceDT, setTicketPriceDT] = useState('12');
  const [isFreeForTrimesters, setIsFreeForTrimesters] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim() || title.length < 5) {
      setErrorMessage('Le titre de la séance live doit comporter au moins 5 caractères.');
      return;
    }

    if (!selectedBookId) {
      setErrorMessage('Veuillez sélectionner le manuel concerné.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/lives/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBookId,
          title: title.trim(),
          titleAr: titleAr.trim() || undefined,
          description: description.trim(),
          scheduledAt: new Date(scheduledDate).toISOString(),
          estimatedDurationMinutes: parseInt(durationMinutes, 10),
          priceMillimes: Math.round(parseFloat(ticketPriceDT) * 1000),
          isFreeForTrimesterStudents: isFreeForTrimesters,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors de la programmation de la séance.');
        setIsSubmitting(false);
        return;
      }

      setIsSubmitting(false);
      onSuccess(data.liveSession);
      onClose();
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Erreur de connexion au serveur.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-7">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {lang === 'ar' ? 'برمجة حصة تفاعلية مباشرة' : 'Programmer une Séance en Direct'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Diffusion WebRTC ultra-basse latence avec chat modéré et replay automatique
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center text-lg font-bold"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
              {errorMessage}
            </div>
          )}

          {/* Book association */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Manuel scolaire concerné *
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>{b.title}</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Titre de la session live (Français) *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Révision intensive : Devoir de synthèse 1er Trimestre"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1 text-right">
              عنوان الحصة المباشرة بالعربية (اختياري)
            </label>
            <input
              type="text"
              dir="rtl"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال : مراجعة شاملة لاختبار الثلاثي الأول في الرياضيات"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500 font-serif"
            />
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Date et heure (Heure de Tunis UTC+1) *
              </label>
              <input
                type="datetime-local"
                required
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Durée estimée (minutes)
              </label>
              <input
                type="number"
                min="30"
                max="240"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Ticket pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Prix du billet individuel (DT)
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={ticketPriceDT}
                onChange={(e) => setTicketPriceDT(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="free-trimester"
                checked={isFreeForTrimesters}
                onChange={(e) => setIsFreeForTrimesters(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <label htmlFor="free-trimester" className="text-xs font-medium text-slate-700 cursor-pointer">
                Inclus gratuitement pour les élèves du trimestre
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Description & consignes pour les élèves
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Questions traitées, exercices à préparer à l'avance..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Enregistrement...</span>
                </>
              ) : (
                <span>Programmer la Séance</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
