import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Printer,
  Download,
  Search,
  UserCheck,
  Calendar,
  Filter,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  DollarSign,
  CreditCard,
  Building2,
  Phone,
  Mail,
  RefreshCw,
  Clock,
  BookOpen,
  FileText,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { generateMemberPassbookPDF } from '../../templates/reports/passbookPdfTemplate';

interface MemberProfile {
  id: string;
  fullName: string;
  memberNumber: string;
  email?: string;
  phoneNumber?: string;
  status: string;
  profileImage?: string;
}

interface MemberGroup {
  id: number;
  name: string;
  code: string;
}

interface FinancialSummary {
  savingsBalance: number;
  loanOutstanding: number;
  totalPaid: number;
  currentDue: number;
}

interface SavingsSummary {
  openingBalance: number;
  totalContributions: number;
  totalWithdrawals: number;
  currentBalance: number;
}

interface LoanSummary {
  totalLoans: number;
  activeLoans: number;
  totalBorrowed: number;
  principalPaid: number;
  outstandingPrincipal: number;
  interestPaid: number;
  interestDue: number;
}

interface LoanItem {
  loanMemberId: number;
  loanId: string;
  loanNo: string;
  loanType: string;
  loanAmount: number;
  outstandingPrincipal: number;
  interestDue: number;
  status: string;
  startDate: string;
  endDate: string;
  interestMode: string;
  interestRate: number;
}

interface PassbookTransaction {
  rawId?: number;
  date: string;
  reference: string;
  type: string;
  particulars: string;
  credit: number;
  debit: number;
  balance: number;
  meetingId?: number;
  meetingNo?: string;
}

interface PassbookData {
  member: MemberProfile;
  groups: MemberGroup[];
  summary: FinancialSummary;
  savings: SavingsSummary;
  loanSummary: LoanSummary;
  loans: LoanItem[];
  recentTransactions: PassbookTransaction[];
}

export default function MemberPassbook() {
  const { memberId: routeMemberId } = useParams<{ memberId?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Active member ID (route or search query or selection)
  const selectedMemberId = routeMemberId || searchParams.get('memberId') || '';

  // Company settings for PDF
  const [companySettings, setCompanySettings] = useState<any>(null);

  // Passbook State
  const [passbookData, setPassbookData] = useState<PassbookData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Filters State
  const [selectedGroupId, setSelectedGroupId] = useState<string>('All');
  const [dateFilterPreset, setDateFilterPreset] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Active Navigation Tab
  const [activeTab, setActiveTab] = useState<'overview' | 'savings' | 'loans' | 'transactions'>('overview');

  // Loan Section Selected Loan
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');

  // Transactions Section Paginated State
  const [transactions, setTransactions] = useState<PassbookTransaction[]>([]);
  const [txnLoading, setTxnLoading] = useState<boolean>(false);
  const [txnTypeFilter, setTxnTypeFilter] = useState<string>('All');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  // Members list for dropdown
  const [membersList, setMembersList] = useState<any[]>([]);

  // Fetch Members List for selection
  useEffect(() => {
    fetch('/api/users')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        setMembersList(data);
        if (!selectedMemberId && data.length > 0) {
          setSearchParams({ memberId: data[0].id });
        }
      })
      .catch(() => { });
  }, []);

  // Fetch Company Settings
  useEffect(() => {
    fetch('/api/settings/company')
      .then(res => res.ok ? res.json() : null)
      .then(data => setCompanySettings(data))
      .catch(() => { });
  }, []);

  // Helper for formatting local date to YYYY-MM-DD
  const formatLocalDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Handle Preset Date Filter Changes
  const handlePresetChange = (preset: string) => {
    setDateFilterPreset(preset);
    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = formatLocalDate(firstDay);
      end = formatLocalDate(now);
    } else if (preset === 'lastMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
      start = formatLocalDate(firstDay);
      end = formatLocalDate(lastDay);
    } else if (preset === 'thisFY') {
      const year = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      start = `${year}-04-01`;
      end = `${year + 1}-03-31`;
    } else if (preset === 'lastFY') {
      const year = now.getMonth() >= 3 ? now.getFullYear() - 1 : now.getFullYear() - 2;
      start = `${year}-04-01`;
      end = `${year + 1}-03-31`;
    } else if (preset === 'all') {
      start = '';
      end = '';
    }

    setStartDate(start);
    setEndDate(end);
  };

  // Fetch Consolidated Passbook Data (SINGLE REQUEST)
  useEffect(() => {
    if (!selectedMemberId) return;

    const fetchPassbookData = async () => {
      try {
        setLoading(true);
        setError('');
        let url = `/api/members/${selectedMemberId}/passbook?`;
        if (selectedGroupId !== 'All') url += `groupId=${selectedGroupId}&`;
        if (startDate) url += `startDate=${startDate}&`;
        if (endDate) url += `endDate=${endDate}&`;

        const res = await fetch(url);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to load member passbook.');
        }

        const data: PassbookData = await res.json();
        setPassbookData(data);

        // Pre-select first loan if available
        if (data.loans && data.loans.length > 0) {
          setSelectedLoanId(data.loans[0].loanId);
        }
      } catch (err: any) {
        setError(err.message || 'Error loading passbook');
        setPassbookData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPassbookData();
  }, [selectedMemberId, selectedGroupId, startDate, endDate]);

  // Fetch Paginated Transactions when member, group, date range or transaction filters change
  useEffect(() => {
    if (!selectedMemberId) return;

    const fetchPaginatedTransactions = async () => {
      try {
        setTxnLoading(true);
        let url = `/api/members/${selectedMemberId}/passbook/transactions?page=${page}&limit=100&`;
        if (selectedGroupId !== 'All') url += `groupId=${selectedGroupId}&`;
        if (startDate) url += `startDate=${startDate}&`;
        if (endDate) url += `endDate=${endDate}&`;
        if (txnTypeFilter !== 'All') url += `type=${encodeURIComponent(txnTypeFilter)}&`;

        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setTransactions(data.items || []);
          setTotalPages(data.pagination?.totalPages || 1);
        }
      } catch (err) {
        console.error("Error fetching transactions:", err);
      } finally {
        setTxnLoading(false);
      }
    };

    fetchPaginatedTransactions();
  }, [selectedMemberId, selectedGroupId, startDate, endDate, txnTypeFilter, page]);

  // Member Selection Callback from Autocomplete
  const handleSelectMember = (user: any) => {
    if (user && user.id) {
      if (routeMemberId) {
        navigate(`/members/${user.id}/passbook`);
      } else {
        setSearchParams({ memberId: user.id });
      }
    }
  };

  // PDF Generation / Print Action Handler
  const handlePDFAction = (action: 'print' | 'download' | 'open' = 'print') => {
    if (!passbookData) return;
    const dateLabel = dateFilterPreset !== 'custom'
      ? dateFilterPreset.toUpperCase()
      : (startDate && endDate ? `${startDate} to ${endDate}` : 'All Time');

    generateMemberPassbookPDF(
      {
        companySettings,
        member: passbookData.member,
        groups: passbookData.groups,
        summary: passbookData.summary,
        savings: passbookData.savings,
        loanSummary: passbookData.loanSummary,
        transactions: transactions.length > 0 ? transactions : passbookData.recentTransactions,
        dateRangeLabel: dateLabel
      },
      action
    );
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto px-2 sm:px-4 mt-16 sm:mt-20">
      {/* Top Header & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Member Passbook
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Simple, chronological financial statement for members
            </p>
          </div>
        </div>

        {/* Member Selector Dropdown */}
        <div className="w-full md:w-80">
          <select
            value={selectedMemberId}
            onChange={(e) => {
              const id = e.target.value;
              if (routeMemberId) {
                navigate(`/members/${id}/passbook`);
              } else {
                setSearchParams({ memberId: id });
              }
            }}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-200 outline-none shadow-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Select Member --</option>
            {membersList.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName} ({m.memberNumber || `CT-${m.id}`})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Empty Selection Prompt if no member selected */}
      {!selectedMemberId && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
            <UserCheck className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Select a Member</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Use the search bar above to select a member and view their financial passbook statement.
            </p>
          </div>
        </div>
      )}

      {/* Loading Skeleton */}
      {selectedMemberId && loading && (
        <div className="space-y-6 animate-pulse">
          {/* Member Header Skeleton */}
          <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          {/* Summary Cards Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
            <div className="h-24 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
          </div>
          {/* Body Skeleton */}
          <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
        </div>
      )}

      {/* Error View */}
      {selectedMemberId && !loading && error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl p-6 text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-rose-900 dark:text-rose-200">Unable to load member passbook</h3>
            <p className="text-xs text-rose-600 dark:text-rose-400">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Passbook Content */}
      {selectedMemberId && !loading && passbookData && (
        <div className="space-y-6">

          {/* 1. Member Header */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              {/* Photo / Avatar */}
              <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-indigo-500 flex items-center justify-center shrink-0 font-bold text-xl text-indigo-600 dark:text-indigo-400 overflow-hidden">
                {passbookData.member.profileImage ? (
                  <img src={passbookData.member.profileImage} alt={passbookData.member.fullName} className="w-full h-full object-cover" />
                ) : (
                  passbookData.member.fullName.substring(0, 2).toUpperCase()
                )}
              </div>

              {/* Member Details */}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
                    {passbookData.member.fullName}
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 text-xs font-mono font-bold">
                    {passbookData.member.memberNumber}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-300 text-xs font-bold">
                    {passbookData.member.status}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 flex-wrap">
                  <span>
                    Groups:{' '}
                    {passbookData.groups && passbookData.groups.length > 0 ? (
                      <strong className="text-slate-700 dark:text-slate-200">
                        {passbookData.groups.map(g => g.name).join(', ')}
                      </strong>
                    ) : (
                      'None'
                    )}
                  </span>
                  {passbookData.member.phoneNumber && (
                    <span className="flex items-center gap-1 font-mono">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {passbookData.member.phoneNumber}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Print & PDF Actions */}
            <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
              <button
                onClick={() => handlePDFAction('print')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition"
              >
                <Printer className="w-4 h-4" />
                Print
              </button>
              <button
                onClick={() => handlePDFAction('download')}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="sm:hidden">PDF</span>
                <span className="hidden sm:inline">Download PDF</span>
              </button>
            </div>
          </div>

          {/* 2. Financial Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            {/* Savings Balance */}
            <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                Savings Balance
              </span>
              <div className="text-xl sm:text-2xl font-black text-emerald-900 dark:text-emerald-100">
                ₹{Math.round(passbookData.summary.savingsBalance).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400">Current Savings</p>
            </div>

            {/* Loan Outstanding */}
            <div className="bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Loan Outstanding
              </span>
              <div className="text-xl sm:text-2xl font-black text-amber-900 dark:text-amber-100">
                ₹{Math.round(passbookData.summary.loanOutstanding).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-amber-600 dark:text-amber-400">Outstanding Principal</p>
            </div>

            {/* Total Paid */}
            <div className="bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-900/60 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                Total Paid
              </span>
              <div className="text-xl sm:text-2xl font-black text-indigo-900 dark:text-indigo-100">
                ₹{Math.round(passbookData.summary.totalPaid).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-indigo-600 dark:text-indigo-400">Total Repayments</p>
            </div>

            {/* Amount Due */}
            <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/60 rounded-2xl p-4 space-y-1">
              <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider">
                Amount Due
              </span>
              <div className="text-xl sm:text-2xl font-black text-rose-900 dark:text-rose-100">
                ₹{Math.round(passbookData.summary.currentDue).toLocaleString('en-IN')}
              </div>
              <p className="text-[11px] text-rose-600 dark:text-rose-400">Current Pending Due</p>
            </div>
          </div>

          {/* 3. Filters & Control Bar */}
          <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
            {/* Group Filter */}
            {passbookData.groups && passbookData.groups.length > 1 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 font-bold">Group:</span>
                <select
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 outline-none"
                >
                  <option value="All">All Groups</option>
                  {passbookData.groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Date Range Presets & Inputs */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-slate-500 font-bold">Period:</span>
              <select
                value={dateFilterPreset}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 outline-none"
              >
                <option value="all">All Time</option>
                <option value="thisMonth">This Month</option>
                <option value="lastMonth">Last Month</option>
                <option value="thisFY">This Financial Year</option>
                <option value="lastFY">Last Financial Year</option>
                <option value="custom">Custom Range</option>
              </select>

              {dateFilterPreset === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                  <span className="text-slate-400">to</span>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="px-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 4. Main Navigation Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-800 overflow-x-auto flex scrollbar-none">
            <div className="flex gap-2 min-w-max pb-1">
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'savings', label: 'Savings' },
                { id: 'loans', label: 'Loans' },
                { id: 'transactions', label: 'Transactions' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition ${activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* 5. TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Savings Summary Box */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                    Savings Summary
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500">Opening Balance</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">₹{passbookData.savings.openingBalance.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500">Total Contributions</span>
                      <span className="font-bold text-emerald-600">+ ₹{passbookData.savings.totalContributions.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500">Total Withdrawals</span>
                      <span className="font-bold text-rose-600">- ₹{passbookData.savings.totalWithdrawals.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-bold text-slate-900 dark:text-white">
                      <span>Current Savings Balance</span>
                      <span className="text-emerald-600">₹{passbookData.savings.currentBalance.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>

                {/* Loan Summary Box */}
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-800 pb-2">
                    Loan Summary
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500">Total Loans / Active</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{passbookData.loanSummary.totalLoans} Total ({passbookData.loanSummary.activeLoans} Active)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500">Total Borrowed</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">₹{passbookData.loanSummary.totalBorrowed.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500">Principal Paid</span>
                      <span className="font-bold text-indigo-600">₹{passbookData.loanSummary.principalPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800">
                      <span className="text-slate-500">Interest Paid</span>
                      <span className="font-bold text-amber-600">₹{passbookData.loanSummary.interestPaid.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between pt-2 text-sm font-bold text-slate-900 dark:text-white">
                      <span>Outstanding Principal</span>
                      <span className="text-amber-600">₹{passbookData.loanSummary.outstandingPrincipal.toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Transactions List */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Recent Activity
                  </h3>
                  <button
                    onClick={() => setActiveTab('transactions')}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                  >
                    View All Transactions
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {(() => {
                  const activityList = (transactions.length > 0 ? transactions : passbookData.recentTransactions).slice(0, 10);
                  if (activityList.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No recent financial activity found for the selected period.
                      </div>
                    );
                  }
                  return (
                    <div className="space-y-3">
                      {activityList.map((tx, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-3 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl text-xs gap-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shrink-0 ${tx.credit > 0
                                ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                                : 'bg-rose-100 dark:bg-rose-950/60 text-rose-600'
                              }`}>
                              {tx.credit > 0 ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white">{tx.particulars}</div>
                              <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
                                <span>{tx.date}</span>
                                <span>•</span>
                                <span>{tx.reference}</span>
                                {tx.meetingNo && (
                                  <span className="px-1.5 py-0.2 bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-bold rounded">
                                    {tx.meetingNo}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <div className={`font-bold ${tx.credit > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {tx.credit > 0 ? `+ ₹${tx.credit.toLocaleString('en-IN')}` : `- ₹${tx.debit.toLocaleString('en-IN')}`}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              Bal: ₹{tx.balance.toLocaleString('en-IN')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 6. TAB 2: SAVINGS */}
          {activeTab === 'savings' && (
            <div className="space-y-6">
              {/* Savings Summary Banner */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
                <div>
                  <span className="text-slate-400 block">Opening Balance</span>
                  <strong className="text-slate-800 dark:text-slate-200 text-sm">₹{passbookData.savings.openingBalance.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Deposits</span>
                  <strong className="text-emerald-600 text-sm">+ ₹{passbookData.savings.totalContributions.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Total Withdrawals</span>
                  <strong className="text-rose-600 text-sm">- ₹{passbookData.savings.totalWithdrawals.toLocaleString('en-IN')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block">Current Balance</span>
                  <strong className="text-emerald-600 text-sm">₹{passbookData.savings.currentBalance.toLocaleString('en-IN')}</strong>
                </div>
              </div>

              {/* Savings Transactions List */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Savings History
                </h3>

                {(() => {
                  const savingsList = transactions.filter(t => t.type === 'Savings Collection');
                  if (savingsList.length === 0) {
                    return (
                      <div className="py-8 text-center text-xs text-slate-400">
                        No savings transactions found for the selected period.
                      </div>
                    );
                  }
                  return (
                    <>
                      {/* Desktop Table View */}
                      <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                              <th className="py-3 px-2">Date</th>
                              <th className="py-3 px-2">Reference</th>
                              <th className="py-3 px-2">Particulars</th>
                              <th className="py-3 px-2 text-right">Credit</th>
                              <th className="py-3 px-2 text-right">Debit</th>
                              <th className="py-3 px-2 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                            {savingsList.map((tx, idx) => (
                              <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                <td className="py-3 px-2 font-mono">{tx.date}</td>
                                <td className="py-3 px-2 font-mono text-indigo-600">{tx.reference}</td>
                                <td className="py-3 px-2 font-bold text-slate-800 dark:text-slate-200">{tx.particulars}</td>
                                <td className="py-3 px-2 text-right font-bold text-emerald-600">+ ₹{tx.credit.toLocaleString('en-IN')}</td>
                                <td className="py-3 px-2 text-right font-bold text-rose-600">{tx.debit > 0 ? `- ₹${tx.debit.toLocaleString('en-IN')}` : '—'}</td>
                                <td className="py-3 px-2 text-right font-bold font-mono">₹{tx.balance.toLocaleString('en-IN')}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Cards View */}
                      <div className="md:hidden space-y-3">
                        {savingsList.map((tx, idx) => (
                          <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-2 border border-slate-200/60 dark:border-slate-800">
                            <div className="flex justify-between text-slate-400 font-mono">
                              <span>{tx.date}</span>
                              <span className="text-indigo-600 font-bold">{tx.reference}</span>
                            </div>
                            <div className="font-bold text-slate-900 dark:text-white">{tx.particulars}</div>
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200/40 dark:border-slate-700">
                              <span className="text-emerald-600 font-bold">+ ₹{tx.credit.toLocaleString('en-IN')}</span>
                              <span className="font-mono text-slate-600 dark:text-slate-300 font-bold">Bal: ₹{tx.balance.toLocaleString('en-IN')}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          {/* 7. TAB 3: LOANS */}
          {activeTab === 'loans' && (
            <div className="space-y-6">
              {passbookData.loans.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center border border-slate-200 dark:border-slate-800 space-y-2">
                  <CreditCard className="w-10 h-10 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">No Loans Associated</h3>
                  <p className="text-xs text-slate-500">This member currently has no active or past loan facilities.</p>
                </div>
              ) : (
                <>
                  {/* Loan Selector */}
                  <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs w-full max-w-full overflow-hidden">
                    <span className="font-bold text-slate-500 shrink-0">Select Loan Facility:</span>
                    <select
                      value={selectedLoanId}
                      onChange={(e) => setSelectedLoanId(e.target.value)}
                      className="w-full sm:w-auto min-w-0 max-w-full truncate px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-indigo-600 dark:text-indigo-400 outline-none"
                    >
                      {passbookData.loans.map((loan) => (
                        <option key={loan.loanId} value={loan.loanId}>
                          {loan.loanNo} ({loan.loanType}) - Outstanding: ₹{Math.round(loan.outstandingPrincipal).toLocaleString('en-IN')}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Selected Loan Details */}
                  {(() => {
                    const currentLoan = passbookData.loans.find(l => l.loanId === selectedLoanId) || passbookData.loans[0];
                    if (!currentLoan) return null;

                    return (
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
                          <div>
                            <span className="text-slate-400 block">Loan Amount</span>
                            <strong className="text-slate-900 dark:text-white text-base">₹{Math.round(currentLoan.loanAmount).toLocaleString('en-IN')}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Outstanding Principal</span>
                            <strong className="text-amber-600 text-base">₹{Math.round(currentLoan.outstandingPrincipal).toLocaleString('en-IN')}</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Interest Rate / Mode</span>
                            <strong className="text-indigo-600 text-base">{currentLoan.interestRate}% ({currentLoan.interestMode})</strong>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Facility Status</span>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${currentLoan.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                              }`}>
                              {currentLoan.status}
                            </span>
                          </div>
                        </div>

                        {/* Repayment History */}
                        <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                            Loan Repayment History ({currentLoan.loanNo})
                          </h3>

                          {(() => {
                            const loanRepaymentList = transactions.filter(t => t.type === 'Loan Repayment' && t.particulars.includes(currentLoan.loanNo));
                            if (loanRepaymentList.length === 0) {
                              return (
                                <div className="py-8 text-center text-xs text-slate-400">
                                  No repayment transactions found for the selected period.
                                </div>
                              );
                            }
                            return (
                              <>
                                {/* Desktop Table View */}
                                <div className="hidden md:block overflow-x-auto">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                                        <th className="py-3 px-2">Date</th>
                                        <th className="py-3 px-2">Reference</th>
                                        <th className="py-3 px-2 text-right">Repayment Amount</th>
                                        <th className="py-3 px-2 text-right">Meeting</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                      {loanRepaymentList.map((tx, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                                          <td className="py-3 px-2 font-mono">{tx.date}</td>
                                          <td className="py-3 px-2 font-mono text-indigo-600">{tx.reference}</td>
                                          <td className="py-3 px-2 text-right font-bold text-indigo-600">₹{tx.credit.toLocaleString('en-IN')}</td>
                                          <td className="py-3 px-2 text-right font-mono text-slate-500">{tx.meetingNo || '—'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>

                                {/* Mobile Cards View */}
                                <div className="md:hidden space-y-3">
                                  {loanRepaymentList.map((tx, idx) => (
                                    <div key={idx} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-2 border border-slate-200/60 dark:border-slate-800">
                                      <div className="flex justify-between text-slate-400 font-mono">
                                        <span>{tx.date}</span>
                                        <span className="text-indigo-600 font-bold">{tx.reference}</span>
                                      </div>
                                      <div className="font-bold text-slate-900 dark:text-white">{tx.particulars}</div>
                                      <div className="flex justify-between items-center pt-1 border-t border-slate-200/40 dark:border-slate-700">
                                        <span className="text-indigo-600 font-bold">₹{tx.credit.toLocaleString('en-IN')}</span>
                                        <span className="font-mono text-slate-500">{tx.meetingNo || '—'}</span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          )}

          {/* 8. TAB 4: TRANSACTIONS (Chronological Member History) */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {/* Filter controls for transaction type */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-500">Transaction Type:</span>
                  <select
                    value={txnTypeFilter}
                    onChange={(e) => {
                      setTxnTypeFilter(e.target.value);
                      setPage(1);
                    }}
                    className="px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium outline-none"
                  >
                    <option value="All">All Types</option>
                    <option value="Savings Collection">Savings Collection</option>
                    <option value="Loan Repayment">Loan Repayment</option>
                    <option value="Loan Disbursement">Loan Disbursement</option>
                  </select>
                </div>

                <div className="text-slate-400 font-mono text-[11px]">
                  Page {page} of {totalPages}
                </div>
              </div>

              {/* Transactions Table / Cards */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                {txnLoading ? (
                  <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                    Loading transactions history...
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                    <FileText className="w-8 h-8 mx-auto text-slate-300" />
                    <div>No transactions recorded for this filter selection.</div>
                  </div>
                ) : (
                  <>
                    {/* Desktop View Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                            <th className="py-3 px-2">Date</th>
                            <th className="py-3 px-2">Reference</th>
                            <th className="py-3 px-2">Type</th>
                            <th className="py-3 px-2">Particulars</th>
                            <th className="py-3 px-2 text-right">Credit</th>
                            <th className="py-3 px-2 text-right">Debit</th>
                            <th className="py-3 px-2 text-right">Savings Bal</th>
                            <th className="py-3 px-2 text-center">Meeting</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {transactions.map((tx, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                              <td className="py-3 px-2 font-mono text-slate-500">{tx.date}</td>
                              <td className="py-3 px-2 font-mono font-bold text-slate-700 dark:text-slate-300">{tx.reference}</td>
                              <td className="py-3 px-2 font-bold text-indigo-600 dark:text-indigo-400">{tx.type}</td>
                              <td className="py-3 px-2 text-slate-800 dark:text-slate-200">{tx.particulars}</td>
                              <td className="py-3 px-2 text-right font-bold text-emerald-600">
                                {tx.credit > 0 ? `+ ₹${tx.credit.toLocaleString('en-IN')}` : '—'}
                              </td>
                              <td className="py-3 px-2 text-right font-bold text-rose-600">
                                {tx.debit > 0 ? `- ₹${tx.debit.toLocaleString('en-IN')}` : '—'}
                              </td>
                              <td className="py-3 px-2 text-right font-bold font-mono text-slate-800 dark:text-slate-200">
                                ₹{tx.balance.toLocaleString('en-IN')}
                              </td>
                              <td className="py-3 px-2 text-center">
                                {tx.meetingNo ? (
                                  <button
                                    onClick={() => navigate('/meetings')}
                                    className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-mono font-bold text-[10px] hover:underline"
                                  >
                                    {tx.meetingNo}
                                  </button>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View Cards */}
                    <div className="md:hidden space-y-3">
                      {transactions.map((tx, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-2 border border-slate-200/60 dark:border-slate-800">
                          <div className="flex justify-between items-center text-slate-400 font-mono">
                            <span>{tx.date}</span>
                            <span className="font-bold text-indigo-600">{tx.reference}</span>
                          </div>
                          <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                            <span>{tx.particulars}</span>
                            {tx.meetingNo && (
                              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-mono text-[10px] rounded font-bold">
                                {tx.meetingNo}
                              </span>
                            )}
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-200/40 dark:border-slate-700 font-bold">
                            <span className={tx.credit > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                              {tx.credit > 0 ? `Credit: + ₹${tx.credit.toLocaleString('en-IN')}` : `Debit: - ₹${tx.debit.toLocaleString('en-IN')}`}
                            </span>
                            <span className="font-mono text-slate-700 dark:text-slate-300">
                              Bal: ₹{tx.balance.toLocaleString('en-IN')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Pagination Bar */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 text-xs">
                        <button
                          disabled={page <= 1}
                          onClick={() => setPage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-300 rounded-lg font-bold"
                        >
                          Previous
                        </button>
                        <span className="text-slate-500 font-mono">
                          Page {page} of {totalPages}
                        </span>
                        <button
                          disabled={page >= totalPages}
                          onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
                          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-50 text-slate-700 dark:text-slate-300 rounded-lg font-bold"
                        >
                          Next
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
