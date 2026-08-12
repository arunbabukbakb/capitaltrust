import React from 'react';
import { LoanPayment } from '../models/LoanPayment';
import { CheckCircle, Trash2 } from 'lucide-react';

interface PaymentRowProps {
  payment: LoanPayment;
  activeTab: 'single' | 'group';
  amountPaid: number; // parent controlled state
  onAmountChange: (amount: number) => void;
  onDeletePayment?: (loanMemberId: number, month: number) => void;
  isMobile?: boolean;
}

const formatDate = (dateStr?: string) => {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const PaymentRow: React.FC<PaymentRowProps> = ({
  payment,
  activeTab,
  amountPaid,
  onAmountChange,
  onDeletePayment,
  isMobile = false,
}) => {
  const {
    userName,
    userId,
    dueAmount,
    interestDue,
    loanNo,
  } = payment;

  // If already approved/finalized in the database, lock it down
  const isFinalized = Boolean(payment.approved || payment.dueStatus === 'Paid' || (payment.amountPaid && payment.amountPaid > 0));

  const activeInterestDue = (interestDue || 0) + (payment.carryForwardInterest || 0);

  // Split dynamically: first interest (current + carryforward), then balance to principal
  const effectiveAmountPaid = isFinalized ? (payment.amountPaid || 0) : amountPaid;
  const calculatedInterest = isFinalized 
    ? (payment.interestAmount ?? Math.round(Math.min(effectiveAmountPaid, activeInterestDue)))
    : Math.round(Math.min(effectiveAmountPaid, activeInterestDue));
  const calculatedPrincipal = isFinalized
    ? (payment.principalAmount ?? Math.round(Math.max(0, effectiveAmountPaid - activeInterestDue)))
    : Math.round(Math.max(0, effectiveAmountPaid - activeInterestDue));

  // Status Badge Helper Component
  const renderStatusBadge = () => {
    const dueStatus = payment.dueStatus || (payment.approved ? 'Paid' : 'Pending');
    if (dueStatus === 'Overdue') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800 shadow-2xs">
          Overdue
        </span>
      );
    }
    if (dueStatus === 'Paid' || payment.approved) {
      return (
        <span className="px-2 py-0.5 rounded-md text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800 shadow-2xs">
          Paid
        </span>
      );
    }
    if (dueStatus === 'Partial') {
      return (
        <span className="px-2 py-0.5 rounded-md text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800 shadow-2xs">
          Partial
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-md text-[9px] md:text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        Pending
      </span>
    );
  };

  if (isMobile) {
    if (activeTab === 'single') {
      return (
        <div className="p-3 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition duration-150 text-[10px] text-slate-700 dark:text-slate-300">
          <div className="space-y-1 flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-mono font-bold text-slate-900 dark:text-slate-100 tracking-tight text-[9px] bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded">{loanNo || '—'}</span>
              <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">{userName || '—'}</span>
              {renderStatusBadge()}
            </div>
            {payment.startDate && (
              <div className="text-[9px] text-slate-400 font-sans">
                Start: <span className="font-medium text-slate-600 dark:text-slate-300">{formatDate(payment.startDate)}</span>
              </div>
            )}
            <div className="flex gap-2 text-slate-500 font-medium font-mono text-[9px] flex-wrap">
              <span>Due: <strong className="text-slate-700 dark:text-slate-300">₹{Math.round(dueAmount || 0)}</strong></span>
              <span>•</span>
              <span>Rate: <strong className="text-indigo-600 dark:text-indigo-400">{payment.interestRate}% ({payment.interestMode})</strong></span>
              <span>•</span>
              <span>Bal: <strong className="text-slate-700 dark:text-slate-300">₹{Math.round(payment.outstandingBalance || 0)}</strong></span>
            </div>
            <div className="flex gap-2 font-mono text-[9px] text-slate-500">
              <span>Int: <strong className="text-amber-600">₹{calculatedInterest}</strong></span>
              <span>•</span>
              <span>Prin: <strong className="text-emerald-600">₹{calculatedPrincipal}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Amount Input */}
            <div className="relative w-20">
              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[9px]">₹</span>
              <input
                type="number"
                disabled={isFinalized || payment.canEdit === false}
                value={isFinalized ? Math.round(payment.amountPaid || 0) : (amountPaid === 0 ? '' : Math.round(amountPaid))}
                onChange={(e) => {
                  if (isFinalized) return;
                  const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
                  onAmountChange(isNaN(val) ? 0 : val);
                }}
                className={`w-full pl-4 pr-1 py-0.5 text-[10px] text-center font-mono font-bold border rounded focus:outline-none focus:ring-1 focus:ring-slate-950 focus:border-transparent transition ${
                  isFinalized 
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-not-allowed'
                    : payment.canEdit === false ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white text-slate-950'
                }`}
                placeholder="0"
              />
            </div>
            {isFinalized && (payment.isLastPayment !== false) && onDeletePayment && (
              <button
                type="button"
                onClick={() => onDeletePayment(payment.loanMemberId!, payment.month)}
                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
                title="Delete last payment and enter new payment"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Group Loan Tab mobile layout
    return (
      <div className="p-3 flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition duration-150 text-[10px] text-slate-700 dark:text-slate-300">
        <div className="space-y-1 flex-1 min-w-0">
          <h5 className="font-bold text-slate-800 dark:text-slate-200 truncate text-[11px]">{userName || '—'}</h5>
          {payment.startDate && (
            <div className="text-[9px] text-slate-400 font-sans">
              Start: <span className="font-medium text-slate-600 dark:text-slate-300">{formatDate(payment.startDate)}</span>
            </div>
          )}
          <div className="flex gap-2 text-slate-500 font-medium font-mono text-[9px] flex-wrap">
            <span>Due: <strong className="text-slate-700 dark:text-slate-300">₹{Math.round(dueAmount || 0)}</strong></span>
            <span>•</span>
            <span>Rate: <strong className="text-indigo-600 dark:text-indigo-400">{payment.interestRate}% ({payment.interestMode})</strong></span>
            <span>•</span>
            <span>Bal: <strong className="text-slate-700 dark:text-slate-300">₹{Math.round(payment.outstandingBalance || 0)}</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* Amount Input */}
          <div className="relative w-20">
            <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-[9px]">₹</span>
            <input
              type="number"
              disabled={isFinalized || payment.canEdit === false}
              value={isFinalized ? Math.round(payment.amountPaid || 0) : (amountPaid === 0 ? '' : Math.round(amountPaid))}
              onChange={(e) => {
                if (isFinalized) return;
                const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
                onAmountChange(isNaN(val) ? 0 : val);
              }}
              className={`w-full pl-4 pr-1 py-0.5 text-[10px] text-center font-mono font-bold border rounded focus:outline-none focus:ring-1 focus:ring-slate-950 focus:border-transparent transition ${
                isFinalized 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-not-allowed'
                  : payment.canEdit === false ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white text-slate-950'
              }`}
              placeholder="0"
            />
          </div>
          {isFinalized && (payment.isLastPayment !== false) && onDeletePayment && (
            <button
              type="button"
              onClick={() => onDeletePayment(payment.loanMemberId!, payment.month)}
              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition cursor-pointer"
              title="Delete last payment and enter new payment"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  if (activeTab === 'single') {
    return (
      <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition duration-200">
        {/* LoanNo & Start Date */}
        <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
          <div className="flex flex-col">
            <span>{loanNo || '—'}</span>
            {payment.startDate && (
              <span className="text-[10px] text-slate-400 font-medium font-sans">
                Start: {formatDate(payment.startDate)}
              </span>
            )}
          </div>
        </td>
        {/* Member */}
        <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
          <div className="flex flex-col">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{userName || '—'}</span>
            <span className="text-xs text-slate-400 font-mono">{userId}</span>
          </div>
        </td>
        {/* Interest Rate */}
        <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
          {payment.interestRate ? `${payment.interestRate}%` : '—'}
          {payment.interestMode && (
            <span className="block text-[10px] text-slate-400 font-medium font-sans">
              ({payment.interestMode})
            </span>
          )}
        </td>
        {/* Outstanding Balance */}
        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono font-semibold">
          ₹{Math.round(payment.outstandingBalance || 0).toLocaleString()}
          {payment.loanAmount && (
            <span className="block text-[10px] text-slate-400 font-medium font-sans">
              of ₹{Math.round(payment.loanAmount).toLocaleString()}
            </span>
          )}
        </td>
        {/* Due */}
        <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono font-semibold">
          ₹{Math.round(dueAmount || 0).toLocaleString()}
        </td>
        {/* Amount */}
        <td className="px-4 py-3 text-sm">
          <div className="relative w-28 mx-auto">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
            <input
              type="number"
              disabled={isFinalized || payment.canEdit === false}
              value={isFinalized ? Math.round(payment.amountPaid || 0) : (amountPaid === 0 ? '' : Math.round(amountPaid))}
              onChange={(e) => {
                if (isFinalized) return;
                const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
                onAmountChange(isNaN(val) ? 0 : val);
              }}
              className={`w-full pl-5 pr-2 py-1 text-sm font-mono font-bold border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition ${
                isFinalized 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-not-allowed'
                  : payment.canEdit === false ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white text-slate-950'
              }`}
              placeholder="0"
            />
          </div>
        </td>
        {/* Interest */}
        <td className="px-4 py-3 text-sm font-mono text-amber-600">
          ₹{calculatedInterest.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          {activeInterestDue > 0 && !isFinalized && (
            <span className="block text-[10px] text-slate-400 font-medium">Cap: ₹{Math.round(activeInterestDue)}</span>
          )}
        </td>
        {/* Principal */}
        <td className="px-4 py-3 text-sm font-mono text-emerald-600">
          ₹{calculatedPrincipal.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </td>
        {/* Processing Indicator / Status Badge & Delete */}
        <td className="px-4 py-3 text-sm text-center">
          <div className="flex items-center justify-center gap-1.5">
            {renderStatusBadge()}
            {isFinalized && (payment.isLastPayment !== false) && onDeletePayment && (
              <button
                type="button"
                onClick={() => onDeletePayment(payment.loanMemberId!, payment.month)}
                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
                title="Delete last payment and enter new payment"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  }

  // Group Loan Tab row layout
  return (
    <tr className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/60 transition duration-200">
      {/* Member */}
      <td className="px-4 py-3 text-sm font-medium text-slate-800 dark:text-slate-200">
        <div className="flex flex-col">
          <span className="font-semibold text-slate-900 dark:text-slate-100">{userName || '—'}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-mono">{userId}</span>
            {payment.startDate && (
              <span className="text-[10px] text-slate-400 font-medium font-sans">
                • Start: {formatDate(payment.startDate)}
              </span>
            )}
          </div>
        </div>
      </td>
      {/* Interest Rate */}
      <td className="px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 font-mono">
        {payment.interestRate ? `${payment.interestRate}%` : '—'}
        {payment.interestMode && (
          <span className="block text-[10px] text-slate-400 font-medium font-sans">
            ({payment.interestMode})
          </span>
        )}
      </td>
      {/* Outstanding Balance */}
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono font-semibold">
        ₹{Math.round(payment.outstandingBalance || 0).toLocaleString()}
        {payment.loanAmount && (
          <span className="block text-[10px] text-slate-400 font-medium font-sans">
            of ₹{Math.round(payment.loanAmount).toLocaleString()}
          </span>
        )}
      </td>
      {/* Due */}
      <td className="px-4 py-3 text-sm text-slate-600 dark:text-slate-300 font-mono font-semibold">
        ₹{Math.round(dueAmount || 0).toLocaleString()}
      </td>
      {/* Amount */}
      <td className="px-4 py-3 text-sm">
        <div className="relative w-28 mx-auto">
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-mono">₹</span>
          <input
            type="number"
            disabled={isFinalized || payment.canEdit === false}
            value={isFinalized ? Math.round(payment.amountPaid || 0) : (amountPaid === 0 ? '' : Math.round(amountPaid))}
            onChange={(e) => {
              if (isFinalized) return;
              const val = e.target.value === '' ? 0 : Math.round(parseFloat(e.target.value));
              onAmountChange(isNaN(val) ? 0 : val);
            }}
            className={`w-full pl-5 pr-2 py-1 text-sm font-mono font-bold border rounded-md focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition ${
              isFinalized 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 cursor-not-allowed'
                : payment.canEdit === false ? 'opacity-40 cursor-not-allowed bg-slate-50' : 'bg-white text-slate-950'
            }`}
            placeholder="0"
          />
        </div>
      </td>
      {/* Status & Delete */}
      <td className="px-4 py-3 text-sm text-center">
        <div className="flex items-center justify-center gap-1.5">
          {renderStatusBadge()}
          {isFinalized && (payment.isLastPayment !== false) && onDeletePayment && (
            <button
              type="button"
              onClick={() => onDeletePayment(payment.loanMemberId!, payment.month)}
              className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded transition cursor-pointer"
              title="Delete last payment and enter new payment"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
};

export default PaymentRow;
