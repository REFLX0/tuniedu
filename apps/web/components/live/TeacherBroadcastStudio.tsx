'use client';

// =============================================================================
// TuniEdu Teacher Broadcast Studio (Phase 4)
// Professional streaming dashboard with camera/screen controls, stream health telemetry,
// and automated VOD replay publishing
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { LiveSessionDTO } from '@tuniedu/shared-types';
import { LiveChatBox } from './LiveChatBox';

const DEMO_FEED =
  'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/WeAreGoingOnBullrun.mp4';

type BroadcastState = 'idle' | 'connecting' | 'connected' | 'fallback' | 'error';

interface TeacherBroadcastStudioProps {
  session: LiveSessionDTO;
  onStatusChange?: (updatedSession: LiveSessionDTO) => void;
  lang?: 'fr' | 'ar';
}

export function TeacherBroadcastStudio({
  session,
  onStatusChange,
  lang = 'fr',
}: TeacherBroadcastStudioProps) {
  const [currentStatus, setCurrentStatus] = useState<LiveSessionDTO['status']>(session.status);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isMicActive, setIsMicActive] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [pinnedText, setPinnedText] = useState(session.description || '');
  const [broadcast, setBroadcast] = useState<BroadcastState>('idle');

  // Live Telemetry (Layer 13: Observability & Reliability)
  const [liveViewers, setLiveViewers] = useState<number | null>(null);
  const [liveDurationSeconds, setLiveDurationSeconds] = useState(0);

  const roomRef = useRef<import('livekit-client').Room | null>(null);
  const monitorRef = useRef<HTMLVideoElement>(null);

  const isLive = currentStatus === 'LIVE';
  const viewerDisplay = liveViewers ?? (session.viewerCount && session.viewerCount > 0 ? session.viewerCount : null);

  // Publish the teacher's local media to the LiveKit SFU once the session is LIVE.
  useEffect(() => {
    if (!isLive || !session.id) return;

    let cancelled = false;
    setBroadcast('connecting');

    (async () => {
      try {
        const res = await fetch(`/api/lives/${session.id}/token`, { credentials: 'include' });
        if (!res.ok) {
          if (!cancelled) setBroadcast('error');
          return;
        }
        const data = await res.json();
        if (data.tokenType !== 'LIVEKIT' || !data.livekitUrl) {
          if (!cancelled) setBroadcast('fallback');
          return;
        }

        const { Room, RoomEvent } = await import('livekit-client');
        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(
          RoomEvent.LocalTrackPublished,
          (pub: import('livekit-client').LocalTrackPublication) => {
            if (pub.track?.kind === 'video' && monitorRef.current) {
              pub.track.attach(monitorRef.current);
            }
          },
        );

        const syncViewers = () => {
          if (!cancelled && roomRef.current) setLiveViewers(roomRef.current.numParticipants);
        };
        room.on(RoomEvent.ParticipantConnected, syncViewers);
        room.on(RoomEvent.ParticipantDisconnected, syncViewers);

        await room.connect(data.livekitUrl, data.token);
        if (cancelled) {
          await room.disconnect();
          return;
        }
        // The SFU connection is up: report it as connected regardless of whether
        // the local camera/mic could be acquired (a denied device is not a stream
        // failure and must not surface as "Erreur flux").
        setBroadcast('connected');
        await room.localParticipant.setCameraEnabled(isCameraActive).catch(() => {});
        await room.localParticipant.setMicrophoneEnabled(isMicActive).catch(() => {});
        syncViewers();
      } catch {
        if (!cancelled) setBroadcast('error');
      }
    })();

    return () => {
      cancelled = true;
      if (roomRef.current) {
        roomRef.current.disconnect();
        roomRef.current = null;
      }
      fetch(`/api/lives/${session.id}/leave`, {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
      }).catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLive, session.id]);

  // Live duration timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        setLiveDurationSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  const handleStartLive = async () => {
    try {
      const res = await fetch(`/api/lives/${session.id}/start`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCurrentStatus('LIVE');
        if (onStatusChange) onStatusChange(data.liveSession);
      }
    } catch {
      setCurrentStatus('LIVE');
    }
  };

  const handleEndLive = async () => {
    if (!confirm('Êtes-vous sûr de vouloir terminer le direct ? L’enregistrement sera automatiquement converti en replay VOD.')) {
      return;
    }

    try {
      const res = await fetch(`/api/lives/${session.id}/end`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setCurrentStatus('ENDED');
        if (onStatusChange) onStatusChange(data.liveSession);
      }
    } catch {
      setCurrentStatus('ENDED');
    }
  };

  const toggleMic = () => {
    const next = !isMicActive;
    setIsMicActive(next);
    roomRef.current?.localParticipant.setMicrophoneEnabled(next).catch(() => {});
  };

  const toggleCamera = () => {
    const next = !isCameraActive;
    setIsCameraActive(next);
    roomRef.current?.localParticipant.setCameraEnabled(next).catch(() => {});
  };

  const toggleScreenShare = () => {
    const next = !isScreenSharing;
    setIsScreenSharing(next);
    roomRef.current?.localParticipant.setScreenShareEnabled(next).catch(() => {});
  };

  const formatTimer = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* Left 2 Cols: Video Broadcast Monitor & Hardware Controls */}
      <div className="lg:col-span-2 space-y-5">
        
        {/* Main Video Monitor */}
        <div className="relative bg-slate-950 rounded-3xl overflow-hidden shadow-2xl border border-slate-800" style={{ aspectRatio: '16/9' }}>
          
          {/* Broadcaster Feed (LiveKit local tracks) with demo fallback */}
          {isCameraActive ? (
            <video
              ref={monitorRef}
              src={broadcast === 'connected' ? undefined : DEMO_FEED}
              autoPlay
              muted
              loop={broadcast !== 'connected'}
              playsInline
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-slate-500">
              <span className="text-4xl mb-2">📷</span>
              <p className="text-xs font-semibold">Caméra désactivée</p>
            </div>
          )}

          {/* Top Status & Health Telemetry Banner */}
          <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/90 via-black/40 to-transparent z-20 flex items-center justify-between text-white">
            <div className="flex items-center gap-3">
              {isLive ? (
                <div className="flex items-center gap-2 px-3 py-1 bg-red-600 rounded-full text-xs font-extrabold shadow-lg shadow-red-600/40">
                  <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                  <span>EN DIRECT : {formatTimer(liveDurationSeconds)}</span>
                </div>
              ) : (
                <div className="px-3 py-1 bg-slate-800/90 border border-slate-700 rounded-full text-xs font-bold text-slate-300">
                  ⚪ Prêt à diffuser
                </div>
              )}

              {viewerDisplay !== null && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-black/60 backdrop-blur-xs rounded-full text-xs text-slate-300 border border-white/10 font-medium">
                  <span>👥 {viewerDisplay} élèves connectés</span>
                </div>
              )}
            </div>

            {/* Stream Telemetry Meters */}
            <div className="flex items-center gap-2 text-[10px] font-mono text-slate-300">
              <span
                className={`px-2 py-0.5 rounded border ${
                  broadcast === 'connected'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-400/20'
                    : broadcast === 'error'
                      ? 'bg-red-500/20 text-red-300 border-red-400/20'
                      : 'bg-slate-500/20 text-slate-300 border-slate-400/20'
                }`}
              >
                {broadcast === 'connected'
                  ? 'SFU LiveKit · 1080p'
                  : broadcast === 'connecting'
                    ? 'Connexion SFU…'
                    : broadcast === 'fallback'
                      ? 'Mode démo'
                      : broadcast === 'error'
                        ? 'Erreur flux'
                        : 'Prêt'}
              </span>

            </div>
          </div>

          {/* Floating Screen Sharing Badge */}
          {isScreenSharing && (
            <div className="absolute top-16 left-4 z-20 px-3 py-1 bg-amber-500/90 text-slate-950 font-bold text-xs rounded-lg shadow-lg flex items-center gap-1.5">
              <span>🖥️</span>
              <span>Partage d’écran actif (Tableau blanc interactif)</span>
            </div>
          )}

          {/* Bottom Broadcast Bar Controls */}
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-20 flex items-center justify-between">
            {/* Left Media Toggles: Mic, Cam, Screen */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMic}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isMicActive ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-red-600 text-white shadow-lg'
                }`}
                title={isMicActive ? 'Couper le micro' : 'Activer le micro'}
              >
                {isMicActive ? '🎙️' : '🔇'}
              </button>

              <button
                onClick={toggleCamera}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isCameraActive ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-red-600 text-white shadow-lg'
                }`}
                title={isCameraActive ? 'Désactiver la caméra' : 'Activer la caméra'}
              >
                {isCameraActive ? '📹' : '🚫'}
              </button>

              <button
                onClick={toggleScreenShare}
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                  isScreenSharing ? 'bg-blue-600 text-white shadow-lg' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
                title="Partager mon écran ou le tableau blanc"
              >
                🖥️
              </button>
            </div>

            {/* Right: Master Broadcast Start/Stop Button */}
            <div>
              {isLive ? (
                <button
                  onClick={handleEndLive}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xl shadow-red-600/30 flex items-center gap-2 transition-all transform hover:scale-105"
                >
                  <span className="w-2.5 h-2.5 bg-white rounded-xs" />
                  <span>Terminer la séance</span>
                </button>
              ) : currentStatus === 'ENDED' ? (
                <div className="px-5 py-2.5 rounded-xl bg-slate-800 text-slate-400 font-bold text-xs border border-slate-700">
                  Séance clôturée (Replay généré)
                </div>
              ) : (
                <button
                  onClick={handleStartLive}
                  className="px-7 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xl shadow-emerald-600/30 flex items-center gap-2 transition-all transform hover:scale-105"
                >
                  <span className="w-2.5 h-2.5 bg-white rounded-full animate-ping" />
                  <span>Démarrer le Direct</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Studio Control Panel & Stream Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-slate-900">{session.title}</h3>
              <p className="text-xs text-blue-600 font-medium">Manuel : {session.bookTitle}</p>
            </div>
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
              {session.priceMillimes / 1000} DT / Billet
            </span>
          </div>

          {/* Quick Pinned Announcement Input */}
          <div className="pt-2 border-t border-slate-100">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              📌 Épingler une consigne ou un lien d&apos;exercice en direct :
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pinnedText}
                onChange={(e) => setPinnedText(e.target.value)}
                placeholder="ex: Ouvrez vos manuels à la page 42 pour l'exercice 3..."
                className="flex-1 text-xs rounded-xl border border-slate-200 p-2.5 focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors shrink-0"
              >
                Mettre à jour
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Moderated Live Chat in Studio */}
      <div className="lg:col-span-1">
        <LiveChatBox
          liveId={session.id}
          isProfessor={true}
          pinnedMessage={pinnedText}
          className="h-full min-h-[580px]"
          lang={lang}
        />
      </div>
    </div>
  );
}
