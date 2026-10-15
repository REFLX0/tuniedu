'use client';

// =============================================================================
// TuniEdu Student Live Hub: /student/live
// Lists active live streams, scheduled sessions calendar, and VOD replays
// =============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '@/lib/language-context';
import type { LiveSession } from '@/lib/store';

export default function StudentLiveHubPage() {
  const { lang } = useLanguage();
  const [filter, setFilter] = useState<'ALL' | 'LIVE' | 'SCHEDULED' | 'REPLAY'>('ALL');
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load the durable live catalog (Postgres + seeded fallback) from the API.
  useEffect(() => {
    let cancelled = false;
    fetch('/api/lives/upcoming', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.sessions) setLiveSessions(data.sessions);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredSessions = liveSessions.filter((s) => {
    if (filter === 'LIVE') return s.status === 'LIVE';
    if (filter === 'SCHEDULED') return s.status === 'SCHEDULED';
    if (filter === 'REPLAY') return s.status === 'ENDED' || s.replayVideoId;
    return true;
  });

  const activeLive = liveSessions.find((s) => s.status === 'LIVE');

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Hub Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse" />
              <span className="text-xs font-bold text-red-600 uppercase tracking-wider">
                {lang === 'ar' ? 'البث المباشر التفاعلي' : 'Séances Interactives en Direct'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-serif">
              {lang === 'ar' ? 'فضاء الحصص المباشرة والمراجعات' : 'Le Direct Pédagogique National'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl">
              {lang === 'ar'
                ? 'حصص مباشرة تفاعلية يقدمها أفضل الأساتذة المعتمدين في تونس للإجابة عن أسئلتكم ومراجعة المحاور الأساسية'
                : 'Séances interactives animées par les professeurs agrégés et inspecteurs tunisiens avec chat en direct et tableau blanc'}
            </p>
          </div>

          <Link
            href="/student/library"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-xs transition-colors"
          >
            ← Ma Bibliothèque
          </Link>
        </div>

        {/* Hero Banner: If there is an ACTIVE LIVE */}
        {activeLive && (
          <div className="relative overflow-hidden rounded-3xl bg-radial from-blue-900 to-slate-950 text-white p-6 sm:p-9 shadow-2xl border border-blue-800/40">
            <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="space-y-3 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-red-600 text-white flex items-center gap-1.5 shadow-lg shadow-red-600/50">
                    <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                    <span>EN DIRECT MAINTENANT</span>
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-slate-200 border border-white/10">
                    👥 {activeLive.viewerCount} élèves connectés
                  </span>
                </div>

                <h2 className="text-xl sm:text-2xl font-bold">{activeLive.title}</h2>
                <p className="text-xs sm:text-sm text-blue-200 leading-relaxed">
                  {activeLive.description}
                </p>
                <p className="text-xs font-semibold text-emerald-400">
                  Animé par {activeLive.professorName} • {activeLive.bookTitle}
                </p>
              </div>

              <div className="shrink-0">
                <Link
                  href={`/student/live/${activeLive.id}`}
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-sm shadow-xl shadow-red-600/40 transition-all transform hover:scale-105"
                >
                  <span>Rejoindre la Séance</span>
                  <span>→</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Filter Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs font-bold">
          {[
            { id: 'ALL', label: 'Toutes les séances' },
            { id: 'LIVE', label: 'En direct maintenant' },
            { id: 'SCHEDULED', label: 'Séances programmées' },
            { id: 'REPLAY', label: 'Replays VOD disponibles' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id as 'ALL' | 'LIVE' | 'SCHEDULED' | 'REPLAY')}
              className={`px-4 py-2 rounded-xl transition-all shrink-0 ${
                filter === tab.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Live Sessions Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white rounded-2xl border border-slate-200/90 overflow-hidden animate-pulse"
              >
                <div className="h-44 bg-slate-100" />
                <div className="p-5 space-y-3">
                  <div className="h-3.5 bg-slate-100 rounded w-3/4" />
                  <div className="h-3 bg-slate-100 rounded w-full" />
                  <div className="h-3 bg-slate-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 py-16 px-6 text-center">
            <div className="text-4xl mb-3">📺</div>
            <h3 className="text-sm font-bold text-slate-800">
              {lang === 'ar' ? 'لا توجد حصص في هذا التصنيف' : 'Aucune séance dans cette catégorie'}
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              {lang === 'ar'
                ? 'جرّب تصنيفًا آخر أو عُد لاحقًا لاستكشاف الحصص القادمة.'
                : 'Essayez un autre filtre ou revenez plus tard pour découvrir les prochaines séances.'}
            </p>
          </div>
        ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSessions.map((session) => {
            const isSessionLive = session.status === 'LIVE';
            const isEnded = session.status === 'ENDED';

            return (
              <div
                key={session.id}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between"
              >
                <div>
                  {/* Card Cover */}
                  <div className="relative h-44 bg-slate-900 flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-radial from-blue-900/50 to-slate-950" />
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      {isSessionLive ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-600 text-white flex items-center gap-1 shadow-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>EN DIRECT</span>
                        </span>
                      ) : isEnded ? (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          Replay VOD
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-600 text-white">
                          Séance Programmée
                        </span>
                      )}
                    </div>

                    <div className="relative z-10 text-center px-4">
                      <div className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center mx-auto mb-2 text-xl backdrop-blur-xs">
                        {isSessionLive ? '🔴' : isEnded ? '▶' : '📅'}
                      </div>
                      <span className="text-xs font-semibold text-blue-200 line-clamp-1">
                        {session.bookTitle}
                      </span>
                    </div>

                    {/* Viewer Counter */}
                    <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-[10px] text-white font-mono">
                      ⏱ {session.estimatedDurationMinutes} min
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 space-y-3">
                    <h3 className="font-bold text-sm text-slate-900 line-clamp-2">
                      {session.title}
                    </h3>
                    {session.titleAr && (
                      <p className="text-xs text-blue-800 font-serif line-clamp-1" dir="rtl">
                        {session.titleAr}
                      </p>
                    )}
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {session.description}
                    </p>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-bold">
                        👨‍🏫
                      </span>
                      <span className="font-semibold text-slate-800 line-clamp-1">{session.professorName}</span>
                    </div>

                    <div className="text-[11px] text-slate-400">
                      📅 {new Date(session.scheduledAt).toLocaleString('fr-TN', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })} (Heure de Tunis)
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="p-5 pt-0">
                  {isSessionLive ? (
                    <Link
                      href={`/student/live/${session.id}`}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                    >
                      <span>Rejoindre le Direct</span>
                      <span>→</span>
                    </Link>
                  ) : isEnded ? (
                    session.replayVideoId ? (
                      <Link
                        href={`/student/videos/${session.replayVideoId}`}
                        className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-colors"
                      >
                        <span>▶ Visionner le Replay VOD</span>
                      </Link>
                    ) : (
                      <button disabled className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-400 font-semibold text-xs">
                        Replay en cours d&apos;encodage...
                      </button>
                    )
                  ) : (
                    <Link
                      href={`/student/live/${session.id}`}
                      className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors"
                    >
                      <span>Voir la Salle d’Attente</span>
                      <span>⏰</span>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
  );
}
