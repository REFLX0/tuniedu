'use client';

import React from 'react';
import { useLanguage } from '@/lib/language-context';

export interface SubjectFilterProps {
  selectedSubject: string;
  onSelectSubject: (subject: string) => void;
}

export function SubjectFilter({ selectedSubject, onSelectSubject }: SubjectFilterProps) {
  const { lang } = useLanguage();

  const subjects = [
    { id: 'ALL', labelFr: 'Toutes les matières', labelAr: 'جميع المواد' },
    { id: 'subj_math', labelFr: 'Mathématiques', labelAr: 'الرياضيات' },
    { id: 'subj_phys', labelFr: 'Sciences Physiques', labelAr: 'العلوم الفيزيائية' },
    { id: 'subj_svt', labelFr: 'SVT', labelAr: 'علوم الحياة والأرض' },
    { id: 'subj_info', labelFr: 'Informatique & Algorithmique', labelAr: 'الإعلامية والخوارزميات' },
    { id: 'subj_eco', labelFr: 'Économie & Gestion', labelAr: 'الاقتصاد والتصرف' },
    { id: 'subj_philo', labelFr: 'Philosophie', labelAr: 'الفلسفة' },
    { id: 'subj_eveil', labelFr: 'Éveil Scientifique', labelAr: 'الإيقاظ العلمي' },
    { id: 'subj_ara', labelFr: 'Langue Arabe', labelAr: 'اللغة العربية' },
    { id: 'subj_fra', labelFr: 'Langue Française', labelAr: 'اللغة الفرنسية' },
  ];

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {subjects.map((sub) => {
        const isSelected = selectedSubject === sub.id;
        return (
          <button
            key={sub.id}
            type="button"
            onClick={() => onSelectSubject(sub.id)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              isSelected
                ? 'bg-blue-700 text-white font-semibold shadow-xs'
                : 'bg-blue-50/70 text-blue-900 hover:bg-blue-100/80 border border-blue-100/60'
            }`}
          >
            {lang === 'ar' ? sub.labelAr : sub.labelFr}
          </button>
        );
      })}
    </div>
  );
}
