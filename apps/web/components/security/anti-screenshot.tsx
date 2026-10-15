'use client';

// =============================================================================
// TuniEdu Anti-Screenshot & Screen Capture Protection (SEC-15)
// Detects PrintScreen, snipping shortcuts, and blurs on window unfocus
// =============================================================================

import React, { useEffect, useState } from 'react';

interface AntiScreenshotProps {
  children: React.ReactNode;
  blurOnUnfocus?: boolean;
}

export function AntiScreenshot({ children, blurOnUnfocus = true }: AntiScreenshotProps) {
  const [isBlurred, setIsBlurred] = useState(false);
  const [showWarning, setShowWarning] = useState(false);

  useEffect(() => {
    // 1. Prevent standard screenshot keys
    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen key
      if (e.key === 'PrintScreen') {
        e.preventDefault();
        triggerWarning();
      }

      // Windows Snipping Tool (Win + Shift + S) or Mac (Cmd + Shift + 3/4/5)
      if (
        (e.shiftKey && (e.metaKey || e.ctrlKey) && ['s', 'S', '3', '4', '5'].includes(e.key))
      ) {
        triggerWarning();
      }
    };

    // 2. Prevent right-click context menu (Save image, Inspect, etc.)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // 3. Blur content when browser loses focus (e.g. screen capture tool activated)
    const handleWindowBlur = () => {
      if (blurOnUnfocus) {
        setIsBlurred(true);
      }
    };

    const handleWindowFocus = () => {
      setIsBlurred(false);
    };

    const triggerWarning = () => {
      setShowWarning(true);
      setIsBlurred(true);
      setTimeout(() => {
        setShowWarning(false);
        setIsBlurred(false);
      }, 3500);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [blurOnUnfocus]);

  return (
    <div className="relative select-none" style={{ WebkitUserSelect: 'none' }}>
      {/* Obfuscation warning banner */}
      {showWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-6 text-center animate-fade-in">
          <div className="max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-red-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
              🛡️
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Capture d’écran non autorisée
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              Pour protéger la propriété intellectuelle des professeurs tunisiens, la capture et l’enregistrement des cours sont strictement interdits (Loi INPDP n° 2004-63).
            </p>
          </div>
        </div>
      )}

      {/* Protected content with dynamic blur */}
      <div
        style={{
          filter: isBlurred ? 'blur(16px)' : 'none',
          transition: 'filter 0.2s ease-in-out',
        }}
      >
        {children}
      </div>
    </div>
  );
}
