'use client';

// =============================================================================
// TuniEdu Interactive Live Classroom: /student/live/[liveId]
// Live video player with DRM watermark on the left & moderated live chat on the right
// =============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import type { LiveSession } from '@/lib/store';
import { useSession } from '@/components/providers/SessionProvider';
import { StudentLivePlayer } from '@/components/live/StudentLivePlayer';
import { LiveChatBox } from '@/components/live/LiveChatBox';

interface LiveTokenData {
  success?: boolean;
  watermark?: {
    maskedEmail: string;
    sessionRef: string;
    timestamp: string;
  };
}

export default function StudentLiveRoomPage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  const liveId = params.liveId as string;

  const [session, setSession] = useState<LiveSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tokenData, setTokenData] = useState<LiveTokenData | null>(null);
  const { user: currentUser } = useSession();

  // Load the durable live session from the API (Postgres + seeded fallback).
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    fetch(`/api/lives/${liveId}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setSession(data?.session ?? null);
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [liveId]);

  // Fetch live participant token (SEC-19, SEC-20)
  useEffect(() => {
    if (!session) return;

    fetch(`/api/lives/${session.id}/token`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTokenData(data);
        }
      })
      .catch(() => {});
  }, [session]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-500">
          <span className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm font-semibold">Chargement de la séance...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Séance live introuvable</h2>
        <Link href="/student/live" className="text-blue-600 hover:underline text-sm font-semibold">
          ← Retourner au hub des directs
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <Link href="/student/live" className="hover:text-blue-600 font-semibold">
              ← Direct Pédagogique
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-bold line-clamp-1">{session.title}</span>
          </div>

          <div className="flex items-center gap-2">
            {session.status === 'LIVE' ? (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
                <span>En Direct</span>
              </span>
            ) : (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Salle d&apos;attente
              </span>
            )}
          </div>
        </div>

        {/* 2-Column Live Room Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Player & Session Details */}
          <div className="lg:col-span-2 space-y-5">
            <StudentLivePlayer
              liveId={session.id}
              title={session.title}
              titleAr={session.titleAr}
              professorName={session.professorName}
              status={session.status}
              scheduledAt={session.scheduledAt}
              viewerCount={session.viewerCount}
              watermarkData={tokenData?.watermark}
              replayVideoId={session.replayVideoId}
              onOpenReplay={(replayId) => router.push(`/student/videos/${replayId}`)}
            />

            {/* Session Info Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900">{session.title}</h1>
                {session.titleAr && (
                  <p className="text-sm text-blue-800 font-serif mt-1" dir="rtl">{session.titleAr}</p>
                )}
                <p className="text-xs text-slate-500 mt-2 leading-relaxed">{session.description}</p>
              </div>

              {/* Professor Profile Bar */}
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
                  👨‍🏫
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{session.professorName}</h4>
                  <p className="text-[11px] text-slate-500">Enseignant officiel • {session.bookTitle}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right 1 Col: Live Interactive Chat */}
          <div className="lg:col-span-1">
            <LiveChatBox
              liveId={session.id}
              currentUserId={currentUser?.id ?? ''}
              pinnedMessage={session.pinnedMessage ?? undefined}
              className="h-full min-h-[580px]"
              lang={lang}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
