import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ArrowUpRight,
  Calendar,
  Layers,
  Coins,
  CreditCard,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Receipt
} from 'lucide-react';

import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface DashboardProps {
  user: any;
  onNavigate: (view: string) => void;
}

export default function Dashboard({ user, onNavigate }: DashboardProps) {
  const { companySettings } = useSelector((state: RootState) => state.auth);
  const [stats, setStats] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [todayExpenseSummary, setTodayExpenseSummary] = useState<{ totalAmount: number; count: number; totalLoggedCount: number }>({
    totalAmount: 0,
    count: 0,
    totalLoggedCount: 0
  });

  // Calculate AMC Due status
  const amcRecord = companySettings?.amcRecord;
  let amcDaysRemaining: number | null = null;
  let showAmcAlert = false;
  if (amcRecord && amcRecord.dueDate && amcRecord.paidStatus === 'Pending') {
    const dueTime = new Date(amcRecord.dueDate).getTime();
    const nowTime = new Date().getTime();
    amcDaysRemaining = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
    if (amcDaysRemaining <= 10) {
      showAmcAlert = true;
    }
  }

  useEffect(() => {
    // Collect active numbers
    Promise.all([
      fetch("/api/dashboard/stats").then(res => res.ok ? res.json() : null),
      fetch("/api/loans").then(res => res.ok ? res.json() : []),
      fetch("/api/contributions").then(res => res.ok ? res.json() : []),
      fetch("/api/expenses/today-summary").then(res => res.ok ? res.json() : { totalAmount: 0, count: 0, totalLoggedCount: 0 })
    ]).then(([statsData, loansData, contributionsData, todaySummary]) => {
      setStats(statsData && !statsData.error ? statsData : null);
      setLoans(Array.isArray(loansData) ? loansData : []);
      setContributions(Array.isArray(contributionsData) ? contributionsData : []);
      setTodayExpenseSummary(todaySummary || { totalAmount: 0, count: 0, totalLoggedCount: 0 });
    }).catch(err => {
      console.error("Dashboard data load error", err);
    });
  }, []);



  // Find all active loans for the logged-in user
  const userLoans = loans.filter(l => 
    l.memberId?.split(',').map((id: string) => id.trim()).includes(user?.id) ||
    l.members?.some((m: any) => m.userId === user?.id)
  );

  const activeUserLoans = userLoans.filter(l => l.status === 'ACTIVE' || l.status === 'Active' || l.status === 'OVERDUE' || l.status === 'Overdue');

  const totalOutstandingBalance = activeUserLoans.reduce((sum, l) => sum + l.outstandingBalance, 0);
  const totalPrincipal = activeUserLoans.reduce((sum, l) => sum + l.principal, 0);
  const totalPaid = activeUserLoans.reduce((sum, l) => sum + l.paidToDate, 0);
  const percentPaid = totalPrincipal > 0 ? Math.round((totalPaid / totalPrincipal) * 100) : 0;
  const totalLoansCount = userLoans.length;

  // Personal contributions total (all returned items are COMPLETED from the new MemberCollection-based API)
  const personalContributionsSum = contributions.reduce((acc, curr) => acc + curr.amount, 0);
  const lastCollectionDate = contributions.length > 0 ? contributions[0].date : null;

  const calculateEMI = (principal: number, annualInterestRate: number, tenureMonths: number) => {
    const monthlyRate = (annualInterestRate || 12) / 12 / 100;
    if (monthlyRate === 0) {
      return tenureMonths ? principal / tenureMonths : 0;
    }
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
      (Math.pow(1 + monthlyRate, tenureMonths) - 1);
    return Math.round(emi);
  };

  const getNextPaymentDueDate = (startDateStr: string, repaymentCount: number) => {
    if (!startDateStr) return 'TBD';
    const date = new Date(startDateStr);
    date.setMonth(date.getMonth() + (repaymentCount || 0) + 1);
    return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
  };

  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in mt-16 sm:mt-20 mb-5 px-3 sm:px-0">
      {/* Welcome banner and system status */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div>
          <h3 className="text-lg sm:text-2xl font-bold font-headline text-slate-900 dark:text-slate-100">
            Welcome back, {user?.fullName.split(' ')[0] || 'Member'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Review your institutional credit facilities, active cash balance, and contribution health.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full text-[10px] sm:text-xs font-semibold border border-emerald-100 dark:border-emerald-900/50 flex-shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>CapitalTrust Core Services: Operational</span>
        </div>
      </div>

      {/* AMC Charge Warning Alert Banner (When due in <= 10 days) */}
      {showAmcAlert && amcRecord && amcDaysRemaining !== null && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border border-amber-500/40 rounded-xl sm:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl shrink-0 mt-0.5 sm:mt-0">
              <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-2">
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-headline">
                  Annual Maintenance Charge (AMC) Due Notice
                </h4>
                <span className="text-[9px] sm:text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 uppercase">
                  {amcDaysRemaining < 0 ? `Overdue by ${Math.abs(amcDaysRemaining)} days` : `Due in ${amcDaysRemaining} days`}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your organization's AMC charge of <strong className="text-slate-900 dark:text-white">₹{amcRecord.amcCharge?.toFixed(2)}</strong> is due on{' '}
                <strong className="text-slate-900 dark:text-white">
                  {new Date(amcRecord.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </strong>. Please complete payment to avoid service suspension.
              </p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('/amc-payment')}
            className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer transform hover:scale-[1.02] active:scale-[0.98]"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay AMC Charge Now</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Primary key metric cards (3 Tiles in a row) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        {/* Metric CARD 1: Credit Facility Balance */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
                Active Loan Balance
              </span>
              <span className="p-1 sm:p-1.5 bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-lg">
                <CreditCard className="w-3.5 h-3.5 sm:w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <h4 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-headline text-tnum text-slate-950 dark:text-slate-50">
                ₹{totalOutstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-450 mt-1 sm:mt-2 font-medium">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-0.5">
                  <TrendingUp className="w-3 sm:w-3.5 h-3 sm:h-3.5" />
                  {activeUserLoans.length > 0 ? `${activeUserLoans[0].interestRate}% APR` : "0% APR"}
                </span>
                <span>• {totalLoansCount} Total Loans</span>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-8 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              {activeUserLoans.length > 0 ? (
                `Next payment due ${activeUserLoans[0].nextDueDate}`
              ) : (
                "No active repayments"
              )}
            </span>
            <button
              onClick={() => onNavigate('/loan-repayment')}
              className="text-[10px] sm:text-xs font-bold text-slate-950 dark:text-slate-300 dark:hover:text-emerald-400 hover:text-emerald-700 flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>View Details</span>
              <ArrowUpRight className="w-3 h-3 sm:w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metric CARD 2: Active Capital Pool contribution */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
                Total Fund Contributions
              </span>
              <span className="p-1 sm:p-1.5 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 rounded-lg">
                <Coins className="w-3.5 h-3.5 sm:w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <h4 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-headline text-tnum text-slate-950 dark:text-slate-50">
                ₹{personalContributionsSum.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-450 mt-1 sm:mt-2 font-medium">
                <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold">
                  {contributions.length} Collection{contributions.length !== 1 ? 's' : ''}
                </span>
                <span>{lastCollectionDate ? `Last: ${lastCollectionDate}` : 'No collections yet'}</span>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-8 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              Daily compounding interest enabled
            </span>
            <button
              onClick={() => onNavigate('/fund-collection')}
              className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 hover:text-emerald-800 flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>+ Add Capital</span>
              <ArrowUpRight className="w-3 h-3 sm:w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Metric CARD 3: Current Day Expense (Fetched directly from API) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[8px] sm:text-[10px] uppercase font-bold tracking-widest text-slate-500 dark:text-slate-400">
                Today's Expenses
              </span>
              <span className="p-1 sm:p-1.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 rounded-lg">
                <Receipt className="w-3.5 h-3.5 sm:w-4 h-4" />
              </span>
            </div>
            <div className="mt-2 sm:mt-4">
              <h4 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold font-headline text-tnum text-slate-950 dark:text-slate-50">
                ₹{Number(todayExpenseSummary.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h4>
              <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-slate-500 dark:text-slate-450 mt-1 sm:mt-2 font-medium">
                <span className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 px-1.5 py-0.5 rounded text-[8px] sm:text-[10px] font-bold">
                  {todayExpenseSummary.count} Entry{todayExpenseSummary.count !== 1 ? 'ies' : ''} Today
                </span>
                <span>• Total {todayExpenseSummary.totalLoggedCount} Logged</span>
              </div>
            </div>
          </div>

          <div className="mt-4 sm:mt-8 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
            <span className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
              Operational expenditure
            </span>
            <button
              onClick={() => onNavigate('/expenses')}
              className="text-[10px] sm:text-xs font-bold text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 hover:text-indigo-800 flex items-center gap-0.5 transition-colors cursor-pointer"
            >
              <span>View Expenses</span>
              <ArrowUpRight className="w-3 h-3 sm:w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Repayment and Agenda breakdown section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* REPAYMENT PROGRESS GAUGE (Circular) */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col items-center justify-between text-center min-h-[280px] sm:min-h-[340px] transition-colors duration-200">
          <div className="w-full flex justify-between items-center mb-3 sm:mb-4">
            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Repayment Progress</span>
            <span className="text-[9px] sm:text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 px-2 py-0.5 rounded font-bold uppercase">
              {activeUserLoans.length === 1 ? `Facility #${activeUserLoans[0].id}` : 'All Active'}
            </span>
          </div>

          <div className="relative flex items-center justify-center my-2 sm:my-4">
            {/* SVG Circular Progress Bar representing paid status */}
            <svg viewBox="0 0 176 176" className="w-32 h-32 sm:w-44 sm:h-44 transform -rotate-90">
              <circle
                cx="88"
                cy="88"
                r="72"
                stroke="#f1f5f9"
                className="stroke-slate-100 dark:stroke-slate-800"
                strokeWidth="14"
                fill="transparent"
              />
              <circle
                cx="88"
                cy="88"
                r="72"
                stroke="#059669"
                strokeWidth="14"
                fill="transparent"
                strokeDasharray={452}
                strokeDashoffset={452 - (452 * percentPaid) / 100}
                className="transition-all duration-1000 ease-out"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl sm:text-3xl font-extrabold font-headline text-slate-950 dark:text-slate-50">{percentPaid}%</span>
              <span className="text-[8px] sm:text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-widest font-bold">Principal Paid</span>
            </div>
          </div>

          <div className="w-full text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 border-t border-slate-100 dark:border-slate-800 pt-3 sm:pt-4 space-y-1">
            <div className="flex justify-between font-medium">
              <span>Repaid to date:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">₹{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex justify-between font-medium animate-pulse">
              <span>Remaining schedule:</span>
              <span className="font-bold text-slate-900 dark:text-slate-100">₹{totalOutstandingBalance.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
            </div>
          </div>
        </div>

        {/* UPCOMING LOANS & COLLECTIONS */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between col-span-1 lg:col-span-2 min-h-[280px] sm:min-h-[340px] transition-colors duration-200">
          <div>
            <div className="flex justify-between items-center mb-3 sm:mb-6">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">
                Upcoming Payments & Collections
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Schedule
              </span>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {/* Dynamic Loan Repayments */}
              {activeUserLoans.map((loan) => {
                const emi = calculateEMI(loan.principal, loan.interestRate || 12, loan.tenureMonths || 12);
                const nextDue = getNextPaymentDueDate(loan.startDate, loan.repaymentCount || 0);
                const isOverdue = loan.status?.toLowerCase() === 'overdue';

                return (
                  <div
                    key={loan.id}
                    onClick={() => onNavigate('/loan-repayment')}
                    className="flex justify-between items-center p-2.5 sm:p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 ${
                        isOverdue
                          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                          {loan.loanNo || loan.id} EMI Repayment
                        </h5>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                          {loan.type || `${loan.loanType || 'Loan'} Facility`} • Due {nextDue}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50">
                        ₹{emi.toLocaleString()}
                      </p>
                      <span className={`inline-block text-[8px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        isOverdue
                          ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50'
                          : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/50'
                      }`}>
                        {isOverdue ? 'Overdue' : 'Scheduled'}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Fund Collections */}
              {contributions.slice(0, 3).map((contrib) => (
                <div
                  key={contrib.id}
                  onClick={() => onNavigate('/fund-collection')}
                  className="flex justify-between items-center p-2.5 sm:p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-100 dark:border-slate-800/80 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-base shrink-0">
                      <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                        Capital Pool Collection
                      </h5>
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                        {contrib.method || 'Direct Transfer'} • {contrib.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50">
                      ₹{Number(contrib.amount || 0).toLocaleString()}
                    </p>
                    <span className="inline-block text-[8px] sm:text-[10px] px-2 py-0.5 rounded-full font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                      {contrib.status || 'Completed'}
                    </span>
                  </div>
                </div>
              ))}

              {activeUserLoans.length === 0 && contributions.length === 0 && (
                <div className="text-center py-8 text-xs text-slate-400 dark:text-slate-500 font-medium space-y-1">
                  <Calendar className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto" />
                  <p>No upcoming loan repayments or collections scheduled.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] sm:text-xs">
            <button
              onClick={() => onNavigate('/loan-repayment')}
              className="font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Repayments</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('/fund-collection')}
              className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>View Collections</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
