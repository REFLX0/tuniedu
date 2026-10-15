'use client';

import React from 'react';
import { FinancialLedgerEntry } from '@/lib/store';

interface SalesLedgerTableProps {
  entries: FinancialLedgerEntry[];
  totalSalesMillimes: number;
  totalCommissionsMillimes: number;
  netEarningsMillimes: number;
  onRequestPayout?: () => void;
}

export function SalesLedgerTable({
  entries,
  totalSalesMillimes,
  totalCommissionsMillimes,
  netEarningsMillimes,
  onRequestPayout,
}: SalesLedgerTableProps) {
  const formatDT = (m: number) => (m / 1000).toFixed(3) + ' DT';

  return (
    <div className="space-y-6">
      {/* Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Gross Sales */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Ventes Brutes (100%)
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {formatDT(totalSalesMillimes)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {totalSalesMillimes} millimes enregistrés
          </div>
        </div>

        {/* Platform Commission 20% */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Commission Plateforme</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 text-[10px] font-bold">
              2000 bps (20%)
            </span>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            -{formatDT(totalCommissionsMillimes)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Frais de passerelle et infrastructure
          </div>
        </div>

        {/* Net Professor Payout Balance */}
        <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">
              Solde Net Auteur (80%)
            </div>
            <div className="text-2xl font-black text-emerald-700 mt-1">
              {formatDT(netEarningsMillimes)}
            </div>
          </div>
          <button
            onClick={onRequestPayout}
            className="mt-3 w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition active:scale-95"
          >
            Demander un Virement RIB
          </button>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Grand Livre Financier (Ledger Immuable)</h3>
            <p className="text-xs text-slate-500">
              Conforme au principe de traçabilité stricte — Aucune réécriture de l&apos;historique
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {entries.length} écritures
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Date & Réf.</th>
                <th className="py-3 px-4 font-semibold">Type d&apos;Écriture</th>
                <th className="py-3 px-4 font-semibold">Description</th>
                <th className="py-3 px-4 font-semibold text-right">Montant (DT)</th>
                <th className="py-3 px-4 font-semibold text-right">Millimes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entries.map((entry) => {
                const isCommission = entry.type === 'PLATFORM_COMMISSION';
                return (
                  <tr key={entry.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-slate-600">
                      <div>{new Date(entry.createdAt).toLocaleDateString('fr-TN')}</div>
                      <div className="text-[10px] text-slate-400">{entry.reference}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          isCommission
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {entry.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-800 font-medium">{entry.description}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono font-bold ${
                        isCommission ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {isCommission ? '-' : '+'}
                      {(entry.amountMillimes / 1000).toFixed(3)} DT
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {entry.amountMillimes} mil.
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
