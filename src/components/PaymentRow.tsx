import React from 'react';
import { LoanPayment } from '../models/LoanPayment';
import { CheckCircle } from 'lucide-react';

interface PaymentRowProps {
  payment: LoanPayment;
  activeTab: 'single' | 'group';
  amountPaid: number; // parent controlled state
  onAmountChange: (amount: number) => void;
  isMobile?: boolean;
}

const PaymentRow: React.FC<PaymentRowProps> = ({
  payment,
  activeTab,
  amountPaid,
  onAmountChange,
  isMobile = false,
}) => {
  const {
    userName,
    userId,
    dueAmount,
    interestDue,
    loanNo,
  } = payment;

  const activeInterestDue = interestDue || 0;

  // Split dynamically: first interest, then balance to principal
  const calculatedInterest = Math.round(Math.min(amountPaid, activeInterestDue));
  const calculatedPrincipal = Math.round(Math.max(0, amountPaid - activeInterestDue));

  // If already approved/finalized in the database, lock it down
  const isFinalized = payment.approved;

  if (isMobile) {
    if (activeTab === 'single') {
      return (
        <div className="p-3 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition duration-150 text-[10px] text-slate-700 dark:text-slate-300">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-slate-900 tracking-tight text-[9px] bg-slate-100 px-1 py-0.5 rounded">{loanNo || '—'}</span>
              <span className="font-bold text-slate-800 truncate text-[11px]">{userName || '—'}</span>
            </div>
            <div className="flex gap-2 text-slate-500 font-medium font-mono text-[9px] flex-wrap">
              <span>Due: <strong className="text-slate-700">₹{Math.round(dueAmount || 0)}</strong></span>
              <span>•</span>
              <span>Rate: <strong className="text-indigo-600">{payment.interestRate}% ({payment.interestMode})</strong></span>
              <span>•</span>
              <span>Bal: <strong className="text-slate-700">₹{Math.round(payment.outstandingBalance || 0)}</strong></span>
            </div>
            <div className="flex gap-2 font-mono text-[9px] text-slate-500">
              <span>Int: <strong className="text-amber-600">₹{calculatedInterest}</strong></span>
              <span>•</span>
              <span>Prin: <strong className="text-emerald-600">₹{calculatedPrincipal}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Amount Input */}
            <div className="relative w-20">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[9px]">₹</span>
              <input
                type="number"
                disabled={payment.canEdit === false}
                value={amountPaid === 0 ? '' : Math.round(amountPaid)}
                onChange={(e) => {
                  const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
                  onAmountChange(isNaN(val) ? 0 : val);
                }}
                className={`w-full pl-4 pr-1 py-0.5 text-[10px] text-center font-mono border rounded focus:outline-none focus:ring-1 focus:ring-slate-950 focus:border-transparent transition text-slate-950 ${payment.canEdit === false ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white'}`}
                placeholder="0"
              />
            </div>
            {isFinalized && (
              <span className="text-emerald-600 font-semibold flex items-center gap-0.5 text-[9px] ml-1">
                <CheckCircle className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      );
    }

    // Group Loan Tab mobile layout
    return (
      <div className="p-3 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition duration-150 text-[10px] text-slate-700 dark:text-slate-300">
        <div className="space-y-1 flex-1 min-w-0">
          <h5 className="font-bold text-slate-800 truncate text-[11px]">{userName || '—'}</h5>
          <div className="flex gap-2 text-slate-500 font-medium font-mono text-[9px] flex-wrap">
            <span>Due: <strong className="text-slate-700">₹{Math.round(dueAmount || 0)}</strong></span>
            <span>•</span>
            <span>Rate: <strong className="text-indigo-600">{payment.interestRate}% ({payment.interestMode})</strong></span>
            <span>•</span>
            <span>Bal: <strong className="text-slate-700">₹{Math.round(payment.outstandingBalance || 0)}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Amount Input */}
          <div className="relative w-20">
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[9px]">₹</span>
            <input
              type="number"
              disabled={payment.canEdit === false}
              value={amountPaid === 0 ? '' : Math.round(amountPaid)}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
                onAmountChange(isNaN(val) ? 0 : val);
              }}
              className={`w-full pl-4 pr-1 py-0.5 text-[10px] text-center font-mono border rounded focus:outline-none focus:ring-1 focus:ring-slate-950 focus:border-transparent transition text-slate-950 ${payment.canEdit === false ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white'}`}
              placeholder="0"
            />
          </div>
          {isFinalized && (
            <span className="text-emerald-600 font-semibold flex items-center gap-0.5 text-[9px] ml-1">
              <CheckCircle className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'single') {
    return (
      <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition duration-200">
        {/* LoanNo */}
        <td className="px-4 py-3 text-sm font-semibold text-slate-700 font-mono">
          {loanNo || '—'}
        </td>
        {/* Member */}
        <td className="px-4 py-3 text-sm font-medium text-slate-800">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900">{userName || '—'}</span>
            <span className="text-xs text-slate-400 font-mono">{userId}</span>
          </div>
        </td>
        {/* Interest Rate */}
        <td className="px-4 py-3 text-sm font-semibold text-slate-700 font-mono">
          {payment.interestRate ? `${payment.interestRate}%` : '—'}
          {payment.interestMode && (
            <span className="block text-[10px] text-slate-400 font-medium font-sans">
              ({payment.interestMode})
            </span>
          )}
        </td>
        {/* Outstanding Balance */}
        <td className="px-4 py-3 text-sm text-slate-600 font-mono font-semibold">
          ₹{Math.round(payment.outstandingBalance || 0).toLocaleString()}
          {payment.loanAmount && (
            <span className="block text-[10px] text-slate-400 font-medium font-sans">
              of ₹{Math.round(payment.loanAmount).toLocaleString()}
            </span>
          )}
        </td>
        {/* Due */}
        <td className="px-4 py-3 text-sm text-slate-600 font-mono font-semibold">
          ₹{Math.round(dueAmount || 0).toLocaleString()}
        </td>
        {/* Amount */}
        <td className="px-4 py-3 text-sm">
          <div className="relative w-28 mx-auto">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
            <input
              type="number"
              disabled={payment.canEdit === false}
              value={amountPaid === 0 ? '' : Math.round(amountPaid)}
              onChange={(e) => {
                const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
                onAmountChange(isNaN(val) ? 0 : val);
              }}
              className={`w-full pl-5 pr-2 py-1 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition text-slate-950 ${payment.canEdit === false ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white'}`}
              placeholder="0"
            />
          </div>
        </td>
        {/* Interest */}
        <td className="px-4 py-3 text-sm font-mono text-amber-600">
          ₹{calculatedInterest.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          {activeInterestDue > 0 && (
            <span className="block text-[10px] text-slate-400 font-medium">Cap: ₹{Math.round(activeInterestDue)}</span>
          )}
        </td>
        {/* Principal */}
        <td className="px-4 py-3 text-sm font-mono text-emerald-600">
          ₹{calculatedPrincipal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </td>
        {/* Processing Indicator */}
        <td className="px-4 py-3 text-sm text-center">
          {isFinalized && (
            <span className="text-emerald-655 font-bold flex items-center justify-center gap-1 text-[11px]">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              Posted
            </span>
          )}
        </td>
      </tr>
    );
  }

  // Group Loan Tab row layout
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition duration-200">
      {/* Member */}
      <td className="px-4 py-3 text-sm font-medium text-slate-800">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900">{userName || '—'}</span>
          <span className="text-xs text-slate-400 font-mono">{userId}</span>
        </div>
      </td>
      {/* Interest Rate */}
      <td className="px-4 py-3 text-sm font-semibold text-slate-700 font-mono">
        {payment.interestRate ? `${payment.interestRate}%` : '—'}
        {payment.interestMode && (
          <span className="block text-[10px] text-slate-400 font-medium font-sans">
            ({payment.interestMode})
          </span>
        )}
      </td>
      {/* Outstanding Balance */}
      <td className="px-4 py-3 text-sm text-slate-600 font-mono font-semibold">
        ₹{Math.round(payment.outstandingBalance || 0).toLocaleString()}
        {payment.loanAmount && (
          <span className="block text-[10px] text-slate-400 font-medium font-sans">
            of ₹{Math.round(payment.loanAmount).toLocaleString()}
          </span>
        )}
      </td>
      {/* Due */}
      <td className="px-4 py-3 text-sm text-slate-600 font-mono font-semibold">
        ₹{Math.round(dueAmount || 0).toLocaleString()}
      </td>
      {/* Amount */}
      <td className="px-4 py-3 text-sm">
        <div className="relative w-28 mx-auto">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
          <input
            type="number"
            disabled={payment.canEdit === false}
            value={amountPaid === 0 ? '' : Math.round(amountPaid)}
            onChange={(e) => {
              const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
              onAmountChange(isNaN(val) ? 0 : val);
            }}
            className={`w-full pl-5 pr-2 py-1 text-sm font-mono border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition text-slate-950 ${payment.canEdit === false ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white'}`}
            placeholder="0"
          />
        </div>
      </td>
      {/* Status */}
      <td className="px-4 py-3 text-sm text-center">
        {isFinalized && (
          <span className="text-emerald-655 font-bold flex items-center justify-center gap-1 text-[11px]">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            Posted
          </span>
        )}
      </td>
    </tr>
  );
};

export default PaymentRow;
