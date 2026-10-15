import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/lib/language-context';
import { SessionProvider } from '@/components/providers/SessionProvider';
import { Navbar } from '@/components/ui/Navbar';
import { MobileBottomNav } from '@/components/ui/MobileBottomNav';

export const metadata: Metadata = {
  title: 'TuniEdu — Plateforme Pédagogique Nationale des Manuels Scolaires Numériques',
  description:
    'Manuels scolaires officiels tunisiens pour le collège (7ème, 8ème, 9ème année de base) et le primaire. Démonstrations et corrections détaillées rédigées par des enseignants agrégés et inspecteurs du Ministère.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning className="h-full bg-[#F8FAFC] text-[#0F172A]">
      <body className="min-h-full flex flex-col font-sans antialiased text-[#0F172A] bg-[#F8FAFC] selection:bg-[#1D4ED8] selection:text-white">
        <SessionProvider>
        <LanguageProvider>
          {/* Institutional Top Navbar */}
          <Navbar />

          {/* Main Academic Content */}
          <main className="flex-1 pb-16 md:pb-0">{children}</main>

          {/* Institutional Footer */}
          <footer className="bg-[#0F172A] text-slate-400 py-12 border-t border-slate-800 text-xs">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-b border-slate-800 pb-8">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-md bg-blue-700 flex items-center justify-center text-white font-bold text-xs shadow-xs">
                      TN
                    </div>
                    <div>
                      <span className="font-bold text-sm text-white tracking-tight">TuniEdu</span>
                      <span className="text-[11px] text-slate-400 mx-2">·</span>
                      <span className="text-xs text-slate-300">Portail Pédagogique Numérique</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-xl leading-relaxed">
                    Plateforme nationale dédiée à la publication et à la diffusion numérique des manuels pédagogiques de référence pour l&apos;enseignement de base, primaire et préparatoire aux concours d&apos;accès aux lycées pilotes.
                  </p>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1">
                  <div>Régulation : <strong>Ministère de l&apos;Éducation</strong></div>
                  <div>Monnaie : <strong>Dinar Tunisien (TND)</strong></div>
                  <div>Fuseau officiel : <strong>Africa/Tunis</strong></div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-slate-500">
                <div>
                  © 2026–2027 TuniEdu · République Tunisienne. Droits d&apos;auteurs et propriété intellectuelle certifiés.
                </div>
                <div className="flex gap-6">
                  <span className="hover:text-slate-300 transition cursor-pointer">Conditions Générales d&apos;Accès</span>
                  <span className="hover:text-slate-300 transition cursor-pointer">Protection des Données (INPDP)</span>
                  <span className="hover:text-slate-300 transition cursor-pointer">Charte Déontologique Enseignants</span>
                </div>
              </div>
            </div>
          </footer>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav />
        </LanguageProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
