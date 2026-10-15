'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AiChatMessageDTO } from '@tuniedu/shared-types';

interface AiTutorProps {
  bookId?: string;
  bookTitle?: string;
  chapterTitle?: string;
  levelStage?: 'PRIMAIRE' | 'COLLEGE' | 'LYCEE' | 'UNIVERSITE';
  levelCode?: string;
}

export function AiTutorFloatingDrawer({
  bookId,
  bookTitle,
  chapterTitle,
  levelStage = 'COLLEGE',
  levelCode = 'lvl_9b',
}: AiTutorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [language, setLanguage] = useState<'fr' | 'ar'>('fr');
  const [messages, setMessages] = useState<AiChatMessageDTO[]>([
    {
      id: 'ai_welcome',
      role: 'assistant',
      content:
        language === 'ar'
          ? `أهلاً بك يا بطل! أنا رفيقك الذكي في دراستك على منصة توني إيدو 🎓\nيمكنني تبسيط أي درس وشرح أهميته في الحياة الواقعية ومساعدتك في حل التمارين خطوة بخطوة!`
          : `Bonjour ! Je suis ton Tuteur IA pédagogique TuniEdu 🎓\nJe peux t'expliquer n'importe quelle notion en langage simple, te révéler à quoi elle sert dans la vraie vie en Tunisie, ou te donner des indices pour tes exercices sans te donner la réponse tout de suite !`,
      suggestedQuestions: [
        'À quoi sert cette leçon dans la vraie vie ?',
        'Donne-moi un indice pour mon exercice',
        'Explique-moi avec un exemple concret',
      ],
      createdAt: new Date().toISOString(),
    },
  ]);
  const [privacyNotice, setPrivacyNotice] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSendMessage = async (textToSend?: string, mode: 'EXPLAIN' | 'WHY_LEARN' | 'HINT' = 'EXPLAIN') => {
    const messageText = textToSend || prompt;
    if (!messageText.trim() || isLoading) return;

    const userMsg: AiChatMessageDTO = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: messageText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setPrompt('');
    setIsLoading(true);
    setPrivacyNotice(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: messageText,
          bookId,
          chapterTitle,
          levelStage,
          levelCode,
          mode,
          language,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erreur du serveur IA');
      }

      if (data.sanitization?.piiRedacted) {
        setPrivacyNotice(
          `🔒 Vos données personnelles (${data.sanitization.redactedTypes.join(', ')}) ont été masquées conformément aux normes INPDP.`
        );
      }

      setMessages((prev) => [...prev, data.message]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'assistant',
          content: `⚠️ Désolé, une erreur est survenue : ${err instanceof Error ? err.message : 'erreur inconnue'}. Réessaie dans quelques instants.`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Trigger Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-5 py-3.5 rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 group"
          id="open-ai-tutor-btn"
          aria-label="Ouvrir le Tuteur IA"
        >
          <div className="relative">
            <span className="text-xl">🤖</span>
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-300"></span>
            </span>
          </div>
          <div className="text-left font-medium">
            <div className="text-xs uppercase tracking-wider text-emerald-100 font-bold">Tuteur IA</div>
            <div className="text-sm font-semibold">Besoin d&apos;aide ?</div>
          </div>
        </button>
      )}

      {/* Floating Glassmorphism Drawer Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-96 sm:w-[420px] h-[600px] max-h-[85vh] bg-slate-900/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300 text-white font-sans">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700/60 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg shadow-inner">
                🤖
              </div>
              <div>
                <h3 className="font-bold text-sm tracking-wide text-white flex items-center gap-2">
                  Tuteur IA Pédagogique
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                    Tunisie
                  </span>
                </h3>
                <p className="text-xs text-slate-400 truncate max-w-[220px]">
                  {chapterTitle || bookTitle || 'Programme Officiel Tunisien'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Language Switcher */}
              <button
                onClick={() => setLanguage(language === 'fr' ? 'ar' : 'fr')}
                className="text-xs px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-600 font-bold text-emerald-400 transition"
                title="Changer de langue"
              >
                {language === 'fr' ? 'العربية' : 'Français'}
              </button>

              {/* Close Button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                aria-label="Fermer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Context & INPDP Privacy Badge */}
          <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              Niveau : <strong className="text-slate-200">{levelStage}</strong>
            </span>
            <span className="flex items-center gap-1 text-slate-400">
              🛡️ Conforme INPDP
            </span>
          </div>

          {/* Privacy Alert if PII was stripped */}
          {privacyNotice && (
            <div className="p-2.5 mx-3 mt-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-xs text-amber-300 flex items-center gap-2">
              <span>🛡️</span>
              <span>{privacyNotice}</span>
            </div>
          )}

          {/* Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-700">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-md ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-br-xs'
                      : 'bg-slate-800/90 text-slate-100 border border-slate-700/60 rounded-bl-xs'
                  }`}
                >
                  <div className="whitespace-pre-line">{msg.content}</div>

                  {/* Context Rationale Tag if present */}
                  {msg.pedagogicalRationale && (
                    <div className="mt-2.5 pt-2 border-t border-slate-700/50 text-[11px] text-emerald-300 flex items-start gap-1.5 font-medium">
                      <span>💡</span>
                      <span>{msg.pedagogicalRationale}</span>
                    </div>
                  )}
                </div>

                {/* Suggested follow-up buttons */}
                {msg.suggestedQuestions && msg.suggestedQuestions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {msg.suggestedQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(q, 'EXPLAIN')}
                        className="text-xs bg-slate-800/80 hover:bg-emerald-950/40 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 rounded-full px-3 py-1 transition text-left"
                      >
                        ⚡ {q}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce"></div>
                </div>
                <span>Le Tuteur IA réfléchit selon le programme tunisien...</span>
              </div>
            )}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick Prompt Action Pills */}
          <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex gap-2 overflow-x-auto text-xs no-scrollbar">
            <button
              onClick={() => handleSendMessage('À quoi sert cette leçon dans la vraie vie en Tunisie ?', 'WHY_LEARN')}
              className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 transition flex items-center gap-1"
            >
              🌟 À quoi ça sert ?
            </button>
            <button
              onClick={() => handleSendMessage('Donne-moi un indice méthodique pour démarrer sans donner la réponse finale', 'HINT')}
              className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 transition flex items-center gap-1"
            >
              💡 Indice sans solution
            </button>
            <button
              onClick={() => handleSendMessage('Peux-tu m\'expliquer ce passage avec des mots plus simples ?', 'EXPLAIN')}
              className="whitespace-nowrap px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-purple-300 border border-purple-500/30 transition flex items-center gap-1"
            >
              🔍 Mots simples
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'اطرح سؤالك هنا (مثال: اشرح لي مبرهنة طاليس)...'
                  : 'Pose ta question (ex: Explique-moi ce théorème)...'
              }
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white p-2.5 rounded-xl transition"
              aria-label="Envoyer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
