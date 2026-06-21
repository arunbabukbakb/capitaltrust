import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
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
  const userLoans = loans.filter(l =>
    l.memberId?.split(',').map((id: string) => id.trim()).includes(user?.id) ||
    l.members?.some((m: any) => m.userId === user?.id)
  );

  const activeUserLoans = userLoans.filter(l => 
    l.status === 'ACTIVE' || l.status === 'Active' || l.status === 'OVERDUE' || l.status === 'Overdue'
  );

  const userLoanIds = new Set([
    ...userLoans.map(l => l.id),
    ...userLoans.map(l => l.loanId)
  ]);

  // Payments related to the user's loans
  const userPayments = payments.filter(p => userLoanIds.has(p.loanId));

  // Helper functions to get user-specific share and outstanding principal
  const getMemberShare = (loan: any) => {
    const member = loan.members?.find((m: any) => m.userId === user?.id);
    return member ? member.loanShareAmount : loan.principal;
  };

  const getMemberOutstanding = (loan: any) => {
    const member = loan.members?.find((m: any) => m.userId === user?.id);
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

  const selectedMemberInfo = activeFacility?.members?.find((m: any) => m.userId === user?.id);
  const selectedMemberShare = selectedMemberInfo ? selectedMemberInfo.loanShareAmount : (activeFacility?.principal || 0);
  const selectedMemberOutstanding = selectedMemberInfo ? selectedMemberInfo.outstandingPrincipal : (activeFacility?.outstandingBalance || 0);

  return (
    <div className="animate-fade-in text-slate-900 mt-16 sm:mt-20 mb-8 px-3 sm:px-4 max-w-7xl mx-auto space-y-6">
      
      {/* Dashboard Title Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-headline text-slate-900 tracking-tight flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-slate-950" />
            My Loan Status Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time standing overview of your credit lines, personalized amortization summary, and payment receipts.
          </p>
        </div>
        <div className="flex-shrink-0 text-xs text-slate-400 font-semibold bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
          <Clock className="w-3.5 h-3.5" />
          <span>Last compiled: Just now</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
          <div className="inline-block w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
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
          <div className="bg-slate-950 text-white rounded-xl sm:rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-900 relative overflow-hidden">
            {/* Abstract background graphics */}
            <div className="absolute right-0 top-0 bottom-0 w-1/4 hidden lg:flex items-center justify-around opacity-10 select-none pointer-events-none">
              <div className="w-3.5 h-full bg-white rounded-t" />
              <div className="w-3.5 h-full bg-white rounded-t" />
              <div className="w-3.5 h-full bg-white rounded-t" />
            </div>

            <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] sm:text-[9px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded font-bold uppercase tracking-widest">
                    Portfolio Active
                  </span>
                  <span className="text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider">
                    Consolidated Overview
                  </span>
                </div>
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
              <div className="lg:col-span-5 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                  <span className="text-[9px] uppercase font-extrabold tracking-widest text-slate-400">Selected Facility Summary</span>
                  <span className={`px-2 py-0.5 text-[8px] font-bold rounded-full uppercase ${activeFacility.status === 'Active' || activeFacility.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-800'
                    : 'bg-indigo-50 text-indigo-800'
                    }`}>
                    {activeFacility.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-450 uppercase font-bold block">Account ID</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono truncate">
                      {activeFacility.loanId || activeFacility.id}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-450 uppercase font-bold block">Loan Facility No</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5 font-mono">
                      {activeFacility.loanNo}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-450 uppercase font-bold block">Loan Type</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {activeFacility.type || `${activeFacility.loanType} Facility`}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-450 uppercase font-bold block">Interest Mode</span>
                    <p className="text-xs font-bold text-slate-900 mt-0.5">
                      {activeFacility.interestMode || "Fixed Rate"}
                    </p>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <span className="text-[8px] sm:text-[9px] text-slate-450 uppercase font-bold block">Your Share Outstanding Principal</span>
                  <p className="text-xl sm:text-2xl font-extrabold font-headline text-emerald-600 mt-0.5 text-tnum">
                    ₹{Math.round(selectedMemberOutstanding).toLocaleString()}
                  </p>
                  {activeFacility.loanType === 'Group' && (
                    <span className="text-[9px] text-slate-400 font-medium block mt-0.5">
                      Total Group Pool Outstanding: ₹{Math.round(activeFacility.outstandingBalance).toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-450 uppercase font-bold block">Your Share Principal</span>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5 font-mono">
                      ₹{Math.round(selectedMemberShare).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-450 uppercase font-bold block">Interest Rate (APR)</span>
                    <p className="text-xs sm:text-sm font-bold text-emerald-600 mt-0.5">
                      {activeFacility.interestRate ? `${activeFacility.interestRate}%` : 'Variable slabs'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-450 uppercase font-bold block">Remaining Tenure</span>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                      {activeFacility.remainingTerm} Months
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-450 uppercase font-bold block">Total Tenure</span>
                    <p className="text-xs sm:text-sm font-bold text-slate-900 mt-0.5">
                      {activeFacility.tenureMonths} Months
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-455 uppercase font-bold block">Start Date</span>
                    <p className="text-xs font-bold text-slate-600 mt-0.5 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {activeFacility.startDate}
                    </p>
                  </div>
                  <div>
                    <span className="text-[8px] sm:text-[9px] text-slate-455 uppercase font-bold block">End Date</span>
                    <p className="text-xs font-bold text-slate-600 mt-0.5 flex items-center gap-1 font-mono">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {activeFacility.endDate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Selected Loan Payment History */}
              <div className="lg:col-span-7 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-100 flex flex-row justify-between items-center bg-slate-50/40">
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
                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-100">
                        <th className="py-2.5 px-4 pl-5 uppercase tracking-wider text-[9px] sm:text-[10px]">Tx ID</th>
                        <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px]">Processing Date</th>
                        <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Interest Paid</th>
                        <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Principal Paid</th>
                        <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Total Paid</th>
                        <th className="py-2.5 px-4 pr-5 uppercase tracking-wider text-[9px] sm:text-[10px] text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedLoanPayments.map((pay) => (
                        <tr key={pay.id} className="hover:bg-slate-50/50 transition">
                          <td className="py-2.5 px-4 pl-5 font-semibold text-slate-900 font-mono text-tnum">
                            #{pay.id}
                          </td>
                          <td className="py-2.5 px-4 font-semibold font-mono">{pay.date}</td>
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
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-medium italic">
                            No ledger transactions recorded for this credit facility.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {selectedLoanPayments.length > 0 && (
                      <tfoot className="bg-slate-50 border-t border-slate-200/80 font-bold text-slate-950 text-xs">
                        <tr className="border-t border-slate-100">
                          <td colSpan={2} className="py-3 px-4 pl-5 text-slate-500 font-bold uppercase tracking-wider text-[9px] sm:text-[10px]">
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
                    <div key={pay.id} className="p-3 flex justify-between items-center text-[10px] hover:bg-slate-50/50 transition">
                      <div className="space-y-0.5">
                        <p className="font-bold text-slate-900">#{pay.id} • {pay.type}</p>
                        <p className="text-[9px] text-slate-400 font-semibold font-mono">{pay.date}</p>
                        <div className="flex gap-2 text-[9px] font-mono text-slate-500 pt-0.5">
                          <span>Int: <strong className="text-amber-600">₹{Math.round(pay.interestPaid || 0)}</strong></span>
                          <span>•</span>
                          <span>Prin: <strong className="text-emerald-600">₹{Math.round(pay.principalPaid || 0)}</strong></span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <p className="font-extrabold font-headline text-slate-950 font-mono text-tnum">
                          ₹{Math.round(pay.amount).toLocaleString()}
                        </p>
                        <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[8px] font-bold border border-emerald-100">
                          {pay.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {selectedLoanPayments.length > 0 && (
                    <div className="p-3 bg-slate-50/60 border-t border-slate-150 flex justify-between items-center text-[10px] text-slate-700 font-bold gap-2">
                      <div>
                        <span className="text-slate-400 block text-[7px] sm:text-[8px] uppercase tracking-wider font-extrabold">Total Interest</span>
                        <span className="font-bold font-mono text-amber-600 text-[10px] sm:text-xs">
                          ₹{Math.round(totalSelectedLoanInterest).toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[7px] sm:text-[8px] uppercase tracking-wider font-extrabold">Total Principal</span>
                        <span className="font-bold font-mono text-emerald-600 text-[10px] sm:text-xs">
                          ₹{Math.round(totalSelectedLoanPrincipal).toLocaleString()}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[7px] sm:text-[8px] uppercase tracking-wider font-extrabold">Total Paid</span>
                        <span className="font-bold font-mono text-slate-950 text-[10px] sm:text-xs">
                          ₹{Math.round(totalSelectedLoanPaid).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  )}
                  {selectedLoanPayments.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-[10px] font-medium italic">
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
