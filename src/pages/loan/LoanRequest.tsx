import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useTranslation } from 'react-i18next';
import {
  Calculator,
  Send,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  Coins,
  ArrowRight,
  Sparkles,
  Info
} from 'lucide-react';

interface LoanRequestItem {
  id: string;
  loanNo: string;
  amount: number;
  status: string;
  createdDate?: string;
  startDate?: string;
}

export default function LoanRequest() {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);

  // Form State - Members input AMOUNT only to submit
  const [requestAmount, setRequestAmount] = useState<number>(50000);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // EMI Calculator State (Local interactive estimation only - NOT saved to DB)
  const [calcAmount, setCalcAmount] = useState<number>(50000);
  const [calcTenureMonths, setCalcTenureMonths] = useState<number>(12);
  const [calcInterestRate, setCalcInterestRate] = useState<number>(12);

  // History of requests by member
  const [myRequests, setMyRequests] = useState<LoanRequestItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Keep calculator amount synced when user updates request amount
  const handleRequestAmountChange = (val: number) => {
    setRequestAmount(val);
    setCalcAmount(val);
  };

  // EMI Calculation Logic
  const monthlyRate = calcInterestRate / (12 * 100);
  const emi =
    calcAmount > 0 && calcTenureMonths > 0
      ? monthlyRate > 0
        ? Math.round(
            (calcAmount * monthlyRate * Math.pow(1 + monthlyRate, calcTenureMonths)) /
              (Math.pow(1 + monthlyRate, calcTenureMonths) - 1)
          )
        : Math.round(calcAmount / calcTenureMonths)
      : 0;

  const totalPayable = emi * calcTenureMonths;
  const totalInterest = Math.max(0, totalPayable - calcAmount);
  const principalPercentage = totalPayable > 0 ? Math.round((calcAmount / totalPayable) * 100) : 100;
  const interestPercentage = 100 - principalPercentage;

  // Fetch Member's Requests History (Logged-in user ONLY)
  const fetchMyRequests = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/loans?my=true');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          // Filter to ensure only logged-in user's loans are displayed
          const userLoans = data.filter((l: any) => {
            if (!user?.id) return true;
            if (Array.isArray(l.members) && l.members.some((m: any) => m.userId === user.id)) return true;
            if (typeof l.memberId === 'string' && l.memberId.includes(user.id)) return true;
            return false;
          });

          // Map loans format to local items
          const mapped: LoanRequestItem[] = userLoans.map((l: any) => ({
            id: l.loanId || l.id,
            loanNo: l.loanNo || l.id,
            amount: l.amount || l.principal || 0,
            status: l.status || 'Pending',
            startDate: l.startDate || l.nextDueDate,
          }));
          setMyRequests(mapped);
        }
      }
    } catch (err) {
      console.error('Failed to load my requests history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, [user?.id]);

  // Submit Form - Sends ONLY amount to the backend
  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!requestAmount || requestAmount <= 0) {
      setToast({ type: 'error', message: 'Please enter a valid loan amount greater than zero.' });
      return;
    }

    setSubmitting(true);
    setToast(null);

    try {
      // NOTE: Only amount is passed in request payload per business rule.
      // Tenure & interest calculations are strictly for member preview in EMI calculator.
      const res = await fetch('/api/loans/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: requestAmount }),
      });

      const data = await res.json();

      if (res.ok) {
        setToast({
          type: 'success',
          message: data.message || `Loan request submitted successfully! (Reference: ${data.loanNo || 'Pending'})`,
        });
        await fetchMyRequests();
      } else {
        setToast({ type: 'error', message: data.error || 'Failed to submit loan request.' });
      }
    } catch (err: any) {
      setToast({ type: 'error', message: 'An error occurred while submitting your loan request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const tenureOptions = [6, 12, 18, 24, 36, 48, 60];

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto animate-fade-in space-y-3 md:space-y-6 mt-16 select-none">

      {/* Toast Alert */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-3 animate-slide-in text-xs md:text-sm font-medium ${
            toast.type === 'success'
              ? 'bg-slate-900 border-emerald-500/50 text-white'
              : 'bg-slate-900 border-rose-500/50 text-white'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-5 shadow-sm flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 md:p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            <Coins className="w-4 h-4 md:w-5 md:h-5" />
          </div>
          <div>
            <h2 className="text-base md:text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight">
              {t('loanPage.loanRequest')}
            </h2>
            <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t('loanPage.loanRequestSub')}
            </p>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Instant Submission</span>
        </div>
      </div>

      {/* Main Grid: Left = Request Form + EMI Calculator, Right = History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-6">

        {/* Left Column: Form & EMI Calculator (8 Cols) */}
        <div className="lg:col-span-8 space-y-3 md:space-y-6">

          {/* Card 1: Loan Request Submission Form (Amount ONLY) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm">
            <form onSubmit={handleSubmitRequest} className="space-y-3">
              <div>
                <label className="block text-[10px] md:text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  {t('loanPage.requestedAmount')}
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 font-mono text-base md:text-lg font-bold">
                    ₹
                  </span>
                  <input
                    type="number"
                    min="1000"
                    step="1000"
                    required
                    value={requestAmount || ''}
                    onChange={(e) => handleRequestAmountChange(Number(e.target.value))}
                    placeholder="Enter amount (e.g. 50000)"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 md:py-3.5 pl-8 md:pl-9 pr-3 text-base md:text-lg font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-950 dark:focus:ring-slate-400 transition"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {[10000, 25000, 50000, 100000, 200000].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleRequestAmountChange(preset)}
                      className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-lg border transition cursor-pointer ${
                        requestAmount === preset
                          ? 'bg-slate-950 text-white border-slate-950 dark:bg-white dark:text-slate-950 dark:border-white'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
                      }`}
                    >
                      ₹{preset.toLocaleString('en-IN')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Shortened Submit Button */}
              <button
                type="submit"
                disabled={submitting || !requestAmount || requestAmount <= 0}
                className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold py-2.5 md:py-3 px-4 rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-900 dark:hover:bg-slate-100 active:scale-[0.99] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Request</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Card 2: Interactive EMI Calculator (Inputs ONLY, NO Sliders) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm space-y-4">
            <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <Calculator className="w-4 h-4 md:w-5 md:h-5 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-sm md:text-base font-bold font-headline text-slate-900 dark:text-slate-100">
                  EMI Calculator
                </h3>
              </div>
              <div className="hidden md:flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                <Info className="w-3.5 h-3.5" />
                <span>Estimate only (Tenure not saved on submission)</span>
              </div>
            </header>

            {/* Calculator Numeric Input Fields (No Sliders) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              {/* Amount Input */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  value={calcAmount || ''}
                  onChange={(e) => setCalcAmount(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs md:text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Interest Rate Input */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Interest Rate (% p.a.)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={calcInterestRate || ''}
                  onChange={(e) => setCalcInterestRate(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs md:text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>

              {/* Tenure Input */}
              <div className="space-y-1">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Tenure (Months)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={calcTenureMonths || ''}
                  onChange={(e) => setCalcTenureMonths(Number(e.target.value))}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs md:text-sm font-mono font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                />
              </div>
            </div>

            {/* Quick Tenure Selection Pills */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tenureOptions.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setCalcTenureMonths(m)}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg border transition cursor-pointer ${
                    calcTenureMonths === m
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  {m}M
                </button>
              ))}
            </div>

            {/* Calculated Results Display Box */}
            <div className="p-3 md:p-4 rounded-xl md:rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white space-y-3 shadow-lg">
              <div className="grid grid-cols-3 gap-2 text-left">
                <div>
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400">Monthly EMI</span>
                  <div className="text-sm md:text-xl font-mono font-bold text-emerald-400 mt-0.5">
                    ₹{emi.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Interest</span>
                  <div className="text-xs md:text-base font-mono font-bold text-amber-400 mt-0.5">
                    ₹{totalInterest.toLocaleString('en-IN')}
                  </div>
                </div>

                <div>
                  <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Payable</span>
                  <div className="text-xs md:text-base font-mono font-bold text-white mt-0.5">
                    ₹{totalPayable.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1 pt-1.5 border-t border-slate-800/80">
                <div className="flex justify-between text-[9px] font-mono text-slate-400">
                  <span>Principal: {principalPercentage}%</span>
                  <span>Interest: {interestPercentage}%</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                  <div style={{ width: `${principalPercentage}%` }} className="bg-emerald-500 h-full transition-all duration-300" />
                  <div style={{ width: `${interestPercentage}%` }} className="bg-amber-500 h-full transition-all duration-300" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Requests History (4 Cols) */}
        <div className="lg:col-span-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-5 shadow-sm space-y-3 h-full flex flex-col">
            <header className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2.5">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="text-xs md:text-sm font-bold font-headline text-slate-900 dark:text-slate-100">
                  My Loan Requests
                </h3>
              </div>
              <button
                type="button"
                onClick={fetchMyRequests}
                className="text-[9px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 font-bold uppercase cursor-pointer"
              >
                Refresh
              </button>
            </header>

            {loadingHistory ? (
              <div className="py-6 text-center text-xs text-slate-400 space-y-2">
                <div className="w-4 h-4 border-2 border-slate-900 dark:border-slate-100 border-t-transparent rounded-full animate-spin mx-auto" />
                <span>Loading requests...</span>
              </div>
            ) : myRequests.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400 space-y-1.5">
                <Clock className="w-6 h-6 text-slate-300 dark:text-slate-700 mx-auto" />
                <p>No loan requests submitted yet.</p>
              </div>
            ) : (
              <div className="space-y-2 overflow-y-auto max-h-[400px] pr-1">
                {myRequests.map((req) => (
                  <div
                    key={req.id}
                    className="p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-1 hover:border-slate-300 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-[11px]">
                        {req.loanNo}
                      </span>
                      <span
                        className={`text-[9px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md ${
                          req.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : req.status === 'Pending'
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : req.status === 'Closed'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                            : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                        }`}
                      >
                        {req.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-500">Amount:</span>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        ₹{Number(req.amount).toLocaleString('en-IN')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

