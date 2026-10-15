'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, DICTIONARY, Translations } from './i18n';

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: Translations;
  isRtl: boolean;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: 'fr',
  setLang: () => {},
  t: DICTIONARY.fr,
  isRtl: false,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Language>('fr');

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage?.getItem === 'function') {
        const saved = window.localStorage.getItem('tuniedu_lang') as Language;
        if (saved && (saved === 'fr' || saved === 'ar')) {
          setLangState(saved);
          document.documentElement.lang = saved;
          document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr';
        }
      }
    } catch {
      // storage read is best-effort
    }
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    try {
      if (typeof window !== 'undefined' && typeof window.localStorage?.setItem === 'function') {
        window.localStorage.setItem('tuniedu_lang', newLang);
      }
    } catch {
      // storage write is best-effort
    }
    if (typeof document !== 'undefined') {
      document.documentElement.lang = newLang;
      document.documentElement.dir = newLang === 'ar' ? 'rtl' : 'ltr';
    }
  };

  const isRtl = lang === 'ar';
  const t = (DICTIONARY as Record<Language, Translations>)[lang] || DICTIONARY.fr;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, isRtl }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
