import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { generateDueReportPDF } from '../../templates/reports/dueReportTemplate';
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  Download,
  Printer,
  RefreshCw,
  AlertCircle,
  ShieldAlert,
  Users,
  Calculator,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle,
  TrendingDown,
  DollarSign,
  Layers,
  ListFilter
} from 'lucide-react';

interface DueItem {
  id: string;
  loanId: string;
  loanNo: string;
  loanType: string;
  userId: string;
  userName: string;
  loanShareAmount: number;
  openingPrincipal: number;
  outstandingBalance: number;
  principalDue: number;
  interestDue: number;
  carryForwardInterest: number;
  totalDue: number;
  amountPaid: number;
  netDue: number;
  dueStatus: 'Overdue' | 'Pending' | 'Partial' | 'Paid';
  month: number;
  startDate: string;
  endDate: string;
  interestRate: number;
  interestMode: string;
}

interface GroupedLoan {
  loanId: string;
  loanNo: string;
  loanType: string;
  interestMode: string;
  interestRate: number;
  totalLoanDue: number;
  totalPrincipalDue: number;
  totalInterestDue: number;
  dueMembersCount: number;
  members: DueItem[];
}

interface FilterOption {
  loanId?: string;
  loanNo?: string;
  loanType?: string;
  userId?: string;
  userName?: string;
}

export default function DueReport() {
  const { user, activeRole, companySettings } = useSelector((state: RootState) => state.auth);
  const [tenantInfo, setTenantInfo] = useState<any>(companySettings);

  // Strict role check: Accessible ONLY for Admin or Manager
  const isAdminOrManager =
    activeRole?.roleType === 'admin' ||
    activeRole?.roleType === 'manager' ||
    user?.role === 'admin' ||
    user?.role === 'manager';

  // Filters state
  const [selectedMonth, setSelectedMonth] = useState<number>(
    parseInt(new Date().toISOString().slice(0, 7).replace('-', ''))
  );
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  // Master dropdown options preserved across filter selections
  const [allLoans, setAllLoans] = useState<FilterOption[]>([]);
  const [allUsers, setAllUsers] = useState<FilterOption[]>([]);

  // Collapsible cards state for grouped view
  const [collapsedLoans, setCollapsedLoans] = useState<Record<string, boolean>>({});

  // Data state
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [reportData, setReportData] = useState<{
    summary: {
      totalDueAmount: number;
      totalPrincipalDue: number;
      totalInterestDue: number;
      totalFacilitiesCount: number;
      totalMembersCount: number;
      totalItemsCount: number;
    };
    grouped: GroupedLoan[];
    items: DueItem[];
    filters: {
      loans: FilterOption[];
      users: FilterOption[];
    };
  } | null>(null);

  // Fetch tenant company settings on mount
  useEffect(() => {
    const loadTenantDetails = async () => {
      try {
        const res = await fetch('/api/settings/company');
        if (res.ok) {
          const data = await res.json();
          setTenantInfo(data);
        }
      } catch (err) {
        console.error('Error loading tenant company settings:', err);
      }
    };
    loadTenantDetails();
  }, []);

  // Month selector list generator (past 12 months)
  const getSelectableMonths = () => {
    const list = [];
    const now = new Date();
    const currentMonthVal = parseInt(
      `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    );
    for (let i = -12; i <= 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const val = parseInt(`${yyyy}${mm}`);
      if (val <= currentMonthVal) {
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        list.push({ val, label });
      }
    }
    return list;
  };

  const fetchDueReport = async () => {
    if (!isAdminOrManager) return;
    setLoading(true);
    setError('');
    try {
      let url = `/api/reports/due-report?month=${selectedMonth}`;
      if (selectedLoanId) url += `&loanId=${encodeURIComponent(selectedLoanId)}`;
      if (selectedUserId) url += `&userId=${encodeURIComponent(selectedUserId)}`;

      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch due report.');
      }
      setReportData(data);
      if (data.filters?.loans && data.filters.loans.length > 0) {
        setAllLoans((prev) => (data.filters.loans.length >= prev.length ? data.filters.loans : prev));
      }
      if (data.filters?.users && data.filters.users.length > 0) {
        setAllUsers((prev) => (data.filters.users.length >= prev.length ? data.filters.users : prev));
      }
    } catch (err: any) {
      console.error('Fetch Due Report error:', err);
      setError(err.message || 'Error generating due report.');
      setReportData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDueReport();
  }, [selectedMonth, selectedLoanId, selectedUserId]);

  const toggleLoanCollapse = (loanId: string) => {
    setCollapsedLoans((prev) => ({
      ...prev,
      [loanId]: !prev[loanId],
    }));
  };

  // Filter items by client-side search box
  const filteredItems = (reportData?.items || []).filter((item) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      item.loanNo.toLowerCase().includes(term) ||
      item.userName.toLowerCase().includes(term) ||
      item.userId.toLowerCase().includes(term)
    );
  });

  // Filter grouped data by client-side search box
  const filteredGrouped = (reportData?.grouped || [])
    .map((group) => {
      if (!searchTerm) return group;
      const term = searchTerm.toLowerCase();
      const matchingMembers = group.members.filter(
        (m) =>
          group.loanNo.toLowerCase().includes(term) ||
          m.userName.toLowerCase().includes(term) ||
          m.userId.toLowerCase().includes(term)
      );
      if (matchingMembers.length === 0) return null;
      return {
        ...group,
        members: matchingMembers,
        dueMembersCount: matchingMembers.length,
        totalLoanDue: matchingMembers.reduce((sum, m) => sum + m.netDue, 0),
        totalPrincipalDue: matchingMembers.reduce((sum, m) => sum + m.principalDue, 0),
        totalInterestDue: matchingMembers.reduce(
          (sum, m) => sum + (m.interestDue + m.carryForwardInterest),
          0
        ),
      };
    })
    .filter(Boolean) as GroupedLoan[];

  // Trigger pdfMake PDF generation
  const handlePdfAction = (action: 'print' | 'download') => {
    if (!reportData) return;
    const selectedMonthObj = getSelectableMonths().find((m) => m.val === selectedMonth);
    const monthLabel = selectedMonthObj ? selectedMonthObj.label : String(selectedMonth);

    generateDueReportPDF(
      {
        companySettings: tenantInfo || companySettings,
        monthLabel,
        selectedMonth,
        summary: reportData.summary,
        grouped: filteredGrouped,
      },
      action
    );
  };

  // Render Access Restricted if user is not admin or manager
  if (!isAdminOrManager) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto my-20 animate-fade-in text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-rose-200 dark:border-rose-800">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The Due Dues & Amortization Report is accessible only to workspace administrators and managers. Contact your administrator if you require access.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 animate-fade-in my-16 max-w-7xl mx-auto md:mb-20 text-slate-800 dark:text-slate-200">
      {/* Header Section */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900">
              <FileSpreadsheet className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div>
              <h2 className="text-base md:text-2xl font-bold font-headline text-slate-900 dark:text-white tracking-tight">
                Loans Due Report
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Comprehensive audit of outstanding principal & interest dues across all active commercial loan facilities.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => handlePdfAction('download')}
            disabled={!reportData || loading}
            className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>
          <button
            type="button"
            onClick={() => handlePdfAction('print')}
            disabled={!reportData || loading}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Total Dues Outstanding
          </span>
          <p className="text-base md:text-2xl font-black font-headline text-rose-600 dark:text-rose-400 font-mono">
            ₹{Math.round(reportData?.summary.totalDueAmount || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 block">
            Net pending for billing period
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Principal Due Component
          </span>
          <p className="text-base md:text-2xl font-black font-headline text-slate-900 dark:text-white font-mono">
            ₹{Math.round(reportData?.summary.totalPrincipalDue || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 block">
            Scheduled principal installments
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Interest & Carryforward
          </span>
          <p className="text-base md:text-2xl font-black font-headline text-amber-600 dark:text-amber-400 font-mono">
            ₹{Math.round(reportData?.summary.totalInterestDue || 0).toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-500 block">
            Interest & accumulated arrears
          </span>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 shadow-xs space-y-1">
          <span className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400 block">
            Due Facilities / Members
          </span>
          <p className="text-base md:text-2xl font-black font-headline text-indigo-600 dark:text-indigo-400 font-mono">
            {reportData?.summary.totalFacilitiesCount || 0} / {reportData?.summary.totalMembersCount || 0}
          </p>
          <span className="text-[10px] text-slate-500 block">
            Active loan accounts with dues
          </span>
        </div>
      </div>

      {/* Control Bar: Filters & Search */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Month Selector (Disabled - Current Due Only) */}
          <div className="space-y-1">
            <label className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Billing Month Period
            </label>
            <select
              disabled
              value={selectedMonth}
              className="w-full px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-600 dark:text-slate-400 font-semibold cursor-not-allowed opacity-75"
            >
              <option value={selectedMonth}>
                Current Month - {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </option>
            </select>
          </div>

          {/* Filter by Loan */}
          <div className="space-y-1">
            <label className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Filter by Loan Facility
            </label>
            <select
              value={selectedLoanId}
              onChange={(e) => setSelectedLoanId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            >
              <option value="">-- All Credit Facilities --</option>
              {(allLoans.length > 0 ? allLoans : reportData?.filters.loans || []).map((l) => (
                <option key={l.loanId} value={l.loanId}>
                  {l.loanNo} ({l.loanType} Loan)
                </option>
              ))}
            </select>
          </div>

          {/* Filter by User */}
          <div className="space-y-1">
            <label className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Filter by Member / User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
            >
              <option value="">-- All Beneficiary Members --</option>
              {(allUsers.length > 0 ? allUsers : reportData?.filters.users || []).map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.userName} ({u.userId})
                </option>
              ))}
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1">
            <label className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Search Text
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search Loan No or Member..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 font-medium focus:outline-none focus:ring-2 focus:ring-slate-900 transition"
              />
            </div>
          </div>
        </div>

        {/* View Mode Switcher */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between gap-3">
          <div className="text-[10px] text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>
              Showing strictly active due items for billing period {selectedMonth}. Fully settled items are excluded.
            </span>
          </div>

          <div className="inline-flex p-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0">
            <button
              onClick={() => setViewMode('grouped')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'grouped'
                  ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Grouped by Loan</span>
            </button>
            <button
              onClick={() => setViewMode('flat')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition duration-150 flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'flat'
                  ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-white shadow-xs font-bold'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Flat Table List</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-24 text-center text-slate-500 space-y-2">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-900 dark:text-indigo-400" />
          <p className="text-xs font-semibold">Generating due report from database...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-center text-xs font-semibold">
          {error}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400 space-y-2">
          <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            No Active Dues Found
          </h4>
          <p className="text-xs text-slate-500">
            All credit facilities and member shares for period {selectedMonth} are fully paid or match your filter criteria.
          </p>
        </div>
      ) : viewMode === 'grouped' ? (
        /* GROUPED BY LOAN VIEW */
        <div className="space-y-4">
          {filteredGrouped.map((group) => {
            const isCollapsed = collapsedLoans[group.loanId];
            return (
              <div
                key={group.loanId}
                className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl md:rounded-2xl shadow-xs overflow-hidden"
              >
                {/* Loan Facility Header */}
                <div
                  onClick={() => toggleLoanCollapse(group.loanId)}
                  className="p-3 md:p-4 bg-slate-50/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-100/60 dark:hover:bg-slate-800/80 transition"
                >
                  <div className="flex items-center gap-3">
                    <div className="px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white rounded-lg text-xs font-mono font-bold">
                      {group.loanNo}
                    </div>
                    <div>
                      <h4 className="text-xs md:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{group.loanType} Credit Facility</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono rounded-md">
                          {group.interestRate}% ({group.interestMode})
                        </span>
                      </h4>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        {group.dueMembersCount} member(s) with active dues
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-auto">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 uppercase font-bold block">
                        Facility Total Due
                      </span>
                      <span className="text-xs md:text-sm font-extrabold text-rose-600 dark:text-rose-400 font-mono">
                        ₹{Math.round(group.totalLoanDue).toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition"
                    >
                      {isCollapsed ? (
                        <ChevronDown className="w-5 h-5" />
                      ) : (
                        <ChevronUp className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Member Dues Table */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50/40 dark:bg-slate-800/30 text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                        <tr>
                          <th className="p-3 pl-4 uppercase tracking-wider text-[9px]">
                            Beneficiary Member
                          </th>
                          <th className="p-3 uppercase tracking-wider text-[9px]">
                            User ID
                          </th>
                          <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                            Opening Principal
                          </th>
                          <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                            Principal Due
                          </th>
                          <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                            Interest & Carryover
                          </th>
                          <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                            Total Due Amount
                          </th>
                          <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                            Amount Paid
                          </th>
                          <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                            Net Due
                          </th>
                          <th className="p-3 pr-4 uppercase tracking-wider text-[9px] text-center">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                        {group.members.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                          >
                            <td className="p-3 pl-4 font-bold text-slate-900 dark:text-white">
                              {item.userName}
                            </td>
                            <td className="p-3 font-mono text-[10px] text-slate-400">
                              {item.userId}
                            </td>
                            <td className="p-3 text-right font-mono text-slate-600 dark:text-slate-400">
                              ₹{Math.round(item.openingPrincipal).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono">
                              ₹{Math.round(item.principalDue).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400">
                              ₹{Math.round(item.interestDue + item.carryForwardInterest).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                              ₹{Math.round(item.totalDue).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono text-emerald-600">
                              ₹{Math.round(item.amountPaid).toLocaleString()}
                            </td>
                            <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                              ₹{Math.round(item.netDue).toLocaleString()}
                            </td>
                            <td className="p-3 pr-4 text-center">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                                  item.dueStatus === 'Overdue'
                                    ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                                    : item.dueStatus === 'Partial'
                                    ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                                    : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                                }`}
                              >
                                {item.dueStatus}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* FLAT TABLE LIST VIEW */
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl md:rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="p-3 pl-4 uppercase tracking-wider text-[9px]">
                    Loan No
                  </th>
                  <th className="p-3 uppercase tracking-wider text-[9px]">
                    Type
                  </th>
                  <th className="p-3 uppercase tracking-wider text-[9px]">
                    Beneficiary Member
                  </th>
                  <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                    Principal Due
                  </th>
                  <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                    Interest Due
                  </th>
                  <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                    Total Due
                  </th>
                  <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                    Amount Paid
                  </th>
                  <th className="p-3 uppercase tracking-wider text-[9px] text-right">
                    Net Outstanding Due
                  </th>
                  <th className="p-3 pr-4 uppercase tracking-wider text-[9px] text-center">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                {filteredItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition"
                  >
                    <td className="p-3 pl-4 font-mono font-bold text-slate-900 dark:text-white">
                      {item.loanNo}
                    </td>
                    <td className="p-3 text-[10px] text-slate-500 font-sans">
                      {item.loanType}
                    </td>
                    <td className="p-3 font-bold text-slate-900 dark:text-white">
                      {item.userName}
                      <span className="block text-[10px] font-mono font-normal text-slate-400">
                        {item.userId}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">
                      ₹{Math.round(item.principalDue).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-amber-600 dark:text-amber-400">
                      ₹{Math.round(item.interestDue + item.carryForwardInterest).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900 dark:text-white">
                      ₹{Math.round(item.totalDue).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono text-emerald-600">
                      ₹{Math.round(item.amountPaid).toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-black text-rose-600 dark:text-rose-400">
                      ₹{Math.round(item.netDue).toLocaleString()}
                    </td>
                    <td className="p-3 pr-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase tracking-wider border ${
                          item.dueStatus === 'Overdue'
                            ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800'
                            : item.dueStatus === 'Partial'
                            ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800'
                            : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                        }`}
                      >
                        {item.dueStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
