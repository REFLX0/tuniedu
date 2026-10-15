'use client';

// =============================================================================
// TuniEdu Professor Video Upload Modal (Phase 3)
// Allows certified teachers to upload pedagogical video lessons linked to their books
// =============================================================================

import React, { useState } from 'react';
import type { VideoContent } from '@/lib/store';

interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (video: VideoContent) => void;
  books: Array<{ id: string; title: string; chapters: Array<{ id: string; title: string }> }>;
  lang?: 'fr' | 'ar';
}

export function VideoUploadModal({
  isOpen,
  onClose,
  onSuccess,
  books,
  lang = 'fr',
}: VideoUploadModalProps) {
  const [selectedBookId, setSelectedBookId] = useState(books[0]?.id || '');
  const [selectedChapterId, setSelectedChapterId] = useState('');
  const [title, setTitle] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('15');
  const [isFreePreview, setIsFreePreview] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  const currentBook = books.find((b) => b.id === selectedBookId) || books[0];
  const chapters = currentBook?.chapters || [];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
    }
  };

  // Uploads raw bytes straight to object storage via the presigned PUT URL,
  // reporting real progress through XHR upload events.
  const uploadWithProgress = (url: string, file: File, onProgress: (pct: number) => void) =>
    new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', 'video/mp4');
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`Téléversement refusé (HTTP ${xhr.status}).`));
      };
      xhr.onerror = () => reject(new Error('Échec réseau pendant le téléversement.'));
      xhr.send(file);
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!title.trim()) {
      setErrorMessage(lang === 'ar' ? 'عنوان الدرس إجباري' : 'Le titre de la vidéo est obligatoire.');
      return;
    }

    if (!selectedBookId) {
      setErrorMessage(lang === 'ar' ? 'يرجى اختيار الكتاب المدرسي' : 'Veuillez sélectionner le manuel associé.');
      return;
    }

    if (!selectedFile) {
      setErrorMessage(lang === 'ar' ? 'يرجى اختيار ملف الفيديو' : 'Veuillez sélectionner le fichier vidéo source.');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Create the durable record + obtain a presigned upload URL.
      const res = await fetch('/api/videos/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBookId,
          chapterId: selectedChapterId || undefined,
          title: title.trim(),
          titleAr: titleAr.trim() || undefined,
          description: description.trim(),
          durationSeconds: parseInt(durationMinutes, 10) * 60,
          isFreePreview,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.error || 'Erreur lors de l’envoi de la vidéo.');
        setIsUploading(false);
        return;
      }

      // 2. Stream the file bytes directly to object storage (0–80%).
      if (data.uploadUrl && data.storageKey) {
        await uploadWithProgress(data.uploadUrl, selectedFile, (pct) =>
          setUploadProgress(Math.round(pct * 0.8))
        );
      } else {
        setUploadProgress(70);
      }

      // 3. Confirm the upload and enqueue the HLS transcode (80–100%).
      setUploadProgress(85);
      const completeRes = await fetch(`/api/videos/${data.video.id}/complete`, { method: 'POST' });
      const completeData = await completeRes.json();
      if (!completeRes.ok) {
        setErrorMessage(completeData.error || 'Erreur lors du lancement du transcodage.');
        setIsUploading(false);
        return;
      }

      setUploadProgress(100);

      setTimeout(() => {
        setIsUploading(false);
        onSuccess(completeData.video || data.video);
        onClose();
      }, 500);
    } catch (err) {
      setIsUploading(false);
      setErrorMessage(err instanceof Error ? err.message : 'Erreur de connexion au serveur.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-7">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {lang === 'ar' ? 'إضافة درس فيديو تعليمي جديد' : 'Publier une Nouvelle Vidéo Pédagogique'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {lang === 'ar' ? 'معالجة آلية متعددة الجودات (1080p, 720p, 480p) وحماية DRM' : 'Transcodage multi-qualité HLS et filigrane dynamique automatique'}
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

          {/* Book & Chapter selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {lang === 'ar' ? 'الكتاب المدرسي :' : 'Manuel associé :'}
              </label>
              <select
                value={selectedBookId}
                onChange={(e) => {
                  setSelectedBookId(e.target.value);
                  setSelectedChapterId('');
                }}
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>{b.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {lang === 'ar' ? 'المحور / الفصل :' : 'Chapitre (optionnel) :'}
              </label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Général / Tout le manuel</option>
                {chapters.map((ch) => (
                  <option key={ch.id} value={ch.id}>{ch.title}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Titles (FR & AR) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Titre de la leçon (Français) *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="ex: Théorème de Thalès : Calculs et configurations papillon"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1 text-right">
              عنوان الدرس بالعربية (اختياري)
            </label>
            <input
              type="text"
              dir="rtl"
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال : مبرهنة طاليس : الحالات التطبيقية وحساب الأطوال"
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500 font-serif"
            />
          </div>

          {/* Duration & Free preview toggle */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Durée estimée (minutes)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-3 pt-5">
              <input
                type="checkbox"
                id="free-preview"
                checked={isFreePreview}
                onChange={(e) => setIsFreePreview(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
              />
              <label htmlFor="free-preview" className="text-xs font-medium text-slate-700 cursor-pointer">
                Extrait Gratuit (accessible sans abonnement)
              </label>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Description pédagogique & objectifs
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Notions abordées, prérequis, méthode de travail recommandée..."
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Video File Dropzone */}
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Fichier Vidéo Source (MP4, MOV, WebM - jusqu&apos;à 2 Go)
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-5 text-center transition-colors bg-slate-50/50">
              <input
                type="file"
                id="video-file-input"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="video-file-input" className="cursor-pointer block">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto mb-2 text-lg">
                  📹
                </div>
                {selectedFile ? (
                  <p className="text-xs font-semibold text-blue-700">
                    Fichier sélectionné : {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)} Mo)
                  </p>
                ) : (
                  <>
                    <p className="text-xs font-semibold text-slate-800">
                      Cliquez pour importer votre fichier vidéo
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Encodage HLS automatique en 1080p, 720p, 480p et 360p
                    </p>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Upload Progress Bar */}
          {isUploading && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-[11px] font-semibold text-slate-600">
                <span>Upload & Chiffrement HLS en cours...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isUploading}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isUploading}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {isUploading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Traitement...</span>
                </>
              ) : (
                <span>Lancer le transcodage & Publier</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
