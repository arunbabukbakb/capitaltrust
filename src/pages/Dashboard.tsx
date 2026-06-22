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
  ArrowRight
} from 'lucide-react';

interface DashboardProps {
  user: any;
  onNavigate: (view: string) => void;
}

export default function Dashboard({ user, onNavigate }: DashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExported, setIsExported] = useState(false);

  useEffect(() => {
    // Collect active numbers
    Promise.all([
      fetch("/api/dashboard/stats").then(res => res.ok ? res.json() : null),
      fetch("/api/loans").then(res => res.ok ? res.json() : []),
      fetch("/api/contributions").then(res => res.ok ? res.json() : [])
    ]).then(([statsData, loansData, contributionsData]) => {
      setStats(statsData && !statsData.error ? statsData : null);
      setLoans(Array.isArray(loansData) ? loansData : []);
      setContributions(Array.isArray(contributionsData) ? contributionsData : []);
    }).catch(err => {
      console.error("Dashboard data load error", err);
    });
  }, []);

  const handleExport = () => {
    setIsExported(true);
    setTimeout(() => {
      setIsExported(false);
      setShowExportModal(false);
    }, 1500);
  };

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

      {/* Primary key metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
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
              <h4 className="text-2xl sm:text-4xl font-extrabold font-headline text-tnum text-slate-950 dark:text-slate-50">
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
              <h4 className="text-2xl sm:text-4xl font-extrabold font-headline text-tnum text-slate-950 dark:text-slate-50">
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

        {/* UPCOMING PORTFOLIO EVENTS / AGENDA */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between col-span-1 lg:col-span-2 min-h-[280px] sm:min-h-[340px] transition-colors duration-200">
          <div>
            <div className="flex justify-between items-center mb-3 sm:mb-6">
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Upcoming Payments</span>
              <span className="text-[10px] sm:text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Oct-Nov 2023
              </span>
            </div>

            <div className="space-y-2.5 sm:space-y-4">
              {/* Dynamic Loan Repayments */}
              {activeUserLoans.map((loan) => (
                <div key={loan.id} className="flex justify-between items-center p-2.5 sm:p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-bold text-base sm:text-lg">
                      💰
                    </div>
                    <div>
                      <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">{loan.type || 'Monthly Repayment'}</h5>
                      <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-450">Facility {loan.id} • Due {loan.nextDueDate}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50">
                      ₹{Math.round(loan.principal * 0.01).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </p>
                    <span className="inline-block text-[8px] sm:text-[10px] px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-800 dark:text-indigo-400 rounded font-semibold">
                      Scheduled
                    </span>
                  </div>
                </div>
              ))}

              {activeUserLoans.length === 0 && (
                <div className="text-center py-4 sm:py-6 text-[10px] sm:text-xs text-slate-400 dark:text-slate-500">
                  No active loan repayments scheduled
                </div>
              )}

              {/* Event 2 */}
              <div className="flex justify-between items-center p-2.5 sm:p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-base sm:text-lg">
                    📊
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Capital Pool Top-Up</h5>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Savings Contribution • Voluntary • Due Nov 12, 2023</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50">₹5,000</p>
                  <span className="inline-block text-[8px] sm:text-[10px] px-1.5 py-0.5 bg-yellow-50 dark:bg-yellow-950/20 text-yellow-800 dark:text-yellow-400 rounded font-semibold">
                    Voluntary Request
                  </span>
                </div>
              </div>

              {/* Event 3 */}
              <div className="flex justify-between items-center p-2.5 sm:p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 border border-transparent hover:border-slate-100 dark:hover:border-slate-800 transition-all">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 flex items-center justify-center font-bold text-base sm:text-lg">
                    🗒️
                  </div>
                  <div>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">Annual Compliance Fee</h5>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">Platform Membership • Due Dec 01, 2023</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs sm:text-sm font-bold text-slate-950 dark:text-slate-50">₹1,500</p>
                  <span className="inline-block text-[8px] sm:text-[10px] px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 rounded font-semibold">
                    Invoiced
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <button
              onClick={() => onNavigate('/loan-repayment')}
              className="text-[10px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <span>Manage scheduled repayment protocols</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* QUICK OPERATIONS AND PERFORMANCE CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Performance tracking */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 col-span-1 lg:col-span-2 shadow-sm transition-colors duration-200">
          <div className="flex justify-between items-center mb-4 sm:mb-6">
            <div>
              <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Performance Metric</span>
              <h4 className="text-sm sm:text-lg font-bold text-slate-950 dark:text-slate-550 mt-0.5 sm:mt-1">Quarterly Fund Pool Growth</h4>
            </div>
            <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-100 dark:border-slate-700">
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] bg-white dark:bg-slate-700 rounded shadow-xs font-bold text-slate-950 dark:text-slate-50">Line View</span>
              <span className="px-2 py-0.5 text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:hover:text-slate-100 transition-colors font-semibold cursor-pointer">Log View</span>
            </div>
          </div>

          {/* Handcrafting a highly visual and responsive CSS Bar Charts matrix */}
          <div className="h-32 sm:h-44 flex items-end gap-1 sm:gap-2 md:gap-3 pt-4 sm:pt-6 border-b border-l border-slate-100 dark:border-slate-800 mt-2 sm:mt-4">
            {[34, 48, 41, 62, 59, 78, 92, 110].map((val, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center group cursor-pointer h-full justify-end relative">
                <div className="absolute -top-7 text-[8px] sm:text-[10px] font-bold text-emerald-700 dark:text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-50 dark:bg-emerald-950 px-1.5 py-0.5 rounded shadow-xs whitespace-nowrap z-10 pointer-events-none border dark:border-slate-800">
                  ₹{(val * 1000).toLocaleString() + ""}
                </div>
                <div
                  style={{ height: `${val}%` }}
                  className="w-full bg-slate-900 dark:bg-slate-700 group-hover:bg-emerald-600 dark:group-hover:bg-emerald-500 rounded-t transition-all duration-300 relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-white/5 pointer-events-none" />
                </div>
                <span className="text-[7px] md:text-[9px] font-semibold text-slate-400 mt-1 sm:mt-2 whitespace-nowrap">Q{Math.ceil((idx + 1) / 2)} '2{Math.floor(2 + idx / 4)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors duration-200">
          <div>
            <span className="text-[10px] sm:text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400">Quick Actions</span>
            <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-550 mt-0.5 mb-4 sm:mb-6">Instantly deploy operations across global assets.</p>

            <div className="space-y-2.5 sm:space-y-3">
              <button
                onClick={() => onNavigate('/fund-collection')}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-750 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 rounded-lg">
                    <Coins className="w-3.5 h-3.5 sm:w-4 h-4" />
                  </span>
                  <div className="text-left">
                    <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100">Deploy Pool Contribution</h6>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-medium">Yield-bearing cash reserves</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 h-4 text-slate-400" />
              </button>

              <button
                onClick={() => onNavigate('/loan-entry')}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-750 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 rounded-lg">
                    <Layers className="w-3.5 h-3.5 sm:w-4 h-4" />
                  </span>
                  <div className="text-left">
                    <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100">Request New Facility</h6>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-medium">Submit secure institutional requests</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 h-4 text-slate-400 animate-pulse" />
              </button>

              <button
                onClick={() => setShowExportModal(true)}
                className="w-full flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100/80 dark:hover:bg-slate-750 rounded-xl border border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 transition-all active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <span className="p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
                    <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 h-4" />
                  </span>
                  <div className="text-left">
                    <h6 className="text-xs font-bold text-slate-900 dark:text-slate-100">Export Ledger Statement</h6>
                    <p className="text-[9px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-medium">Download audit-ready PDF/XLSX docs</p>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 sm:w-4 h-4 text-slate-400" />
              </button>
            </div>
          </div>

          <div className="mt-4 sm:mt-6 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-1 text-[9px] sm:text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span>Exchange rate updated 4 mins ago</span>
            </div>
          </div>
        </div>
      </div>

      {/* MARKET INTELLIGENCE BANNER */}
      <div className="bg-slate-950 text-white rounded-xl sm:rounded-2xl p-5 sm:p-8 relative overflow-hidden shadow-xl border border-slate-900">
        {/* Cityscape Dusk graphic simulation overlay using modern vector layout */}
        <div className="absolute right-0 top-0 bottom-0 w-2/5 hidden md:flex items-center justify-center opacity-30 select-none pointer-events-none">
          <svg className="w-full h-full text-white" viewBox="0 0 400 200" fill="currentColor">
            <rect x="20" y="80" width="30" height="120" rx="2" />
            <rect x="60" y="50" width="40" height="150" rx="2" />
            <rect x="110" y="110" width="35" height="90" rx="2" />
            <rect x="155" y="40" width="50" height="160" rx="2" />
            <rect x="215" y="90" width="25" height="110" rx="2" />
            <rect x="250" y="30" width="45" height="170" rx="2" />
            <path d="M 0 170 Q 150 120 400 160 L 400 200 L 0 200 Z" fill="rgba(16, 185, 129, 0.2)" />
          </svg>
        </div>

        <div className="relative z-10 max-w-2xl">
          <span className="text-[8px] sm:text-[9px] font-bold tracking-widest text-[#10b981] bg-[#10b981]/15 px-2 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase">
            Market Intelligence Briefing
          </span>
          <h4 className="text-lg sm:text-2xl font-bold font-headline mt-3 sm:mt-4 text-white">
            Capital Market Outlook October 2026
          </h4>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 sm:mt-2 font-medium leading-relaxed">
            A strategic pivot towards secure yield protocols and structured asset-backed debt reserves has been recorded globally. Underwriters urge fund consolidation.
          </p>
          <div className="mt-4 sm:mt-6 flex flex-wrap gap-3 sm:gap-4 items-center">
            <a
              href="#market-brief"
              className="px-3 py-1.5 sm:px-4 sm:py-2 bg-white text-slate-950 rounded-lg text-[10px] sm:text-xs font-bold hover:bg-slate-100 transition-all cursor-pointer"
            >
              Read Full Report
            </a>
            <span className="text-[10px] sm:text-xs text-slate-500 font-medium">6 minute read • Published today</span>
          </div>
        </div>
      </div>

      {/* LEDGER EXPORT STATEMENT MODAL */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full animate-scale-up">
            <h4 className="text-lg font-bold font-headline text-slate-900 dark:text-slate-100 mb-2">Export Verified Ledger</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Select documentation standard for export simulation:</p>

            <div className="space-y-2 mb-6">
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input type="radio" name="exportFmt" defaultChecked className="text-slate-950 dark:text-slate-200 focus:ring-slate-950" />
                <div>
                  <p className="text-xs font-bold text-slate-950 dark:text-slate-50">Standard Audit PDF / CSV Combo</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Recommended for monthly filings</p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 cursor-pointer">
                <input type="radio" name="exportFmt" className="text-slate-950 dark:text-slate-200 focus:ring-slate-950" />
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Detailed SEC Form 10-K Format</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">Strict regulatory compliance ledger</p>
                </div>
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg text-xs font-bold transition-all text-slate-900 dark:text-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleExport}
                className="flex-1 py-2.5 bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-900 dark:hover:bg-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isExported ? (
                  <>
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span>Done!</span>
                  </>
                ) : (
                  <span>Compile & Export</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
