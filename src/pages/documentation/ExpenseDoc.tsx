import React from 'react';
import { Receipt, CheckCircle2 } from 'lucide-react';

export default function ExpenseDoc() {
  return (
    <div className="space-y-4 sm:space-y-6 text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-full text-amber-600 dark:text-amber-300 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
          <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Expense Management Module
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-headline text-slate-900 dark:text-white">
          Expense Management & Approval Guide
        </h1>
        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-relaxed">
          Complete guide on submitting branch operational expenses, approval workflow policies, status tracking, and transaction ledger logging.
        </p>
      </div>

      {/* Expense Features */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500 dark:text-amber-400" />
          Expenses Overview (`/expenses`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          The Expenses page allows staff to record branch operational costs (e.g. Rent, Office Supplies, Utility Bills, Field Travel Allowances) and track their approval progress.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm md:text-base">
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-200">Recording Expenses</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Click <strong>Add Expense</strong> to submit a claim specifying Title, Category, Amount, Date, and Description.
            </p>
          </div>
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-200">Category Allocations</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Group expenses into preset accounting categories for financial reporting and audit review.
            </p>
          </div>
        </div>
      </div>

      {/* Approval Workflow & Audit Rule */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400" />
          Approval Workflow & Business Audit Rule
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          To maintain strict financial control, expenses follow a multi-tier approval policy:
        </p>
        <div className="space-y-2 text-xs sm:text-sm md:text-base">
          <div className="p-3 sm:p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-800 dark:text-amber-300">
            <strong>Auto-Approval Policy:</strong> Expenses created directly by Administrators or Branch Managers are auto-approved upon entry. Expenses submitted by standard Field Officers remain in <code>Pending</code> status until approved.
          </div>
          <div className="p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-emerald-800 dark:text-emerald-300">
            <strong>Transaction Ledger Logging Rule:</strong> An audit transaction of type <code>Expense</code> is generated in the central ledger ONLY after the expense status transitions to <code>Approved</code>!
          </div>
        </div>
      </div>
    </div>
  );
}
