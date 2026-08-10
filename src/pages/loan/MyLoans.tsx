import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useTranslation } from 'react-i18next';
import {
  Building,
  Calendar,
  Download,
  CheckCircle,
  ArrowUpRight,
  DollarSign,
  AlertCircle,
  TrendingUp,
  FileText,
  Clock
} from 'lucide-react';

export default function LoanRepayment() {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const [loans, setLoans] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLoanData = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/loans").then(r => r.json()),
      fetch("/api/payments").then(r => r.json())
    ]).then(([lData, pData]) => {
      setLoans(Array.isArray(lData) ? lData : []);
      setPayments(Array.isArray(pData) ? pData : []);
    }).catch(e => {
      console.error("Loan status dashboard fetch error", e);
    }).finally(() => {
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchLoanData();
  }, []);

  // Filter loans that belong to the user
  const userLoans = loans.filter(l => {
    const userIdStr = String(user?.id || '');
    return (
      l.memberId?.split(',').map((id: string) => String(id).trim()).includes(userIdStr) ||
      l.members?.some((m: any) => String(m.userId) === userIdStr)
    );
  });

  const activeUserLoans = userLoans.filter(l => 
    l.status === 'ACTIVE' || l.status === 'Active' || l.status === 'OVERDUE' || l.status === 'Overdue'
  );

  const userLoanIds = new Set([
    ...userLoans.map(l => l.id),
    ...userLoans.map(l => l.loanId)
  ]);

  // Payments related to the user's loans and logged-in user
  const userPayments = payments.filter(p => {
    const userIdStr = String(user?.id || '');
    const isUserLoan = userLoanIds.has(p.loanId);
    const matchesUser = !p.userId || String(p.userId) === userIdStr;
    return isUserLoan && matchesUser;
  });

  // Helper functions to get user-specific share and outstanding principal
  const getMemberShare = (loan: any) => {
    const member = loan.members?.find((m: any) => String(m.userId) === String(user?.id || ''));
    return member ? member.loanShareAmount : loan.principal;
  };

  const getMemberOutstanding = (loan: any) => {
    const member = loan.members?.find((m: any) => String(m.userId) === String(user?.id || ''));
    return member ? member.outstandingPrincipal : loan.outstandingBalance;
  };

  useEffect(() => {
    if (activeUserLoans.length > 0 && !selectedLoanId) {
      // Find the first active loan and select its loanId
      const firstLoan = activeUserLoans[0];
      setSelectedLoanId(firstLoan.loanId || firstLoan.id);
    } else if (userLoans.length > 0 && !selectedLoanId) {
      // Fallback to any loan if no active loans
      const firstLoan = userLoans[0];
      setSelectedLoanId(firstLoan.loanId || firstLoan.id);
    }
  }, [loans, activeUserLoans, userLoans, selectedLoanId]);

  // Selected Loan Facility
  const activeFacility = loans.find(l => l.id === selectedLoanId || l.loanId === selectedLoanId);

  // Selected Loan Payments
  const selectedLoanPayments = userPayments.filter(p => p.loanId === selectedLoanId || p.loanId === (activeFacility?.id || ''));

  // Consolidated summaries for user
  const totalOutstanding = activeUserLoans.reduce((sum, l) => sum + getMemberOutstanding(l), 0);
  const totalPrincipalShare = activeUserLoans.reduce((sum, l) => sum + getMemberShare(l), 0);
  const totalPaymentsMade = userPayments.reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalSelectedLoanPaid = selectedLoanPayments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalSelectedLoanInterest = selectedLoanPayments.reduce((sum, p) => sum + (p.interestPaid || 0), 0);
  const totalSelectedLoanPrincipal = selectedLoanPayments.reduce((sum, p) => sum + (p.principalPaid || 0), 0);

  const selectedMemberInfo = activeFacility?.members?.find((m: any) => String(m.userId) === String(user?.id || ''));
  const selectedMemberShare = selectedMemberInfo ? selectedMemberInfo.loanShareAmount : (activeFacility?.principal || 0);
  const selectedMemberOutstanding = selectedMemberInfo ? selectedMemberInfo.outstandingPrincipal : (activeFacility?.outstandingBalance || 0);

  const getCurrentInterestRate = () => {
    if (!activeFacility) return '0%';
    if (activeFacility.interestMode === 'Fixed' || !activeFacility.interestMode || activeFacility.interestMode === 'Fixed Rate') {
      return activeFacility.interestRate ? `${activeFacility.interestRate}%` : '0%';
    }
    if (activeFacility.slabs && Array.isArray(activeFacility.slabs)) {
      const matchingSlab = activeFacility.slabs.find(
        (s: any) => selectedMemberOutstanding >= s.fromAmount && selectedMemberOutstanding <= s.toAmount
      );
      if (matchingSlab) {
        return `${matchingSlab.interestRate}%`;
      }
    }
    return activeFacility.interestRate ? `${activeFacility.interestRate}%` : 'Variable slabs';
  };

  const parseYearMonth = (dateStr?: string) => {
    if (!dateStr) return null;
    const clean = String(dateStr).trim().split('T')[0];
    const parts = clean.split(/[-/.]/);
    if (parts.length >= 3) {
      if (parts[0].length === 4) {
        return { year: parseInt(parts[0], 10), month: parseInt(parts[1], 10) };
      } else if (parts[2].length === 4) {
        return { year: parseInt(parts[2], 10), month: parseInt(parts[1], 10) };
      }
    }
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return { year: d.getFullYear(), month: d.getMonth() + 1 };
    }
    return null;
  };

  const getProperRemainingTenure = () => {
    if (!activeFacility) return 0;
    
    const isExisting = activeFacility.openingDate && 
                      String(activeFacility.openingDate).trim() !== '' && 
                      String(activeFacility.openingDate).trim() !== String(activeFacility.startDate).trim();

    const openDateStr = isExisting ? activeFacility.openingDate : activeFacility.startDate;
    
    const openym = parseYearMonth(openDateStr);
    const endym = parseYearMonth(activeFacility.endDate);

    let initialRemainingMonths = Number(activeFacility.tenureMonths || 0);

    if (openym && endym) {
      const diff = (endym.year - openym.year) * 12 + (endym.month - openym.month);
      if (diff >= 0) {
        initialRemainingMonths = diff;
      }
    }

    const paidCount = selectedLoanPayments.length;
    return Math.max(0, initialRemainingMonths - paidCount);
  };

  return (
    <div className="animate-fade-in text-slate-900 mt-16 sm:mt-20 mb-8 px-3 space-y-6">
      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-slate-500 mt-3 font-semibold">Syncing facility details...</p>
        </div>
      ) : userLoans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center max-w-xl mx-auto space-y-3">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">No Credit Facilities Registered</h3>
          <p className="text-xs text-slate-500">
            We couldn't locate any active commercial credit loans associated with your account profile. Contact support if this is an error.
          </p>
        </div>
      ) : (
        <>
          {/* TOP SECTION: MY TOTAL LOAN SUMMARY CARD */}
          <div className="bg-gradient-to-r from-blue-950 to-indigo-950 text-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl border border-blue-900/50 relative overflow-hidden">
            {/* Abstract background graphics */}
            <div className="absolute right-0 top-0 bottom-0 w-1/4 hidden lg:flex items-center justify-around opacity-10 select-none pointer-events-none">
              <div className="w-3.5 h-full bg-white rounded-t" />
              <div className="w-3.5 h-full bg-white rounded-t" />
              <div className="w-3.5 h-full bg-white rounded-t" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <span className="text-[9px] uppercase font-bold tracking-widest text-blue-300 block">
                  {t('loanPage.myLoans')}
                </span>
                <p className="text-xs text-blue-200 mt-0.5 max-w-xl">
                  {t('loanPage.myLoansSub')}
                </p>
                <h4 className="text-base sm:text-xl font-bold font-headline mt-1.5 text-white leading-tight">
                  My Active Credit Summary
                </h4>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5 hidden sm:block">
                  Personalized liability calculation underwritten by CapitalTrust Group
                </p>
              </div>

              <div className="text-left md:text-right flex-shrink-0">
                <span className="text-[8px] sm:text-[9px] uppercase tracking-wider text-slate-400 block font-bold">Total Outstanding Principal Balance</span>
                <p className="text-xl sm:text-3xl font-extrabold font-headline text-[#10b981] mt-1 text-tnum">
                  ₹{Math.round(totalOutstanding).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Key parameters metrics grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 mt-4 pt-4 border-t border-white/10 relative z-10">
              <div>
                <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Active Facilities</p>
                <p className="text-xs sm:text-sm font-bold font-headline mt-0.5 text-white">
                  {activeUserLoans.length} of {userLoans.length} Loans
                </p>
              </div>
              <div>
                <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Principal Limit</p>
                <p className="text-xs sm:text-sm font-bold font-headline mt-0.5 text-white font-mono">
                  ₹{Math.round(totalPrincipalShare).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Repaid</p>
                <p className="text-xs sm:text-sm font-bold font-headline mt-0.5 text-emerald-400 font-mono">
                  ₹{Math.round(totalPaymentsMade).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Standing Status</p>
                <div className="flex items-center gap-1 mt-0.5 text-emerald-400 font-bold text-xs sm:text-sm">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span>EXCELLENT</span>
                </div>
              </div>
            </div>
          </div>

          {/* MIDDLE SECTION: LOAN DROPDOWN FILTER */}
          <div className="bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
                Select Credit Facility
              </label>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                Facility Audit Selector
              </h3>
            </div>
            
            <div className="w-full sm:max-w-md">
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950/20 focus:border-slate-950 cursor-pointer bg-white"
              >
                {userLoans.map((l) => {
                  const oBal = getMemberOutstanding(l);
                  return (
                    <option key={l.loanId || l.id} value={l.loanId || l.id}>
                      {l.loanNo} ({l.loanType || 'Commercial'} Loan) - Active Outstanding: ₹{Math.round(oBal).toLocaleString()}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* BOTTOM SECTION: SELECTED LOAN DETAILS & LEDGER HISTORY */}
          {activeFacility ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                     {/* Left Column: Selected Loan Summary */}
              <div className="lg:col-span-12 bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-[9px] uppercase font-extrabold tracking-widest text-slate-400">Selected Facility Summary</span>
                  <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase ${activeFacility.status === 'Active' || activeFacility.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-indigo-50 text-indigo-800'
                    }`}>
                    {activeFacility.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4 pt-1">
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-455 uppercase font-bold block">Loan Facility No</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                      {activeFacility.loanNo}
                    </p>
                  </div>

                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-455 uppercase font-bold block">Loan Type / Mode</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {activeFacility.type || `${activeFacility.loanType} Facility`} • {activeFacility.interestMode || "Fixed Rate"}
                    </p>
                  </div>

                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-455 uppercase font-bold block">Your Share Outstanding</span>
                    <p className="text-xs sm:text-sm font-extrabold text-emerald-600 mt-0.5 text-tnum">
                      ₹{Math.round(selectedMemberOutstanding).toLocaleString()}
                    </p>
                    {activeFacility.loanType === 'Group' && (
                      <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                        Group Pool: ₹{Math.round(activeFacility.outstandingBalance).toLocaleString()}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-455 uppercase font-bold block">Your Share Principal</span>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 font-mono">
                      ₹{Math.round(selectedMemberShare).toLocaleString()}
                    </p>
                  </div>

                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-455 uppercase font-bold block">Interest Rate (APR)</span>
                    <p className="text-xs sm:text-sm font-bold text-emerald-600 mt-0.5">
                      {getCurrentInterestRate()}
                    </p>
                  </div>

                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-455 uppercase font-bold block">Remaining / Total Tenure</span>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                      {getProperRemainingTenure()} / {activeFacility.tenureMonths} Months
                    </p>
                    {activeFacility.openingDate && activeFacility.openingDate !== activeFacility.startDate && (
                      <span className="text-[9px] text-amber-600 font-semibold block mt-0.5">
                        (Remaining from Opening Date: {activeFacility.openingDate})
                      </span>
                    )}
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[8px] sm:text-[9px] text-slate-455 uppercase font-bold block">Start / End Date</span>
                    <p className="text-xs font-bold text-slate-600 mt-0.5 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span>{activeFacility.startDate} to {activeFacility.endDate}</span>
                    </p>
                    {activeFacility.openingDate && activeFacility.openingDate !== activeFacility.startDate && (
                      <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                        Opening Date: {activeFacility.openingDate}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Right Column: Selected Loan Payment History */}
              <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex flex-row justify-between items-center bg-slate-50/40 dark:bg-slate-800/40">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold font-headline">Selected Loan Repayment ledger</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Payment receipts and amortization entries for #{activeFacility.loanNo}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-2.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all text-slate-700 bg-white cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>

                {/* Ledger Desktop Table */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-700">
                        <th className="py-2.5 px-4 pl-5 uppercase tracking-wider text-[9px] sm:text-[10px]">Tx ID</th>
                        <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px]">Processing Date</th>
                        <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Interest Rate</th>
                        <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Interest Paid</th>
                        <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Principal Paid</th>
                        <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Total Paid</th>
                        <th className="py-2.5 px-4 pr-5 uppercase tracking-wider text-[9px] sm:text-[10px] text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedLoanPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                          <td className="py-2.5 px-4 pl-5 font-semibold text-slate-900 font-mono text-tnum">
                            #{pay.id}
                          </td>
                          <td className="py-2.5 px-4 font-semibold font-mono">{pay.date}</td>
                          <td className="py-2.5 px-4 text-right font-semibold font-mono text-slate-600 text-tnum">
                            {pay.interestRate !== undefined ? `${pay.interestRate}%` : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold font-mono text-amber-600 text-tnum">
                            ₹{Math.round(pay.interestPaid || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-right font-semibold font-mono text-emerald-600 text-tnum">
                            ₹{Math.round(pay.principalPaid || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold font-headline text-slate-950 font-mono text-tnum">
                            ₹{Math.round(pay.amount).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 pr-5 text-center">
                            <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-100">
                              {pay.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {selectedLoanPayments.length === 0 && (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium italic">
                            No ledger transactions recorded for this credit facility.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {selectedLoanPayments.length > 0 && (
                      <tfoot className="bg-slate-50 border-t border-slate-200/80 font-bold text-slate-950 text-xs">
                        <tr className="border-t border-slate-100">
                          <td colSpan={3} className="py-3 px-4 pl-5 text-slate-500 font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
                            Total Till Date
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-600 text-tnum text-[11px] sm:text-xs">
                            ₹{Math.round(totalSelectedLoanInterest).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-600 text-tnum text-[11px] sm:text-xs">
                            ₹{Math.round(totalSelectedLoanPrincipal).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-950 text-tnum text-[11px] sm:text-xs">
                            ₹{Math.round(totalSelectedLoanPaid).toLocaleString()}
                          </td>
                          <td className="py-3 px-4 pr-5 text-center text-slate-400">
                            —
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>

                {/* Ledger Mobile List View */}
                <div className="block sm:hidden divide-y divide-slate-100">
                  {selectedLoanPayments.map((pay) => (
                    <div key={pay.id} className="p-3 flex justify-between items-center text-xs hover:bg-slate-50/50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">#{pay.id} • {pay.type}</p>
                        <p className="text-[10px] text-slate-400 font-semibold font-mono">{pay.date}</p>
                        <div className="flex gap-2 text-[10px] font-mono text-slate-500 pt-0.5">
                          <span>Rate: <strong className="text-slate-700">{pay.interestRate !== undefined ? `${pay.interestRate}%` : '—'}</strong></span>
                          <span>•</span>
                          <span>Int: <strong className="text-amber-600">₹{Math.round(pay.interestPaid || 0)}</strong></span>
                          <span>•</span>
                          <span>Prin: <strong className="text-emerald-600">₹{Math.round(pay.principalPaid || 0)}</strong></span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-extrabold font-headline text-slate-950 font-mono text-tnum text-xs">
                          ₹{Math.round(pay.amount).toLocaleString()}
                        </p>
                        <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[9px] font-bold border border-emerald-100">
                          {pay.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {selectedLoanPayments.length > 0 && (
                    <div className="p-3 bg-slate-50/60 border-t border-slate-150 flex justify-between items-center text-xs text-slate-700 font-bold gap-2">
                      <div>
                        <span className="text-slate-400 block text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold">Total Interest</span>
                        <span className="font-bold font-mono text-amber-600 text-[11px] sm:text-xs">
                          ₹{Math.round(totalSelectedLoanInterest).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold">Total Principal</span>
                        <span className="font-bold font-mono text-emerald-600 text-[11px] sm:text-xs">
                          ₹{Math.round(totalSelectedLoanPrincipal).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[8px] sm:text-[9px] uppercase tracking-wider font-extrabold">Total Paid</span>
                        <span className="font-bold font-mono text-slate-950 text-[11px] sm:text-xs">
                          ₹{Math.round(totalSelectedLoanPaid).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedLoanPayments.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs font-medium italic">
                      No ledger transactions recorded for this credit facility.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl p-8 border border-slate-200 shadow-sm text-center">
              <FileText className="w-10 h-10 text-slate-350 mx-auto" />
              <p className="text-slate-500 text-xs font-bold mt-2">No Active Facility Selected</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Please choose an active loan facility to view details.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
