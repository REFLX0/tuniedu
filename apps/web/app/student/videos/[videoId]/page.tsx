'use client';

// =============================================================================
// TuniEdu Student Video Classroom: /student/videos/[videoId]
// Dedicated lesson view with SecureVideoPlayer, chapter playlist, and exercise links
// =============================================================================

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { store, type VideoContent } from '@/lib/store';
import { SecureVideoPlayer } from '@/components/video/SecureVideoPlayer';
import { VideoList } from '@/components/video/VideoList';
import { Icons } from '@/components/ui/icons';

interface LiveTokenData {
  success?: boolean;
  watermark?: {
    maskedEmail: string;
    sessionRef: string;
    timestamp: string;
  };
}

export default function StudentVideoPage() {
  const params = useParams();
  const router = useRouter();
  const { lang } = useLanguage();
  const videoId = params.videoId as string;

  const [video, setVideo] = useState<VideoContent | undefined>(store.getVideo(videoId));
  const [relatedVideos, setRelatedVideos] = useState<VideoContent[]>(
    () => store.getVideosForBook(store.getVideo(videoId)?.bookId || ''),
  );
  const [loaded, setLoaded] = useState(false);
  const [tokenData, setTokenData] = useState<LiveTokenData | null>(null);

  const book = store.books.find((b) => b.id === video?.bookId);

  // Hydrate the durable (Postgres) record, which the in-memory seed cannot know about.
  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    fetch(`/api/videos/${videoId}`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.video) {
          setVideo(data.video);
          return fetch(`/api/videos?bookId=${encodeURIComponent(data.video.bookId)}`, { credentials: 'include' })
            .then((res) => res.json())
            .then((rel) => {
              if (!cancelled && rel?.videos) setRelatedVideos(rel.videos);
            })
            .catch(() => {});
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [videoId]);

  // Fetch signed media token (SEC-19, SEC-20)
  useEffect(() => {
    if (!video) return;

    fetch(`/api/videos/${video.id}/token`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setTokenData(data);
        }
      })
      .catch(() => {});
  }, [video]);

  const handleSelectVideo = (selectedId: string) => {
    router.push(`/student/videos/${selectedId}`);
  };

  if (!video && !loaded) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-16 px-4 text-center">
        <span className="inline-block w-8 h-8 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] py-16 px-4 text-center">
        <h2 className="text-xl font-bold text-slate-900 mb-2">Vidéo introuvable</h2>
        <Link href="/student/library" className="text-blue-600 hover:underline text-sm font-semibold">
          ← Retourner à ma bibliothèque
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Link href="/student/library" className="hover:text-blue-600">
            {lang === 'ar' ? 'مكتبتي' : 'Ma Bibliothèque'}
          </Link>
          <span>/</span>
          {book && (
            <>
              <Link href={`/student/library/${book.id}`} className="hover:text-blue-600 line-clamp-1 max-w-xs">
                {book.title}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-slate-900 font-semibold line-clamp-1">{video.title}</span>
        </div>

        {/* Main Classroom Layout (Player Left, Playlist Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left 2 Cols: Secure Video Player & Lesson Notes */}
          <div className="lg:col-span-2 space-y-5">
            <SecureVideoPlayer
              videoId={video.id}
              title={video.title}
              titleAr={video.titleAr}
              durationSeconds={video.durationSeconds}
              watermarkData={tokenData?.watermark}
            />

            {/* Video Meta & Professor Info */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-slate-900">{video.title}</h1>
                  {video.titleAr && (
                    <p className="text-sm text-blue-800 font-serif mt-1" dir="rtl">{video.titleAr}</p>
                  )}
                </div>
                <div className="shrink-0">
                  {video.isFreePreview ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Extrait Gratuit
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                      Inclus au Trimestre
                    </span>
                  )}
                </div>
              </div>

              {/* Professor Card */}
              <div className="flex items-center gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                <div className="w-10 h-10 rounded-full bg-blue-900 text-white flex items-center justify-center font-bold text-sm">
                  👨‍🏫
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">{video.professorName}</h4>
                  <p className="text-[11px] text-slate-500">Auteur officiel certifié TuniEdu</p>
                </div>
              </div>

              {/* Description */}
              {video.description && (
                <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 leading-relaxed">
                  <h4 className="font-bold text-slate-800 mb-1">Résumé pédagogique :</h4>
                  <p>{video.description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Playlist of Chapter Lessons */}
          <div className="lg:col-span-1 space-y-4">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
                <div className="flex items-center gap-2">
                  <Icons.Book className="w-4 h-4 text-blue-600" />
                  <h3 className="font-bold text-sm text-slate-900">Leçons du Manuel</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">
                  {relatedVideos.length} vidéos
                </span>
              </div>

              <VideoList
                videos={relatedVideos}
                activeVideoId={video.id}
                onSelectVideo={handleSelectVideo}
                lang={lang}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
