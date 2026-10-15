'use client';

// =============================================================================
// TuniEdu Interactive Live Chat Component (Phase 4)
// Moderated real-time chat with question filter, pinned professor announcements,
// and instant emoji reactions
// =============================================================================

import React, { useState, useEffect, useRef } from 'react';
import { LiveChatMessageDTO } from '@tuniedu/shared-types';

interface LiveChatBoxProps {
  liveId: string;
  currentUserId?: string;
  isProfessor?: boolean;
  pinnedMessage?: string;
  initialMessages?: LiveChatMessageDTO[];
  className?: string;
  lang?: 'fr' | 'ar';
}

export function LiveChatBox({
  liveId,
  currentUserId,
  pinnedMessage,
  initialMessages = [],
  className = '',
  lang = 'fr',
}: LiveChatBoxProps) {
  const [messages, setMessages] = useState<LiveChatMessageDTO[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [isQuestionMode, setIsQuestionMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'ALL' | 'QUESTIONS'>('ALL');
  const [isSending, setIsSending] = useState(false);
  const [errorToast, setErrorToast] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab]);

  // Periodic poll for new messages (fallback for WebSockets/SSE)
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/lives/${liveId}/chat`);
        if (res.ok) {
          const data = await res.json();
          if (data.messages) {
            setMessages(data.messages);
          }
        }
      } catch {
        // Silent polling error handling
      }
    };

    const interval = setInterval(fetchMessages, 3000);
    return () => clearInterval(interval);
  }, [liveId]);

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || isSending) return;

    const textToSend = inputText.trim();
    setInputText('');
    setIsSending(true);

    try {
      const res = await fetch(`/api/lives/${liveId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
          isQuestion: isQuestionMode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorToast(data.error || 'Erreur lors de l’envoi');
        setTimeout(() => setErrorToast(''), 3000);
      } else if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch {
      setErrorToast('Erreur de connexion');
      setTimeout(() => setErrorToast(''), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const handleQuickReaction = (emoji: string) => {
    setInputText((prev) => `${prev} ${emoji}`.trim());
  };

  const filteredMessages = activeTab === 'QUESTIONS'
    ? messages.filter((m) => m.isQuestion)
    : messages;

  return (
    <div className={`flex flex-col bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden ${className}`}>
      
      {/* Header with Tabs */}
      <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <h4 className="font-bold text-xs uppercase tracking-wider">
            {lang === 'ar' ? 'المحادثة التفاعلية المباشرة' : 'Discussion en Direct'}
          </h4>
        </div>

        {/* Tab Filters */}
        <div className="flex bg-slate-800 rounded-lg p-0.5 text-[11px] font-semibold">
          <button
            onClick={() => setActiveTab('ALL')}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              activeTab === 'ALL' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            Tous ({messages.length})
          </button>
          <button
            onClick={() => setActiveTab('QUESTIONS')}
            className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
              activeTab === 'QUESTIONS' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Questions</span>
            <span className="px-1 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[9px]">
              {messages.filter((m) => m.isQuestion).length}
            </span>
          </button>
        </div>
      </div>

      {/* Pinned Professor Announcement Banner */}
      {pinnedMessage && (
        <div className="bg-blue-50/90 border-b border-blue-200/80 px-4 py-2.5 flex items-start gap-2.5 text-xs text-blue-900">
          <span className="shrink-0 text-blue-600 text-sm">📌</span>
          <div className="flex-1 min-w-0">
            <span className="font-bold text-[11px] text-blue-700 uppercase tracking-wider block">
              Message épinglé par l&apos;enseignant :
            </span>
            <p className="text-xs leading-snug font-medium text-slate-800 mt-0.5">{pinnedMessage}</p>
          </div>
        </div>
      )}

      {/* Messages Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px] max-h-[460px] bg-slate-50/50">
        {filteredMessages.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            {activeTab === 'QUESTIONS'
              ? 'Aucune question posée pour l’instant. Soyez le premier à poser une question !'
              : 'Bienvenue dans la séance ! Les messages des élèves et du professeur s’afficheront ici.'}
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isProf = msg.userRole === 'PROFESSOR';
            const isSelf = msg.userId === currentUserId;

            return (
              <div
                key={msg.id}
                className={`p-3 rounded-2xl transition-all ${
                  isProf
                    ? 'bg-blue-50 border border-blue-200/80 shadow-xs'
                    : msg.isQuestion
                    ? 'bg-amber-50/80 border border-amber-200/70 shadow-xs'
                    : 'bg-white border border-slate-200/80'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-xs font-bold ${
                        isProf ? 'text-blue-800' : isSelf ? 'text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {msg.userName}
                    </span>

                    {isProf && (
                      <span className="px-1.5 py-0.2 rounded-md bg-blue-600 text-white text-[9px] font-extrabold uppercase tracking-wider">
                        Enseignant
                      </span>
                    )}

                    {msg.isQuestion && (
                      <span className="px-1.5 py-0.2 rounded-md bg-amber-500 text-white text-[9px] font-bold uppercase tracking-wider">
                        Question
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono">
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <p className="text-xs text-slate-800 leading-relaxed break-words">
                  {msg.message}
                </p>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error Toast if rate limited */}
      {errorToast && (
        <div className="bg-red-500 text-white text-xs px-4 py-2 text-center font-medium animate-fade-in">
          {errorToast}
        </div>
      )}

      {/* Quick Reaction Bar */}
      <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
          Réactions rapides :
        </span>
        <div className="flex items-center gap-1.5">
          {['👍', '🙋‍♂️', '💡', '👏', '❓'].map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleQuickReaction(emoji)}
              className="w-7 h-7 rounded-lg hover:bg-white text-sm flex items-center justify-center transition-colors shadow-2xs"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200">
        <div className="flex items-center gap-2 mb-2">
          <label className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={isQuestionMode}
              onChange={(e) => setIsQuestionMode(e.target.checked)}
              className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-400 border-slate-300"
            />
            <span className="text-amber-700 font-semibold">Poser comme une question au professeur</span>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              isQuestionMode
                ? 'Tapez votre question pour le professeur...'
                : 'Participez à la discussion en direct...'
            }
            maxLength={500}
            className="flex-1 text-xs rounded-xl border border-slate-200 bg-slate-50 p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
          />

          <button
            type="submit"
            disabled={!inputText.trim() || isSending}
            id="chat-send-btn"
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white font-bold text-xs transition-colors shadow-sm flex items-center gap-1"
          >
            <span>Envoyer</span>
            <svg className="w-3 h-3 fill-current rotate-90" viewBox="0 0 24 24">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
