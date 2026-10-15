'use client';

// =============================================================================
// TuniEdu Secure Video Player Component (Phase 3)
// Dynamic adaptive bitrate HLS player · Floating anti-leak watermark (SEC-19, SEC-20)
// Protected by AntiScreenshot (SEC-15) and AntiCopy (SEC-16)
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { AntiScreenshot } from '@/components/security/anti-screenshot';

interface SecureVideoPlayerProps {
  videoId: string;
  title: string;
  titleAr?: string | null;
  videoSrc?: string;
  watermarkData?: {
    maskedEmail: string;
    sessionRef: string;
    timestamp: string;
  };
  durationSeconds?: number;
  onEnded?: () => void;
  className?: string;
}

interface HlsLike {
  destroy(): void;
  loadSource(url: string): void;
  attachMedia(media: HTMLMediaElement): void;
  currentLevel: number;
  levels: { height: number }[];
}

interface VideoStreamToken {
  manifestUrl: string;
  watermark?: { maskedEmail: string; sessionRef: string; timestamp: string };
}

const DEFAULT_WATERMARK = {
  maskedEmail: 'el***@tuniedu.tn',
  sessionRef: 'TND-2026',
  timestamp: '',
};

export function SecureVideoPlayer({
  videoId,
  title,
  titleAr,
  videoSrc,
  watermarkData,
  durationSeconds = 840,
  onEnded,
  className = '',
}: SecureVideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<HlsLike | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationSeconds);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [quality, setQuality] = useState('1080p');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [watermark, setWatermark] = useState(watermarkData ?? DEFAULT_WATERMARK);
  const [streamMode, setStreamMode] = useState<'idle' | 'hls' | 'native' | 'direct'>(
    videoSrc ? 'direct' : 'idle',
  );
  const [streamError, setStreamError] = useState<string | null>(null);

  // Keep the displayed watermark in sync with the entitlement-derived token.
  // Depend on the primitive fields (not the object) so a fresh object identity
  // from the parent cannot retrigger this effect on every render.
  const wmEmail = watermarkData?.maskedEmail;
  const wmSessionRef = watermarkData?.sessionRef;
  useEffect(() => {
    if (wmEmail) {
      setWatermark({
        maskedEmail: wmEmail,
        sessionRef: wmSessionRef ?? DEFAULT_WATERMARK.sessionRef,
        timestamp: watermarkData?.timestamp ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wmEmail, wmSessionRef]);

  // Load the protected HLS stream: fetch a signed 15-minute token, then attach
  // the master playlist via hls.js (or native HLS on Safari/iOS).
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoId || videoSrc) return;

    let cancelled = false;
    let hls: HlsLike | null = null;

    (async () => {
      try {
        const res = await fetch(`/api/videos/${videoId}/token`, { credentials: 'include' });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (!cancelled) setStreamError(body.error || `Erreur ${res.status}`);
          return;
        }
        const data = (await res.json()) as VideoStreamToken;
        if (cancelled) return;
        if (data.watermark) setWatermark(data.watermark);

        const { default: Hls } = await import('hls.js');
        if (cancelled) return;

        if (Hls.isSupported()) {
          hls = new Hls({ enableWorker: true, lowLatencyMode: false }) as unknown as HlsLike;
          hls.loadSource(data.manifestUrl);
          hls.attachMedia(video);
          hlsRef.current = hls;
          setStreamMode('hls');
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = data.manifestUrl;
          setStreamMode('native');
        } else {
          setStreamError('Lecture HLS non supportée par ce navigateur.');
        }
      } catch (err) {
        if (!cancelled) setStreamError(err instanceof Error ? err.message : 'Flux indisponible');
      }
    })();

    return () => {
      cancelled = true;
      if (hls) hls.destroy();
      hlsRef.current = null;
    };
  }, [videoId, videoSrc]);

  // Floating Watermark position coordinates (moves every 10s to defeat static cropping)
  const [watermarkPos, setWatermarkPos] = useState({ top: '15%', left: '20%' });

  useEffect(() => {
    const interval = setInterval(() => {
      // Random coordinates between 10% and 80%
      const top = Math.floor(Math.random() * 70 + 10) + '%';
      const left = Math.floor(Math.random() * 60 + 15) + '%';
      setWatermarkPos({ top, left });
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      if (videoRef.current.duration) {
        setDuration(videoRef.current.duration);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    setIsMuted(val === 0);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleQualityChange = (value: string) => {
    setQuality(value);
    const hls = hlsRef.current;
    if (!hls) return;
    if (value === 'auto') {
      hls.currentLevel = -1;
      return;
    }
    const target = value === '1080p' ? 1080 : value === '720p' ? 720 : value === '480p' ? 480 : 360;
    const idx = hls.levels.findIndex((l) => l.height === target);
    if (idx >= 0) hls.currentLevel = idx;
  };

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

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeout) clearTimeout(controlsTimeout);
    const timeout = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);
    setControlsTimeout(timeout);
  };

  return (
    <AntiScreenshot blurOnUnfocus={true}>
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className={`relative group bg-slate-950 rounded-2xl overflow-hidden shadow-2xl border border-slate-800 select-none ${className}`}
        style={{ aspectRatio: '16/9' }}
      >
        {/* HTML5 Video Layer (attached to HLS via hls.js or native playback) */}
        <video
          ref={videoRef}
          src={videoSrc}
          onTimeUpdate={handleTimeUpdate}
          onEnded={() => {
            setIsPlaying(false);
            if (onEnded) onEnded();
          }}
          onClick={togglePlay}
          className="w-full h-full object-contain cursor-pointer"
          playsInline
        />

        {/* Stream error state */}
        {streamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 text-center px-6 z-20">
            <span className="text-3xl">🔒</span>
            <p className="text-sm font-semibold text-white">{streamError}</p>
            <p className="text-xs text-slate-400">Vérifiez votre accès ou réessayez depuis la bibliothèque.</p>
          </div>
        )}

        {/* Dynamic Moving Anti-Leak Watermark (SEC-20) */}
        <div
          className="absolute pointer-events-none transition-all duration-1000 ease-in-out z-20 flex flex-col items-center opacity-30 group-hover:opacity-40"
          style={{ top: watermarkPos.top, left: watermarkPos.left }}
        >
          <div className="bg-black/60 backdrop-blur-xs px-3 py-1 rounded-md border border-white/10 text-white font-mono text-[10px] tracking-wider font-semibold shadow-md">
            <span>{watermark.maskedEmail}</span>
            <span className="mx-1 text-blue-400">•</span>
            <span>{watermark.sessionRef}</span>
          </div>
        </div>

        {/* Play/Pause Center Indicator on Click */}
        {!isPlaying && (
          <div
            onClick={togglePlay}
            className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10 transition-opacity"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-blue-600/90 hover:bg-blue-600 text-white flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 ml-1 fill-current" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
          </div>
        )}

        {/* Top Info Bar */}
        <div
          className={`absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent z-30 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className="flex items-center justify-between text-white">
            <div>
              <h3 className="font-semibold text-sm sm:text-base line-clamp-1">{title}</h3>
              {titleAr && <p className="text-xs text-blue-300 font-serif line-clamp-1">{titleAr}</p>}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {quality === 'auto' ? 'AUTO' : quality} HLS
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                {streamMode === 'idle' ? 'DRM Actif' : 'DRM · Token 15min'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Custom Controls Bar */}
        <div
          className={`absolute bottom-0 inset-x-0 p-3 sm:p-4 bg-gradient-to-t from-black/90 via-black/60 to-transparent z-30 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Scrubber / Progress Bar */}
          <div className="mb-3 flex items-center gap-2">
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-slate-700/80 rounded-lg appearance-none cursor-pointer accent-blue-500 hover:h-2 transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-white text-xs">
            {/* Left Controls: Play, Time, Volume */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                id="video-play-btn"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Lecture'}
              >
                {isPlaying ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 fill-current ml-0.5" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>

              <span className="font-mono text-[11px] text-slate-300">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>

              {/* Volume */}
              <div className="hidden sm:flex items-center gap-1.5 group/vol">
                <button onClick={toggleMute} className="text-slate-300 hover:text-white">
                  {isMuted || volume === 0 ? (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
                    </svg>
                  )}
                </button>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-16 h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>

            {/* Right Controls: Speed, Quality, Fullscreen */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Speed Selector */}
              <div className="flex items-center bg-white/10 rounded-lg px-2 py-0.5 text-[11px] font-semibold">
                {[1, 1.25, 1.5].map((speed) => (
                  <button
                    key={speed}
                    onClick={() => handleSpeedChange(speed)}
                    className={`px-1.5 py-0.5 rounded transition-colors ${
                      playbackSpeed === speed ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>

              {/* Quality Selector */}
              <select
                value={quality}
                onChange={(e) => handleQualityChange(e.target.value)}
                className="bg-white/10 hover:bg-white/20 text-white rounded-lg px-2 py-1 text-[11px] font-medium border-0 focus:ring-1 focus:ring-blue-500 cursor-pointer"
              >
                <option value="auto" className="bg-slate-900 text-white">Auto</option>
                <option value="1080p" className="bg-slate-900 text-white">1080p FHD</option>
                <option value="720p" className="bg-slate-900 text-white">720p HD</option>
                <option value="480p" className="bg-slate-900 text-white">480p SD</option>
                <option value="360p" className="bg-slate-900 text-white">360p Éco</option>
              </select>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                id="video-fullscreen-btn"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                aria-label="Plein écran"
              >
                {isFullscreen ? (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-14v3h3v2h-5V5h2z" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </AntiScreenshot>
  );
}
