'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Icons } from '@/components/ui/icons';

function GatewaySimulationContent() {
  const searchParams = useSearchParams();

  const amount = searchParams.get('amount') || '22000';
  const ref = searchParams.get('ref') || 'FLOUCI-REF-9982';
  const providerParam = searchParams.get('provider');
  const provider: 'FLOUCI' | 'KONNECT' | 'GPG' =
    providerParam === 'KONNECT' || providerParam === 'GPG' ? providerParam : 'FLOUCI';

  const [status, setStatus] = useState<'PENDING' | 'CONFIRMING' | 'SUCCESS' | 'CANCELLED'>('PENDING');

  const formatDT = (m: string) => (parseInt(m, 10) / 1000).toFixed(3) + ' DT';

  const handleSimulatePayment = async (success: boolean) => {
    setStatus('CONFIRMING');
    try {
      // Server-side simulation: the HMAC secret never reaches the browser.
      const res = await fetch('/api/payments/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider,
          providerReference: ref,
          status: success ? 'SUCCEEDED' : 'FAILED',
          amountMillimes: parseInt(amount, 10),
          currency: 'TND',
        }),
      });
      if (res.ok || success === false) {
        setStatus(success ? 'SUCCESS' : 'CANCELLED');
      } else {
        setStatus('CANCELLED');
      }
    } catch {
      setStatus('CANCELLED');
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-blue-100 shadow-xl max-w-md w-full p-8 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-900 border border-blue-800 text-white flex items-center justify-center mx-auto shadow-xs">
          <Icons.CreditCard className="w-6 h-6 text-blue-300" />
        </div>
        <div className="text-xs font-bold uppercase tracking-widest text-blue-700">
          Passerelle Sécurisée Nationale
        </div>
        <h1 className="text-2xl font-bold text-slate-950 font-serif">Paiement Bancaire / Flouci</h1>
        <p className="text-xs text-slate-500">
          Simulation officielle du traitement monétaire en Dinars Tunisiens (DT).
        </p>
      </div>

      {/* Transaction Summary */}
      <div className="p-5 rounded-2xl bg-blue-50/50 border border-blue-100 space-y-2.5 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">Référence Transaction :</span>
          <span className="font-mono font-bold text-slate-900">{ref}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Montant Débité :</span>
          <span className="font-mono font-bold text-blue-700 text-sm">{formatDT(amount)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Commission Plateforme (20%) :</span>
          <span className="font-mono text-slate-500">
            {((parseInt(amount, 10) * 0.20) / 1000).toFixed(3)} DT (2000 bps)
          </span>
        </div>
        <div className="flex justify-between border-t border-blue-100 pt-1.5">
          <span className="text-slate-600 font-medium">Revenu Net Enseignant (80%) :</span>
          <span className="font-mono font-bold text-blue-900">
            {((parseInt(amount, 10) * 0.80) / 1000).toFixed(3)} DT
          </span>
        </div>
      </div>

      {status === 'PENDING' && (
        <div className="space-y-3">
          <button
            onClick={() => handleSimulatePayment(true)}
            className="w-full py-3.5 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs transition active:scale-95 flex items-center justify-center gap-2"
          >
            <Icons.CheckCircle className="w-4 h-4" />
            <span>Confirmer le Paiement Sécurisé (Carte Bancaire / Flouci)</span>
          </button>

          <button
            onClick={() => handleSimulatePayment(false)}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-600 hover:bg-blue-50/50 font-semibold text-xs transition"
          >
            Simuler un Échec / Annulation
          </button>
        </div>
      )}

      {status === 'CONFIRMING' && (
        <div className="py-6 text-center space-y-3">
          <div className="w-10 h-10 rounded-full border-3 border-blue-200 border-t-blue-700 animate-spin mx-auto" />
          <div className="text-xs font-bold text-slate-900">
            Envoi du Webhook Signé & Enregistrement du Grand Livre...
          </div>
          <p className="text-[11px] text-slate-500">
            Vérification cryptographique HMAC-SHA256 et snapshot de l&apos;année scolaire en cours.
          </p>
        </div>
      )}

      {status === 'SUCCESS' && (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center mx-auto border border-blue-200">
            <Icons.CheckCircle className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-slate-950 font-serif">
            Transaction Validée & Droit d&apos;Accès Octroyé
          </h3>
          <p className="text-xs text-slate-500">
            L&apos;écriture comptable a été enregistrée dans le grand livre avec reversement de 80% à l&apos;auteur.
          </p>
          <Link
            href="/student/library"
            className="block w-full py-3 px-4 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs shadow-xs transition"
          >
            Accéder à Ma Bibliothèque
          </Link>
        </div>
      )}

      {status === 'CANCELLED' && (
        <div className="space-y-4 text-center">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-700 flex items-center justify-center mx-auto border border-red-200">
            <Icons.X className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-slate-900">
            Paiement Non Abouti
          </h3>
          <p className="text-xs text-slate-500">
            Aucun droit d&apos;accès n&apos;a été octroyé (Règle SEC-05). Vous pouvez retenter votre achat.
          </p>
          <Link
            href="/catalogue"
            className="block w-full py-2.5 px-4 rounded-xl bg-blue-700 text-white font-semibold text-xs transition"
          >
            Retourner au Catalogue
          </Link>
        </div>
      )}
    </div>
  );
}

export default function GatewaySimulationPage() {
  return (
    <div className="min-h-[80vh] bg-[#F8FAFC] flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-xs text-slate-500">Chargement de la passerelle...</div>}>
        <GatewaySimulationContent />
      </Suspense>
    </div>
  );
}
