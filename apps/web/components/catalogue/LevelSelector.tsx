'use client';

import React from 'react';
import { useLanguage } from '@/lib/language-context';

export interface LevelFilterProps {
  selectedStage: string;
  onSelectStage: (stage: string) => void;
}

export function LevelSelector({ selectedStage, onSelectStage }: LevelFilterProps) {
  const { lang } = useLanguage();

  const stages = [
    {
      id: 'ALL',
      labelFr: 'Tous les niveaux',
      labelAr: 'جميع المستويات',
    },
    {
      id: 'COLLEGE',
      labelFr: 'Collège (7ème, 8ème, 9ème)',
      labelAr: 'التعليم الأساسي (7، 8، 9 أساسي)',
    },
    {
      id: 'PRIMAIRE',
      labelFr: 'Primaire (1ère–6ème)',
      labelAr: 'التعليم الابتدائي (1–6)',
    },
    {
      id: 'LYCEE',
      labelFr: 'Lycée & Baccalauréat (1ère à 4ème Bac)',
      labelAr: 'التعليم الثانوي والبكالوريا (من 1 إلى 4 ثانوي)',
    },
    {
      id: 'UNIVERSITE',
      labelFr: 'Université (Mathématiques)',
      labelAr: 'التعليم العالي (رياضيات)',
    },
  ];

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {stages.map((st) => {
        const isSelected = selectedStage === st.id;
        return (
          <button
            key={st.id}
            type="button"
            onClick={() => onSelectStage(st.id)}
            className={`whitespace-nowrap px-3.5 py-2 rounded-xl text-xs font-semibold transition border ${
              isSelected
                ? 'bg-blue-700 text-white border-blue-700 shadow-xs'
                : 'bg-white text-slate-700 border-slate-200 hover:border-blue-200 hover:bg-blue-50/50'
            }`}
          >
            <span>{lang === 'ar' ? st.labelAr : st.labelFr}</span>
          </button>
        );
      })}
    </div>
  );
}
