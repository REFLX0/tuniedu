'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { Icons } from './icons';
import { useSession } from '@/components/providers/SessionProvider';

export function MobileBottomNav() {
  const pathname = usePathname();
  const { lang } = useLanguage();
  const { user: currentUser } = useSession();

  const getTabs = () => {
    if (!currentUser) {
      return [
        { href: '/', label: lang === 'ar' ? 'الرئيسية' : 'Accueil', icon: Icons.Sparkles },
        { href: '/catalogue', label: lang === 'ar' ? 'الدليل' : 'Catalogue', icon: Icons.Search },
        { href: '/student/videos', label: lang === 'ar' ? 'فيديوهات' : 'Vidéos', icon: Icons.Play },
        { href: '/student/live', label: lang === 'ar' ? 'المباشر' : 'Directs', icon: Icons.Video },
        { href: '/connexion', label: lang === 'ar' ? 'دخول' : 'Connexion', icon: Icons.Users },
      ];
    }

    if (currentUser.roles.includes('ADMIN')) {
      return [
        { href: '/', label: lang === 'ar' ? 'الرئيسية' : 'Accueil', icon: Icons.Sparkles },
        { href: '/admin', label: lang === 'ar' ? 'الإدارة' : 'Admin', icon: Icons.ShieldCheck },
        { href: '/catalogue', label: lang === 'ar' ? 'المناهج' : 'Manuels', icon: Icons.Book },
        { href: '/professor', label: lang === 'ar' ? 'الأساتذة' : 'Studio', icon: Icons.FileText },
        { href: '/parent', label: lang === 'ar' ? 'الأولياء' : 'Parents', icon: Icons.Users },
      ];
    }

    if (currentUser.roles.includes('PROFESSOR')) {
      return [
        { href: '/', label: lang === 'ar' ? 'الرئيسية' : 'Accueil', icon: Icons.Sparkles },
        { href: '/professor', label: lang === 'ar' ? 'فضاء الأستاذ' : 'Studio', icon: Icons.FileText },
        { href: '/catalogue', label: lang === 'ar' ? 'المناهج' : 'Manuels', icon: Icons.Book },
        { href: '/student/live', label: lang === 'ar' ? 'المباشر' : 'Directs', icon: Icons.Video },
        { href: '/community', label: lang === 'ar' ? 'الملتقى' : 'Forum', icon: Icons.Users },
      ];
    }

    if (currentUser.roles.includes('PARENT')) {
      return [
        { href: '/', label: lang === 'ar' ? 'الرئيسية' : 'Accueil', icon: Icons.Sparkles },
        { href: '/parent', label: lang === 'ar' ? 'الأبناء' : 'Mes Enfants', icon: Icons.Users },
        { href: '/catalogue', label: lang === 'ar' ? 'الاشتراكات' : 'Abonnements', icon: Icons.Book },
        { href: '/student/live', label: lang === 'ar' ? 'المباشر' : 'Directs', icon: Icons.Video },
      ];
    }

    // Default: STUDENT
    return [
      { href: '/student', label: lang === 'ar' ? 'فضائي' : 'Espace', icon: Icons.Sparkles },
      { href: '/student/library', label: lang === 'ar' ? 'مكتبتي' : 'Manuels', icon: Icons.Book },
      { href: '/student/videos', label: lang === 'ar' ? 'فيديوهات' : 'Vidéos', icon: Icons.Play },
      { href: '/student/live', label: lang === 'ar' ? 'المباشر' : 'Directs', icon: Icons.Video },
      { href: '/student/progress', label: lang === 'ar' ? 'التقدم' : 'Progrès', icon: Icons.BarChart },
    ];
  };

  const tabs = getTabs();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-blue-100 py-1.5 px-3 shadow-lg">
      <div className="flex items-center justify-around">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition ${
                isActive ? 'text-blue-700 font-bold' : 'text-slate-500 hover:text-blue-900'
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-[10px] leading-tight">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
