import React from 'react';
import { CreditCard, CheckCircle2, ArrowDownRight } from 'lucide-react';

export default function LoanDoc() {
  return (
    <div className="space-y-4 sm:space-y-6 text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-purple-600 dark:text-purple-300 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
          <CreditCard className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Loan Management Module
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-headline text-slate-900 dark:text-white">
          Loan Lifecycle & Repayment Guide
        </h1>
        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-relaxed">
          Complete guide covering loan request submission, manager approval workflow, active facility listing, and EMI repayment collections.
        </p>
      </div>

      {/* 1. Loan Entry */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 dark:text-purple-400" />
          1. Loan Request Entry (`/loan-entry`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Submit new credit requests for individual members or solidarity groups.
        </p>
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm md:text-base">
          <h3 className="font-bold text-slate-900 dark:text-slate-200">Request Fields:</h3>
          <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
            <li><strong>Borrower Account</strong>: Selected member profile.</li>
            <li><strong>Loan Amount & Term</strong>: Requested principal amount and repayment duration in months.</li>
            <li><strong>Interest Slab / Interest Rate</strong>: Applied interest scheme.</li>
            <li><strong>Guarantors & Collateral Details</strong>: Upload supporting security documentation.</li>
          </ul>
        </div>
      </div>

      {/* 2. Loan Approval */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400" />
          2. Approval & Disbursement (`/loan-list`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Loan requests require verification and approval by authorized Managers or Admins.
        </p>
        <div className="p-3.5 sm:p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-xs sm:text-sm md:text-base text-indigo-800 dark:text-indigo-300">
          <strong>Important Business Rule:</strong> A transaction audit record of type <code>LoanIssue</code> is automatically recorded in the central ledger ONLY after the loan facility is approved and marked active!
        </div>
      </div>

      {/* 3. Loan Repayment */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <ArrowDownRight className="w-4 h-4 sm:w-5 sm:h-5 text-teal-500 dark:text-teal-400" />
          3. Loan EMI Repayment (`/loan-repayment` & `/loan-repayments`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Collect EMI installments against active loan accounts.
        </p>
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm md:text-base">
          <h3 className="font-bold text-slate-900 dark:text-slate-200">Repayment Collection Process:</h3>
          <ol className="list-decimal pl-4 space-y-1 text-slate-600 dark:text-slate-400">
            <li>Open <strong>Loan Repayment</strong> page and search borrower account or loan facility ID.</li>
            <li>System displays outstanding principal, accrued interest, due date, and recommended installment.</li>
            <li>Enter collection amount and submit repayment.</li>
            <li>System updates outstanding balance and logs <code>LoanRepayment</code> audit transaction!</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
