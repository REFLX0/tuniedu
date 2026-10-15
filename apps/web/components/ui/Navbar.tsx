'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useLanguage } from '@/lib/language-context';
import { Icons } from './icons';
import { useSession } from '@/components/providers/SessionProvider';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { lang, setLang, t, isRtl } = useLanguage();
  const { user: currentUser, logout } = useSession();

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setLoggingOut(true);
    setUserDropdownOpen(false);
    await logout();
    setLoggingOut(false);
    router.push('/');
  };

  const dashboardHref = (role: string) => {
    if (role === 'PROFESSOR') return '/professor';
    if (role === 'PARENT') return '/parent';
    if (role === 'ADMIN') return '/admin';
    return '/student/library';
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'STUDENT':
        return { label: lang === 'ar' ? 'تلميذ' : 'Élève', style: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'PARENT':
        return { label: lang === 'ar' ? 'ولي' : 'Parent', style: 'bg-slate-100 text-slate-700 border-slate-200' };
      case 'PROFESSOR':
        return { label: lang === 'ar' ? 'أستاذ معتمد' : 'Enseignant Agréé', style: 'bg-amber-50 text-amber-900 border-amber-200' };
      case 'ADMIN':
        return { label: lang === 'ar' ? 'إدارة' : 'Administration', style: 'bg-red-50 text-red-900 border-red-200' };
      default:
        return { label: role, style: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const navPills = [
    {
      href: '/professor',
      labelAr: 'إنشاء وثيقة',
      labelFr: 'Créer document',
      icon: Icons.FileText,
      badge: 'PRO',
    },
    {
      href: '/student/library',
      labelAr: 'وثائقي ومكتبتي',
      labelFr: 'Mes documents',
      icon: Icons.BookOpen,
    },
    {
      href: '/catalogue',
      labelAr: 'دروس جاهزة',
      labelFr: 'Cours & Manuels',
      icon: Icons.Book,
    },
    {
      href: '/checkout?bookId=book_math_9b',
      labelAr: 'الاشتراكات',
      labelFr: 'Abonnements',
      icon: Icons.ShieldAlert, // Lightning bolt style
      isHighlight: true,
    },
    {
      href: '/parent',
      labelAr: 'فضاء الأولياء',
      labelFr: 'Espace Parents',
      icon: Icons.Users,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      {/* Institutional Top Crest Line */}
      <div className="bg-gradient-to-r from-slate-950 via-[#0F2942] to-slate-950 text-slate-300 text-[11px] py-1 px-4 sm:px-6 border-b border-slate-800">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-semibold text-white tracking-wide">
              {lang === 'ar' ? 'الجمهورية التونسية · وزارة التربية' : 'République Tunisienne · Ministère de l\'Éducation'}
            </span>
            <span className="hidden sm:inline text-slate-600">|</span>
            <span className="hidden sm:inline text-slate-300 text-[10px]">
              {lang === 'ar' ? 'المركز الوطني البيداغوجي (CNP) · حماية المعطيات (INPDP)' : 'Centre National Pédagogique (CNP) · Homologué 2026'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Active Trimester Badge */}
            <div className="hidden md:flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-900/60 border border-blue-700/50 text-[10px] text-blue-200">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
              <span>{lang === 'ar' ? 'الثلاثي الأول (T1) · جاري' : 'Trimestre 1 (T1) · Actif'}</span>
            </div>

            <span className="text-slate-400 text-[10px] hidden sm:inline">
              {lang === 'ar' ? '2026–2027 (توقيت تونس)' : '2026–2027 · Tunis'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between gap-4">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-700 via-blue-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
            <Icons.GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 leading-none">
              <span className="font-extrabold text-xl text-slate-950 tracking-tight">
                Tuni<span className="text-blue-600">Edu</span>
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                🇹🇳 2026
              </span>
            </div>
            <div className="text-[10px] font-medium text-slate-500 mt-0.5 flex items-center gap-1">
              <span>{lang === 'ar' ? 'توني إيدو المنصة التعليمية' : 'Plateforme Éducative Officielle'}</span>
            </div>
          </div>
        </Link>

        {/* Center Pill Navigation Container (Directly Inspired by Screenshot 1, 2, 3) */}
        <nav className="hidden xl:flex items-center p-1 rounded-full bg-slate-100/90 border border-slate-200/80 shadow-inner gap-0.5">
          {navPills.map((pill) => {
            const isActive = pathname === pill.href || (pill.href !== '/' && pathname.startsWith(pill.href.split('?')[0]));
            const Icon = pill.icon;
            return (
              <Link
                key={pill.href}
                href={pill.href}
                className={`relative flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-blue-700 shadow-xs shadow-slate-200/80 font-bold'
                    : 'text-slate-600 hover:text-slate-950 hover:bg-white/60'
                } ${pill.isHighlight && !isActive ? 'text-blue-700 hover:text-blue-800' : ''}`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-blue-600' : 'text-slate-500'}`} />
                <span>{lang === 'ar' ? pill.labelAr : pill.labelFr}</span>
                {pill.badge && (
                  <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded-full bg-blue-600 text-white uppercase tracking-wider">
                    {pill.badge}
                  </span>
                )}
                {pill.isHighlight && (
                  <span className="text-[10px]">⚡</span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Menu: Language, Role Switcher, Account */}
        <div className="flex items-center gap-2.5">
          {/* Language Switcher Pill */}
          <div className="flex items-center rounded-full bg-slate-100 border border-slate-200 p-0.5 text-xs font-bold">
            <button
              onClick={() => setLang('ar')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all text-[11px] ${
                lang === 'ar'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="العربية (تونس)"
            >
              <span>🇹🇳</span>
              <span>العربية</span>
            </button>
            <button
              onClick={() => setLang('fr')}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-all text-[11px] ${
                lang === 'fr'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
              title="Français"
            >
              <span>🇫🇷</span>
              <span>FR</span>
            </button>
          </div>

          {/* Account / Session Menu */}
          <div className="relative" ref={dropdownRef}>
            {currentUser ? (
              <>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 p-1 pl-2 sm:px-3 sm:py-1 rounded-full border border-slate-200 bg-white hover:border-slate-300 shadow-xs transition"
                  aria-label="Menu du compte"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                    {currentUser.name.charAt(0)}
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-xs font-bold text-slate-900 leading-tight">
                      {currentUser.name.split(' ')[0]}
                    </div>
                    <div className="text-[10px] text-blue-600 font-medium">
                      {getRoleBadge(currentUser.role).label}
                    </div>
                  </div>
                  <Icons.ChevronRight className={`w-3.5 h-3.5 text-slate-400 transition-transform ${userDropdownOpen ? 'rotate-90' : ''}`} />
                </button>

                {userDropdownOpen && (
                  <div
                    className={`absolute ${isRtl ? 'left-0' : 'right-0'} top-full mt-2 w-72 bg-white/95 backdrop-blur-xl rounded-2xl border border-slate-200/90 shadow-2xl z-50 p-2.5 text-slate-800 animate-in fade-in-50 zoom-in-95 duration-150`}
                  >
                    <div className="px-3 py-2.5 border-b border-slate-100 bg-slate-50/70 rounded-xl mb-2">
                      <div className="flex items-center justify-between">
                        <div className="font-bold text-xs text-slate-900">{currentUser.name}</div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${getRoleBadge(currentUser.role).style}`}>
                          {getRoleBadge(currentUser.role).label}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</div>
                    </div>

                    <Link
                      href={dashboardHref(currentUser.role)}
                      onClick={() => setUserDropdownOpen(false)}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium transition"
                    >
                      <Icons.BookOpen className="w-3.5 h-3.5 text-blue-600" />
                      <span>{lang === 'ar' ? 'لوحة التحكم' : 'Mon espace'}</span>
                    </Link>

                    <div className="border-t border-slate-100 pt-2 mt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        disabled={loggingOut}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 font-medium transition disabled:opacity-50"
                      >
                        <Icons.Lock className="w-3.5 h-3.5" />
                        <span>{t.nav.signOut}</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/connexion"
                  className="px-3 py-1.5 rounded-full text-xs font-semibold text-slate-700 hover:text-blue-700 hover:bg-slate-100 transition"
                >
                  {lang === 'ar' ? 'دخول' : 'Connexion'}
                </Link>
                <Link
                  href="/inscription"
                  className="px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-blue-700 hover:bg-blue-800 shadow-xs transition"
                >
                  {lang === 'ar' ? 'تسجيل' : 'Inscription'}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl border border-slate-200"
            aria-label="Menu"
          >
            {mobileMenuOpen ? <Icons.X className="w-5 h-5" /> : <Icons.Filter className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-1.5">
          {navPills.map((pill) => (
            <Link
              key={pill.href}
              href={pill.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-800 hover:bg-blue-50 hover:text-blue-700 transition"
            >
              <div className="flex items-center gap-2.5">
                <pill.icon className="w-4 h-4 text-blue-600" />
                <span>{lang === 'ar' ? pill.labelAr : pill.labelFr}</span>
              </div>
              <Icons.ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
