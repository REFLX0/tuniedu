'use client';

// =============================================================================
// TuniEdu Student Live Stream Player Component (Phase 4)
// Ultra-low latency WebRTC/HLS live player with anti-leak floating DRM watermark
// Protected by AntiScreenshot (SEC-15) and AntiCopy (SEC-16)
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { AntiScreenshot } from '@/components/security/anti-screenshot';
import { LiveStatus } from '@tuniedu/shared-types';

interface StudentLivePlayerProps {
  liveId: string;
  title: string;
  titleAr?: string | null;
  professorName: string;
  status: LiveStatus;
  scheduledAt: string;
  viewerCount?: number;
  watermarkData?: {
    maskedEmail: string;
    sessionRef: string;
    timestamp: string;
  };
  onOpenReplay?: (replayId: string) => void;
  replayVideoId?: string | null;
}

const FALLBACK_STREAM =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';

type LiveConnection = 'idle' | 'checking' | 'connected' | 'fallback' | 'error' | 'disconnected';

interface LiveTokenResponse {
  token: string;
  tokenType: 'LIVEKIT' | 'MEDIA_FALLBACK';
  livekitUrl: string | null;
  participantRole: 'BROADCASTER' | 'VIEWER';
  watermark?: { maskedEmail: string; sessionRef: string; timestamp: string };
}

export function StudentLivePlayer({
  liveId,
  title,
  titleAr,
  professorName,
  status,
  scheduledAt,
  viewerCount,
  watermarkData,
  onOpenReplay,
  replayVideoId,
}: StudentLivePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [, setIsFullscreen] = useState(false);
  const [countdown, setCountdown] = useState('');
  const [watermark, setWatermark] = useState(
    watermarkData ?? { maskedEmail: 'el***@tuniedu.tn', sessionRef: 'TND-LIVE-2026', timestamp: '' },
  );
  const [connection, setConnection] = useState<LiveConnection>('idle');
  const [liveViewers, setLiveViewers] = useState<number | null>(null);

  // Real viewer count: SFU participant count when connected, otherwise the
  // persisted session count; hidden entirely when neither is known.
  const effectiveViewers = liveViewers ?? viewerCount ?? null;

  // Floating Watermark position coordinates (moves randomly every 10s)
  const [watermarkPos, setWatermarkPos] = useState({ top: '20%', left: '30%' });

  useEffect(() => {
    const interval = setInterval(() => {
      const top = Math.floor(Math.random() * 65 + 15) + '%';
      const left = Math.floor(Math.random() * 60 + 15) + '%';
      setWatermarkPos({ top, left });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const wmEmail = watermarkData?.maskedEmail;
  const wmSessionRef = watermarkData?.sessionRef;
  useEffect(() => {
    if (wmEmail) {
      setWatermark({
        maskedEmail: wmEmail,
        sessionRef: wmSessionRef ?? 'TND-LIVE-2026',
        timestamp: watermarkData?.timestamp ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wmEmail, wmSessionRef]);

  // Join the LiveKit SFU room when the session is LIVE (falls back to the local
  // demo stream when no SFU is configured).
  useEffect(() => {
    if (status !== 'LIVE' || !liveId) return;

    let cancelled = false;
    let room: import('livekit-client').Room | null = null;
    let audioEl: HTMLAudioElement | null = null;

    setConnection('checking');

    (async () => {
      try {
        const res = await fetch(`/api/lives/${liveId}/token`, { credentials: 'include' });
        if (!res.ok) {
          if (!cancelled) setConnection('error');
          return;
        }
        const data = (await res.json()) as LiveTokenResponse;
        if (cancelled) return;
        if (data.watermark) setWatermark(data.watermark);

        if (data.tokenType !== 'LIVEKIT' || !data.livekitUrl) {
          setConnection('fallback');
          return;
        }

        const { Room, RoomEvent } = await import('livekit-client');
        const r = new Room({ adaptiveStream: true, dynacast: true });
        room = r;

        r.on(RoomEvent.TrackSubscribed, (track) => {
          if (track.kind === 'video' && videoRef.current) {
            track.attach(videoRef.current);
          } else if (track.kind === 'audio') {
            if (!audioEl) {
              audioEl = document.createElement('audio');
              audioEl.autoplay = true;
              document.body.appendChild(audioEl);
            }
            track.attach(audioEl);
          }
        });
        r.on(RoomEvent.Disconnected, () => {
          if (!cancelled) setConnection('disconnected');
        });

        const syncViewers = () => {
          if (!cancelled) setLiveViewers(room ? room.numParticipants : null);
        };
        r.on(RoomEvent.ParticipantConnected, syncViewers);
        r.on(RoomEvent.ParticipantDisconnected, syncViewers);
        r.on(RoomEvent.ConnectionStateChanged, syncViewers);

        await r.connect(data.livekitUrl, data.token);
        if (cancelled) {
          await r.disconnect();
          return;
        }
        syncViewers();
        setConnection('connected');
      } catch {
        if (!cancelled) setConnection('error');
      }
    })();

    return () => {
      cancelled = true;
      if (audioEl) {
        audioEl.remove();
        audioEl = null;
      }
      if (room) room.disconnect();
      fetch(`/api/lives/${liveId}/leave`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      }).catch(() => {});
    };
  }, [status, liveId]);

  // Countdown timer for SCHEDULED sessions
  useEffect(() => {
    if (status !== 'SCHEDULED') return;

    const updateCountdown = () => {
      const diff = new Date(scheduledAt).getTime() - Date.now();
      if (diff <= 0) {
        setCountdown('Le direct va commencer d’un instant à l’autre...');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${hours > 0 ? `${hours}h ` : ''}${mins}m ${secs}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [status, scheduledAt]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <AntiScreenshot blurOnUnfocus={true}>
      <div
        ref={containerRef}
        className="relative bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 select-none"
        style={{ aspectRatio: '16/9' }}
      >
        {status === 'LIVE' ? (
          <>
            {/* Live WebRTC Video Track (LiveKit) or local demo fallback */}
            <video
              ref={videoRef}
              src={connection === 'fallback' ? FALLBACK_STREAM : undefined}
              autoPlay
              muted={isMuted}
              playsInline
              loop={connection === 'fallback'}
              className="w-full h-full object-cover"
            />

            {/* Connection overlays */}
            {connection === 'checking' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/80 z-20 text-white">
                <span className="w-8 h-8 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />
                <p className="text-xs font-semibold">Connexion au direct sécurisé…</p>
              </div>
            )}
            {connection === 'error' && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 z-20 text-center px-6">
                <span className="text-3xl">🔒</span>
                <p className="text-sm font-semibold text-white">Impossible de rejoindre le direct</p>
                <p className="text-xs text-slate-400">Vérifiez votre accès ou rechargez la page.</p>
              </div>
            )}

            {/* Dynamic Anti-Leak Floating Watermark (SEC-20) */}
            <div
              className="absolute pointer-events-none transition-all duration-1000 ease-in-out z-20 flex flex-col items-center opacity-30"
              style={{ top: watermarkPos.top, left: watermarkPos.left }}
            >
              <div className="bg-black/60 backdrop-blur-xs px-3 py-1 rounded-md border border-white/10 text-white font-mono text-[10px] tracking-wider font-semibold shadow-md">
                <span>{watermark.maskedEmail}</span>
                <span className="mx-1 text-red-400">•</span>
                <span>{watermark.sessionRef}</span>
              </div>
            </div>

            {/* Top Live Status Bar */}
            <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-30 flex items-center justify-between text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-600 text-white text-[11px] font-bold shadow-lg shadow-red-600/30">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>EN DIRECT</span>
                </div>

                {effectiveViewers !== null && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-xs text-[11px] font-semibold text-slate-200 border border-white/10">
                    <svg className="w-3.5 h-3.5 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                  </svg>
                  <span>{effectiveViewers} élèves</span>
                </div>
                )}


                <div
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                    connection === 'connected'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-slate-500/20 text-slate-300 border-slate-400/20'
                  }`}
                >
                  <span>
                    {connection === 'connected'
                      ? 'SFU LiveKit'
                      : connection === 'fallback'
                        ? 'Mode démo'
                        : connection === 'checking'
                          ? 'Connexion…'
                          : 'Hors ligne'}
                  </span>
                </div>
              </div>

              {/* Sound & Fullscreen controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="w-8 h-8 rounded-lg bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/10"
                >
                  {isMuted ? '🔇' : '🔊'}
                </button>
                <button
                  onClick={toggleFullscreen}
                  className="w-8 h-8 rounded-lg bg-black/50 hover:bg-black/80 text-white flex items-center justify-center border border-white/10"
                >
                  ⛶
                </button>
              </div>
            </div>

            {/* Bottom Title Bar */}
            <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent z-30 text-white">
              <h3 className="font-bold text-sm sm:text-base">{title}</h3>
              <p className="text-xs text-blue-300">Présenté par {professorName}</p>
            </div>
          </>
        ) : status === 'SCHEDULED' ? (
          /* Scheduled State with Countdown */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-radial from-slate-900 to-slate-950">
            <div className="w-16 h-16 rounded-2xl bg-blue-600/20 text-blue-400 border border-blue-500/30 flex items-center justify-center text-2xl mb-4 shadow-xl">
              ⏰
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30 mb-3">
              Séance Programmée
            </span>
            <h3 className="text-lg sm:text-xl font-bold max-w-lg mb-2">{title}</h3>
            {titleAr && <p className="text-sm text-blue-200 font-serif mb-4" dir="rtl">{titleAr}</p>}
            <p className="text-xs text-slate-400 mb-6">Avec {professorName}</p>

            <div className="bg-slate-900/90 border border-slate-800 px-6 py-3 rounded-2xl shadow-xl">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Début du direct dans
              </p>
              <p className="text-xl sm:text-2xl font-mono font-bold text-white tracking-widest text-emerald-400">
                {countdown}
              </p>
            </div>
          </div>
        ) : (
          /* Ended / Replay State */
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-slate-900">
            <div className="w-16 h-16 rounded-2xl bg-slate-800 text-slate-400 border border-slate-700 flex items-center justify-center text-2xl mb-3">
              🏁
            </div>
            <h3 className="text-lg font-bold mb-1">Séance en direct terminée</h3>
            <p className="text-xs text-slate-400 max-w-md mb-6">
              L&apos;enregistrement intégral de ce live est en cours de traitement et a été converti en replay VOD interactif.
            </p>
            {replayVideoId && (
              <button
                onClick={() => onOpenReplay && onOpenReplay(replayVideoId)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-lg flex items-center gap-2 transition-all transform hover:scale-105"
              >
                <span>▶ Visionner le Replay VOD</span>
              </button>
            )}
          </div>
        )}
      </div>
    </AntiScreenshot>
  );
}
