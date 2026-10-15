'use client';

import React, { useState } from 'react';
import { Icons } from '@/components/ui/icons';
import { useLanguage } from '@/lib/language-context';

interface ManuscriptBookOption {
  id: string;
  title: string;
}

export interface ManuscriptUploadResult {
  bookId: string;
  storageKey: string;
  jobId: string | null;
  fileName: string;
}

interface SecureUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: (bookData: ManuscriptUploadResult) => void;
  books: ManuscriptBookOption[];
  authorName?: string;
}

const MAX_MANUSCRIPT_BYTES = 200 * 1024 * 1024; // 200 MB (matches API limit)

export function SecureUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  books,
}: SecureUploadModalProps) {
  const { lang } = useLanguage();
  const [step, setStep] = useState<'SELECT' | 'UPLOADING' | 'SUCCESS'>('SELECT');
  const [selectedBookId, setSelectedBookId] = useState(books[0]?.id || '');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [result, setResult] = useState<ManuscriptUploadResult | null>(null);

  if (!isOpen) return null;

  const reset = () => {
    setStep('SELECT');
    setSelectedFile(null);
    setProgress(0);
    setErrorMessage('');
    setResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMessage('');
    if (!file.name.toLowerCase().endsWith('.pdf') && file.type !== 'application/pdf') {
      setErrorMessage(
        lang === 'ar' ? 'يُقبل فقط ملفات PDF.' : 'Seuls les fichiers PDF sont acceptés.',
      );
      return;
    }
    if (file.size > MAX_MANUSCRIPT_BYTES) {
      setErrorMessage(lang === 'ar' ? 'الملف كبير جدًا (200 ميغا كحد أقصى).' : 'Fichier trop volumineux (max 200 Mo).');
      return;
    }
    setSelectedFile(file);
  };

  const uploadWithProgress = (
    file: File,
    bookId: string,
    onProgress: (pct: number) => void,
  ) =>
    new Promise<ManuscriptUploadResult>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/books/upload', true);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress((event.loaded / event.total) * 100);
      };
      xhr.onload = () => {
        let data: { error?: string; bookId?: string; storageKey?: string; jobId?: string | null } = {};
        try {
          data = JSON.parse(xhr.responseText);
        } catch {
          data = {};
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({
            bookId: data.bookId || bookId,
            storageKey: data.storageKey || '',
            jobId: data.jobId ?? null,
            fileName: file.name,
          });
        } else {
          reject(new Error(data.error || `Téléversement refusé (HTTP ${xhr.status}).`));
        }
      };
      xhr.onerror = () => reject(new Error('Échec réseau pendant le téléversement.'));
      const form = new FormData();
      form.append('file', file);
      form.append('bookId', bookId);
      form.append('versionNumber', '1');
      xhr.send(form);
    });

  const handleStartProcessing = async () => {
    setErrorMessage('');
    if (!selectedBookId) {
      setErrorMessage(lang === 'ar' ? 'يرجى اختيار الكتاب المدرسي.' : 'Veuillez sélectionner le manuel associé.');
      return;
    }
    if (!selectedFile) {
      setErrorMessage(lang === 'ar' ? 'يرجى اختيار ملف PDF.' : 'Veuillez sélectionner un fichier PDF.');
      return;
    }

    setStep('UPLOADING');
    setProgress(0);
    try {
      const res = await uploadWithProgress(selectedFile, selectedBookId, (pct) =>
        setProgress(Math.round(pct)),
      );
      setResult(res);
      setProgress(100);
      setStep('SUCCESS');
    } catch (err) {
      setStep('SELECT');
      setErrorMessage(err instanceof Error ? err.message : 'Erreur de connexion au serveur.');
    }
  };

  const handleFinish = () => {
    if (result) onUploadSuccess(result);
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full border border-blue-100 shadow-2xl p-6 sm:p-8 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <Icons.Upload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {lang === 'ar' ? 'معالجة وتشفير المخطوط البيداغوجي (PDF)' : 'Pipeline Sécurisé de Traitement PDF'}
              </h3>
              <p className="text-[11px] text-slate-500">
                {lang === 'ar' ? 'فحص البصمة الثنائية (%PDF-) وعزل الصفحات' : 'Inspection binaire (%PDF-) & isolation sandbox'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
            <Icons.X className="w-5 h-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
            {errorMessage}
          </div>
        )}

        {step === 'SELECT' && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                {lang === 'ar' ? 'الكتاب المدرسي المرتبط :' : 'Manuel associé :'}
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

            <div className="border-2 border-dashed border-blue-200 rounded-2xl p-8 text-center space-y-3 hover:border-blue-400 transition bg-blue-50/20">
              <input
                type="file"
                id="manuscript-file-input"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <label htmlFor="manuscript-file-input" className="cursor-pointer block">
                <Icons.FileText className="w-12 h-12 text-blue-600 mx-auto" />
                <div className="font-bold text-sm text-slate-800 mt-2">
                  {selectedFile
                    ? selectedFile.name
                    : (lang === 'ar' ? 'انقر لاختيار المخطوط البيداغوجي' : 'Déposez votre manuscrit pédagogique')}
                </div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {selectedFile
                    ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} Mo`
                    : (lang === 'ar' ? 'نسق PDF حصرياً · حجم أقصى 200 ميغابايت' : 'Format vectoriel PDF · Max 200 Mo')}
                </div>
              </label>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl text-xs text-slate-600 space-y-1.5 border border-slate-200/60">
              <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                <Icons.Shield className="w-4 h-4 text-blue-700" />
                <span>{lang === 'ar' ? 'ضمان الأمان والملكية الفكرية (SEC-14)' : 'Garantie de Protection & Non-Divulgation (SEC-14)'}</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed">
                {lang === 'ar'
                  ? 'لا يتاح الملف الأصلي للمتصفحات. تُقسَّم الصفحات في بيئة معزولة، وتُختم ببصمة مائية ديناميكية مشفرة باسم التلميذ ورقم المعاملة.'
                  : 'Le PDF brut original n\'est jamais exposé au client. Chaque planche est convertie en vecteur isolé avec filigrane nominatif dynamique.'}
              </p>
            </div>

            <button
              onClick={handleStartProcessing}
              disabled={!selectedFile}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:bg-blue-300 text-white font-semibold text-xs transition shadow-xs"
            >
              {lang === 'ar' ? 'بدء الفحص والتشفير الآمن' : 'Lancer l\'Inspection & le Traitement Sécurisé'}
            </button>
          </div>
        )}

        {step === 'UPLOADING' && (
          <div className="py-8 space-y-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-700 border border-blue-200 flex items-center justify-center mx-auto animate-pulse">
              <Icons.Shield className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-sm text-slate-900">
                {lang === 'ar' ? 'جاري رفع المخطوط معالجةً وتشفيرًا...' : 'Téléversement sécurisé du manuscrit...'}
              </h4>
              <p className="text-xs text-slate-500">
                {lang === 'ar' ? 'معالجة سحابية آمنة في خوادم TuniEdu' : 'Traitement en sandbox cryptographique étanche'}
              </p>
            </div>

            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-blue-700">{progress}%</span>
          </div>
        )}

        {step === 'SUCCESS' && result && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
              <Icons.CheckCircle className="w-10 h-10 text-emerald-600 mx-auto" />
              <div className="font-bold text-sm text-emerald-950">
                {lang === 'ar' ? 'تم استلام المخطوط وإدخاله مسار المعالجة !' : 'Manuscrit Reçu & Envoyé au Pipeline !'}
              </div>
              <p className="text-xs text-emerald-800">
                {lang === 'ar'
                  ? 'يجري استخراج الصفحات وتحويلها إلى ألواح مشفرة. ستتمكن من معاينتها بعد لحظات.'
                  : 'Extraction des pages et conversion en planches sécurisées en cours. Disponibles dans quelques instants.'}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl space-y-1.5 text-xs border border-slate-200/60 font-mono">
              <div className="text-slate-500 text-[10px] uppercase font-bold">
                {lang === 'ar' ? 'مرجع المعالجة :' : 'Référence de traitement :'}
              </div>
              <div className="text-[11px] text-slate-800 break-all">{result.storageKey}</div>
              {result.jobId && (
                <div className="text-[11px] text-slate-800">Job #{result.jobId}</div>
              )}
            </div>

            <button
              onClick={handleFinish}
              className="w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs transition shadow-xs"
            >
              {lang === 'ar' ? 'حفظ وإرسال للمراجعة والاعتماد' : 'Finaliser & Soumettre à l\'Administration'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
