import React from 'react';
import { FileSpreadsheet, Filter, Layers } from 'lucide-react';

export default function ReportDoc() {
  return (
    <div className="space-y-4 sm:space-y-6 text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 rounded-full text-teal-600 dark:text-teal-300 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
          <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Reporting & Audit Module
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-headline text-slate-900 dark:text-white">
          Reports & Transaction Audit Ledger Guide
        </h1>
        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-relaxed">
          Complete guide on utilizing the central Transaction Audit Ledger, date range filtering, KPI metrics, and server-side paginated tables.
        </p>
      </div>

      {/* Transaction Audit Ledger */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 dark:text-teal-400" />
          Transaction Audit Ledger (`/reports/transactions`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          The Transaction Audit Ledger provides an immutable financial record of all monetary events occurring across your organization.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm md:text-base">
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-200">Transaction Types Tracked:</h3>
            <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-1">
              <li><code>Collection</code>: Member deposit postings.</li>
              <li><code>LoanIssue</code>: Disbursed active loan facilities.</li>
              <li><code>LoanRepayment</code>: Received EMI installment payments.</li>
              <li><code>Expense</code>: Approved branch operational expenses.</li>
            </ul>
          </div>
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-200">Auto-Generated Transaction Numbers</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Each recorded transaction automatically receives a unique identifier (e.g. <code>TXN-10001</code>) and links back to its reference entity ID.
            </p>
          </div>
        </div>
      </div>

      {/* Single-Row Responsive Filters */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Filter className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400" />
          Filter Section & Date Range Features
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          The single-row filter bar allows fast querying across large audit datasets:
        </p>
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm md:text-base">
          <h3 className="font-bold text-slate-900 dark:text-slate-200">Filter Controls & Default Settings:</h3>
          <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400">
            <li><strong>Search Textbox</strong>: Search by Transaction No, Narration notes, or Reference ID.</li>
            <li><strong>Type Dropdown</strong>: Filter by specific transaction category or select All.</li>
            <li><strong>From Date & To Date</strong>: Default date range automatically defaults from 1st of current month to 1st of next month.</li>
            <li><strong>Filter Button</strong>: Applies filters to fetch matched paginated records.</li>
            <li><strong>Reset Button</strong>: Restores default month-long window and clears search fields instantly.</li>
          </ol>
        </div>
      </div>

      {/* KPI Metrics & Summary API */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Layers className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500 dark:text-cyan-400" />
          KPI Metric Tiles & Server-Side Summary
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Four dynamic metric cards summarize total financial liquidity for the matching filter set:
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 text-xs sm:text-sm md:text-base">
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-slate-900 dark:text-slate-200 block mb-0.5">Total Volume</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">Sum of all transaction amounts</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-emerald-600 dark:text-emerald-400 block mb-0.5">Total Inflow</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">Collections + EMI Repayments</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-amber-600 dark:text-amber-400 block mb-0.5">Total Outflow</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">Loan Disbursements + Approved Expenses</span>
          </div>
          <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <span className="font-bold text-indigo-600 dark:text-indigo-400 block mb-0.5">Net Balance</span>
            <span className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs">Inflow minus Outflow</span>
          </div>
        </div>
      </div>
    </div>
  );
}
