'use client';

// =============================================================================
// TuniEdu Student Video Catalogue & Classroom: /student/videos
// Lists all available HLS video explanations and chapters
// =============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { store, type VideoContent } from '@/lib/store';
import { Icons } from '@/components/ui/icons';

export default function StudentVideosListPage() {
  const router = useRouter();
  const { lang } = useLanguage();
  const [videos, setVideos] = useState<VideoContent[]>(store.videos);
  const [selectedSubject, setSelectedSubject] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Hydrate durable videos from Postgres API
  useEffect(() => {
    fetch('/api/videos', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.videos && data.videos.length > 0) {
          setVideos(data.videos);
        }
      })
      .catch(() => {});
  }, []);

  const filteredVideos = videos.filter((v) => {
    if (selectedSubject !== 'ALL') {
      const book = store.books.find((b) => b.id === v.bookId);
      if (book && book.subjectId !== selectedSubject) return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = v.title.toLowerCase().includes(q) || (v.titleAr?.toLowerCase().includes(q) ?? false);
      const matchProf = v.professorName.toLowerCase().includes(q);
      if (!matchTitle && !matchProf) return false;
    }
    return true;
  });

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '15 min';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs > 0 ? `${secs}s` : ''}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Eye-Comfort Top Banner */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl text-[11px] text-blue-950 shadow-xs">
        <div className="flex items-center gap-2 font-medium">
          <Icons.Eye className="w-4 h-4 text-blue-700 shrink-0" />
          <span>
            {lang === 'ar'
              ? 'مكتبة الفيديوهات التعليمية المعتمدة · شروح مصورة بدقة عالية وتدفق متكيف'
              : 'Vidéothèque Pédagogique Officielle · Streaming HLS adaptatif et chapitrage interactif'}
          </span>
        </div>
        <span className="text-[10px] font-semibold text-blue-700 bg-white px-2.5 py-0.5 rounded-lg border border-blue-200">
          {lang === 'ar' ? 'دروس مصورة' : 'Cours en Vidéo'}
        </span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-blue-100">
        <div>
          <div className="text-xs font-bold text-blue-700 uppercase tracking-wider">
            {lang === 'ar' ? 'فضاء المراجعة المرئية' : 'Classroom Vidéo'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-950 font-serif tracking-tight mt-1">
            {lang === 'ar' ? 'الدروس والشروح المصورة الرسمية' : 'Cours et Résolutions en Vidéo'}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {lang === 'ar'
              ? 'شروح مفصلة لدروس وتمارين المناهج التونسية مسجلة من طرف أساتذة ومفتشين معتمدين.'
              : 'Explications pas à pas, résolutions d\'exercices et astuces méthodologiques pour les concours nationaux.'}
          </p>
        </div>

        {/* Search */}
        <div className="w-full md:w-72">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={lang === 'ar' ? 'بحث عن فيديو أو درس...' : 'Rechercher une vidéo...'}
            className="w-full px-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-2xs"
          />
        </div>
      </div>

      {/* Subject Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {[
          { id: 'ALL', label: lang === 'ar' ? 'جميع المواد' : 'Toutes les matières' },
          { id: 'subj_math', label: lang === 'ar' ? 'الرياضيات' : 'Mathématiques' },
          { id: 'subj_phys', label: lang === 'ar' ? 'الفيزياء' : 'Physique' },
          { id: 'subj_ara', label: lang === 'ar' ? 'العربية' : 'Arabe' },
          { id: 'subj_fra', label: lang === 'ar' ? 'الفرنسية' : 'Français' },
          { id: 'subj_svt', label: lang === 'ar' ? 'علوم الحياة' : 'SVT' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedSubject(tab.id)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold shrink-0 transition ${
              selectedSubject === tab.id
                ? 'bg-blue-700 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Video Grid */}
      {filteredVideos.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 text-slate-500 space-y-3">
          <div className="text-4xl">🎬</div>
          <p className="text-sm font-semibold text-slate-700">
            {lang === 'ar' ? 'لا توجد دروس فيديو مطابقة لبحثكم' : 'Aucune vidéo trouvée pour ces critères'}
          </p>
          <p className="text-xs text-slate-400">
            {lang === 'ar' ? 'جرب تغيير المادة أو تفريغ خانة البحث.' : 'Essayez de modifier votre recherche ou filtre matière.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredVideos.map((vid) => {
            const book = store.books.find((b) => b.id === vid.bookId);
            return (
              <div
                key={vid.id}
                onClick={() => router.push(`/student/videos/${vid.id}`)}
                className="group cursor-pointer bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 transition duration-300 overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Thumbnail Cover with Duration Overlay */}
                  <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
                    <span className="text-4xl group-hover:scale-110 transition-transform">🎥</span>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    
                    {/* Duration badge */}
                    <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-[10px] font-mono font-bold text-white">
                      ⏱ {formatDuration(vid.durationSeconds)}
                    </div>

                    {/* Free Preview badge */}
                    {vid.isFreePreview && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-emerald-600 text-[10px] font-bold text-white uppercase tracking-wider">
                        {lang === 'ar' ? 'معاينة مجانية' : 'Aperçu gratuit'}
                      </div>
                    )}
                  </div>

                  {/* Body Info */}
                  <div className="p-4 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-blue-700 font-semibold">
                      <span>{book?.levelNameFr || '9ème Année de Base'}</span>
                      <span>{book?.subjectNameFr || 'Mathématiques'}</span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition line-clamp-2">
                      {lang === 'ar' && vid.titleAr ? vid.titleAr : vid.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {vid.description || 'Explications détaillées et résolutions commentées selon le programme tunisien.'}
                    </p>
                  </div>
                </div>

                {/* Footer with Instructor & Action */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-600 font-medium">
                    👨‍🏫 {vid.professorName}
                  </span>
                  <span className="text-blue-700 font-semibold group-hover:translate-x-1 transition-transform">
                    {lang === 'ar' ? 'مشاهدة ←' : 'Regarder →'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
