'use client';

// =============================================================================
// TuniEdu Anti-Copy & Anti-Paste Protection (SEC-16)
// Prevents copying exam prompts and exercise contents to preserve academic integrity
// =============================================================================

import React, { useState } from 'react';

interface AntiCopyProps {
  children: React.ReactNode;
  warningMessage?: string;
  className?: string;
}

export function AntiCopy({
  children,
  warningMessage = 'Le copier-coller est désactivé pour cet exercice afin de garantir l’équité de l’évaluation.',
  className = '',
}: AntiCopyProps) {
  const [toastVisible, setToastVisible] = useState(false);

  const handleBlockedAction = (e: React.SyntheticEvent) => {
    e.preventDefault();
    setToastVisible(true);
    setTimeout(() => {
      setToastVisible(false);
    }, 2500);
  };

  return (
    <div
      onCopy={handleBlockedAction}
      onCut={handleBlockedAction}
      onPaste={(e) => {
        // Only block pasting if inside specific non-input elements
        const target = e.target as HTMLElement;
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          handleBlockedAction(e);
        }
      }}
      onContextMenu={handleBlockedAction}
      onDragStart={handleBlockedAction}
      className={`select-none ${className}`}
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      {toastVisible && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-slide-up">
          <span>🔒</span>
          <span>{warningMessage}</span>
        </div>
      )}
      {children}
    </div>
  );
}
