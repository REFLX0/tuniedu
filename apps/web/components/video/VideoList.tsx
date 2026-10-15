'use client';

// =============================================================================
// TuniEdu Video Lesson Playlist Component (Phase 3)
// Lists pedagogical lessons with chapter badges, duration, and entitlement locks
// =============================================================================

import React from 'react';
import { VideoContentDTO } from '@tuniedu/shared-types';

interface VideoListProps {
  videos: Array<VideoContentDTO & { isAccessible?: boolean; entitlementRequired?: boolean }>;
  activeVideoId?: string;
  onSelectVideo: (videoId: string) => void;
  lang?: 'fr' | 'ar';
}

export function VideoList({
  videos,
  activeVideoId,
  onSelectVideo,
  lang = 'fr',
}: VideoListProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs > 0 ? `${secs}s` : ''}`;
  };

  if (!videos || videos.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
          🎬
        </div>
        <p className="text-sm font-medium">
          {lang === 'ar' ? 'لا توجد دروس فيديو مسجلة لهذا المحور حالياً.' : 'Aucun cours vidéo disponible pour ce chapitre pour le moment.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {videos.map((vid, idx) => {
        const isActive = vid.id === activeVideoId;
        const isLocked = vid.entitlementRequired && !vid.isFreePreview;

        return (
          <div
            key={vid.id}
            onClick={() => onSelectVideo(vid.id)}
            className={`flex items-start gap-4 p-3.5 sm:p-4 rounded-xl border transition-all cursor-pointer ${
              isActive
                ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                : 'bg-white hover:bg-slate-50 border-slate-200/90 hover:border-slate-300'
            }`}
          >
            {/* Thumbnail / Play Badge */}
            <div className="relative shrink-0 w-24 h-16 sm:w-28 sm:h-18 rounded-lg bg-slate-900 overflow-hidden flex items-center justify-center border border-slate-700/50 shadow-xs">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-900/40 to-slate-900/60" />
              
              {isActive ? (
                <div className="relative z-10 flex items-center gap-1">
                  <span className="w-1 h-4 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1 h-5 bg-blue-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1 h-3 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              ) : isLocked ? (
                <span className="relative z-10 text-slate-400 text-lg">🔒</span>
              ) : (
                <div className="relative z-10 w-7 h-7 rounded-full bg-white/20 text-white flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </div>
              )}

              {/* Duration badge */}
              <span className="absolute bottom-1 right-1 px-1.5 py-0.5 bg-black/80 text-[10px] text-white font-mono rounded font-medium">
                {formatDuration(vid.durationSeconds)}
              </span>
            </div>

            {/* Video Meta */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Leçon #{idx + 1}
                </span>

                {vid.isFreePreview ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    {lang === 'ar' ? 'معاينة مجانية' : 'Extrait Gratuit'}
                  </span>
                ) : isLocked ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                    {lang === 'ar' ? 'خاص بالمشتركين' : 'Inclus au Trimestre'}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    {lang === 'ar' ? 'متاح بالكامل' : 'Débloqué'}
                  </span>
                )}
              </div>

              <h4 className="text-sm font-semibold text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors">
                {vid.title}
              </h4>
              {vid.titleAr && (
                <p className="text-xs text-slate-500 font-serif line-clamp-1 mt-0.5" dir="rtl">
                  {vid.titleAr}
                </p>
              )}
              {vid.description && (
                <p className="text-xs text-slate-500 line-clamp-2 mt-1 leading-relaxed">
                  {vid.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
