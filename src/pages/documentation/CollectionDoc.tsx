import React from 'react';
import { Coins, Layers, Activity } from 'lucide-react';

export default function CollectionDoc() {
  return (
    <div className="space-y-4 sm:space-y-6 text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-300 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
          <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Fund Collection Module
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-headline text-slate-900 dark:text-white">
          Fund Collection & Audit Guide
        </h1>
        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-relaxed">
          Complete guide on logging member fund deposits, managing collection types, and reviewing collection audit feeds.
        </p>
      </div>

      {/* Fund Collection Posting */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400" />
          Fund Collection Posting (`/fund-collection`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Record cash, mobile money, or bank transfer deposits collected from members towards savings, shares, or group liquidity pools.
        </p>
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm md:text-base">
          <h3 className="font-bold text-slate-900 dark:text-slate-200">Posting Workflow Steps:</h3>
          <ol className="list-decimal pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
            <li>Select the <strong>Member Account</strong> from the searchable client dropdown.</li>
            <li>Choose the <strong>Collection Type</strong> (e.g. Monthly Savings Deposit, Share Capital, Registration Fee).</li>
            <li>Enter the <strong>Deposit Amount</strong> and select payment mode (Cash, Mobile Money, Bank Transfer).</li>
            <li>Add reference notes/receipt numbers and click <strong>Submit Collection</strong>.</li>
            <li>The system automatically records a transaction audit log under transaction type <code>Collection</code>!</li>
          </ol>
        </div>
      </div>

      {/* Collection Types Master */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400" />
          Collection Type Master (`/collection-types`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Configure active collection categories, deposit fee structures, and account ledger mappings.
        </p>
      </div>

      {/* Collection Audit Summary */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Activity className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500 dark:text-cyan-400" />
          Collection Audit Summary (`/fund-collection-audit`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          View real-time daily collection tallies, agent collection tallies, and audit summary reports with search filters.
        </p>
      </div>
    </div>
  );
}
