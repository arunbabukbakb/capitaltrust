import React, { useState, useEffect, useMemo } from 'react';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  CreditCard,
  Coins,
  FileSpreadsheet,
} from 'lucide-react';
import DataTable, { ColumnDef } from '../../components/DataTable';

interface TransactionItem {
  Id: string;
  TenantId: number | string;
  TransactionNo: string;
  TransactionDate: string;
  TransactionType: 'Collection' | 'LoanIssue' | 'LoanRepayment' | 'Expense' | 'OpeningBalance' | 'Adjustment';
  Amount: number;
  ReferenceType: string;
  ReferenceId: string;
  Narration: string;
  Status: string;
  CreatedBy: string;
  CreatedAt?: string;
  createdByName?: string;
}

const getDefaultDateRange = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDayCurrentMonth = new Date(year, month, 1);
  const startY = firstDayCurrentMonth.getFullYear();
  const startM = String(firstDayCurrentMonth.getMonth() + 1).padStart(2, '0');
  const defaultStartDate = `${startY}-${startM}-01`;

  const firstDayNextMonth = new Date(year, month + 1, 1);
  const endY = firstDayNextMonth.getFullYear();
  const endM = String(firstDayNextMonth.getMonth() + 1).padStart(2, '0');
  const defaultEndDate = `${endY}-${endM}-01`;

  return { defaultStartDate, defaultEndDate };
};

export default function TransactionsPage() {
  const { defaultStartDate, defaultEndDate } = getDefaultDateRange();

  // Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [startDate, setStartDate] = useState<string>(defaultStartDate);
  const [endDate, setEndDate] = useState<string>(defaultEndDate);

  // Active Filter Trigger State (passed to DataTable params)
  const [activeFilters, setActiveFilters] = useState<{
    transactionType: string;
    startDate: string;
    endDate: string;
    search: string;
  }>({
    transactionType: 'All',
    startDate: defaultStartDate,
    endDate: defaultEndDate,
    search: ''
  });

  // Summary figures computed by server API
  const [summary, setSummary] = useState<{
    totalVolume: number;
    totalInflow: number;
    totalOutflow: number;
  }>({
    totalVolume: 0,
    totalInflow: 0,
    totalOutflow: 0
  });

  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  // Dedicated Summary API Fetch (/api/transactions/summary)
  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const params = new URLSearchParams();
        if (activeFilters.transactionType && activeFilters.transactionType !== 'All') {
          params.append('transactionType', activeFilters.transactionType);
        }
        if (activeFilters.startDate) {
          params.append('startDate', activeFilters.startDate);
        }
        if (activeFilters.endDate) {
          params.append('endDate', activeFilters.endDate);
        }
        if (activeFilters.search && activeFilters.search.trim()) {
          params.append('search', activeFilters.search.trim());
        }

        const res = await fetch(`/api/transactions/summary?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setSummary({
            totalVolume: Number(data.totalVolume || 0),
            totalInflow: Number(data.totalInflow || 0),
            totalOutflow: Number(data.totalOutflow || 0)
          });
        }
      } catch (err) {
        console.error('Fetch transaction summary error:', err);
      }
    };

    fetchSummary();
  }, [activeFilters, refreshTrigger]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveFilters({
      transactionType: selectedType,
      startDate: startDate,
      endDate: endDate,
      search: searchQuery
    });
  };

  const handleResetFilters = () => {
    const { defaultStartDate, defaultEndDate } = getDefaultDateRange();
    setSearchQuery('');
    setSelectedType('All');
    setStartDate(defaultStartDate);
    setEndDate(defaultEndDate);
    setActiveFilters({
      transactionType: 'All',
      startDate: defaultStartDate,
      endDate: defaultEndDate,
      search: ''
    });
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getTypeBadgeStyle = (type: string) => {
    switch (type) {
      case 'Collection':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60';
      case 'LoanRepayment':
        return 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 border-teal-200 dark:border-teal-800/60';
      case 'LoanIssue':
        return 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60';
      case 'Expense':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/60';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'Collection':
        return <Coins className="w-3.5 h-3.5" />;
      case 'LoanRepayment':
        return <ArrowDownRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />;
      case 'LoanIssue':
        return <CreditCard className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />;
      case 'Expense':
        return <Receipt className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />;
      default:
        return <Layers className="w-3.5 h-3.5" />;
    }
  };

  // Define Table Columns
  const columns: ColumnDef<TransactionItem>[] = useMemo(() => [
    {
      key: 'TransactionNo',
      header: 'Txn No',
      render: (txn) => (
        <span className="font-mono font-bold text-slate-900 dark:text-slate-100">
          {txn.TransactionNo}
        </span>
      )
    },
    {
      key: 'TransactionDate',
      header: 'Date',
      render: (txn) => (
        <span className="font-medium text-slate-600 dark:text-slate-350">
          {txn.TransactionDate}
        </span>
      )
    },
    {
      key: 'TransactionType',
      header: 'Type',
      render: (txn) => (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getTypeBadgeStyle(txn.TransactionType)}`}>
          {getTypeIcon(txn.TransactionType)}
          <span>{txn.TransactionType}</span>
        </span>
      )
    },
    {
      key: 'ReferenceType',
      header: 'Reference',
      render: (txn) => (
        <span className="font-medium text-slate-500 dark:text-slate-400 text-[11px]">
          {txn.ReferenceType} #{txn.ReferenceId}
        </span>
      )
    },
    {
      key: 'Narration',
      header: 'Narration',
      render: (txn) => (
        <span className="font-medium text-slate-700 dark:text-slate-300 line-clamp-1 max-w-xs">
          {txn.Narration}
        </span>
      )
    },
    {
      key: 'Amount',
      header: 'Amount',
      align: 'right',
      render: (txn) => (
        <span className="font-extrabold text-slate-950 dark:text-slate-50 font-tnum">
          ₹{Number(txn.Amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
        </span>
      )
    },
    {
      key: 'createdByName',
      header: 'Created By',
      render: (txn) => (
        <span className="font-medium text-slate-600 dark:text-slate-400 text-[11px]">
          {txn.createdByName || txn.CreatedBy}
        </span>
      )
    },
    {
      key: 'Status',
      header: 'Status',
      align: 'center',
      render: (txn) => (
        <span className="inline-block text-[9px] font-bold px-2 py-0.5 rounded-full uppercase bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40">
          {txn.Status || 'Completed'}
        </span>
      )
    }
  ], []);

  // Custom Mobile Card Renderer
  const renderMobileCard = (txn: TransactionItem) => (
    <div key={txn.Id} className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
            {txn.TransactionNo}
          </span>
          <div className="mt-0.5">
            <span className={`inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full border uppercase ${getTypeBadgeStyle(txn.TransactionType)}`}>
              {getTypeIcon(txn.TransactionType)}
              <span>{txn.TransactionType}</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <span className="text-base font-extrabold font-tnum text-slate-950 dark:text-slate-50">
            ₹{Number(txn.Amount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </span>
          <p className="text-[10px] text-slate-400 mt-0.5">{txn.TransactionDate}</p>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs text-slate-600 dark:text-slate-300 space-y-1">
        <p className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">
          {txn.Narration}
        </p>
        <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
          <span>Ref: {txn.ReferenceType} #{txn.ReferenceId}</span>
          <span>By: {txn.createdByName || txn.CreatedBy}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in mt-14 sm:mt-16 mb-20 px-2 sm:px-0">
      {/* Header Section */}
      <div className="hidden sm:flex justify-between items-center bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            Transaction Audit Ledger
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Centralized financial audit trail of Collections, Approved Loan Facilities, Repayments, and Expenses.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Mobile Header Action */}
      <div className="flex sm:hidden justify-between items-center mb-1">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          Transactions
        </h2>
        <button
          onClick={handleRefresh}
          className="p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* KPI Metric Summary Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Volume */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Volume
          </span>
          <h3 className="text-lg sm:text-2xl font-extrabold font-headline text-slate-950 dark:text-slate-50 mt-1">
            ₹{summary.totalVolume.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Matching Filter Set
          </p>
        </div>

        {/* Total Inflow */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
              Total Inflow
            </span>
            <ArrowDownRight className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-lg sm:text-2xl font-extrabold font-headline text-emerald-700 dark:text-emerald-400 mt-1">
            ₹{summary.totalInflow.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Collections & Repayments
          </p>
        </div>

        {/* Total Outflow */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center">
            <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">
              Total Outflow
            </span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <h3 className="text-lg sm:text-2xl font-extrabold font-headline text-amber-700 dark:text-amber-400 mt-1">
            ₹{summary.totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Loan Issues & Expenses
          </p>
        </div>

        {/* Net Liquidity Balance */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-[9px] sm:text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            Net Liquidity Balance
          </span>
          <h3 className={`text-lg sm:text-2xl font-extrabold font-headline mt-1 ${(summary.totalInflow - summary.totalOutflow) >= 0 ? 'text-indigo-700 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'
            }`}>
            ₹{(summary.totalInflow - summary.totalOutflow).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </h3>
          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Inflow minus Outflow
          </p>
        </div>
      </div>

      {/* Single-Row Responsive Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-col xl:flex-row items-stretch xl:items-center gap-2 sm:gap-2.5">
          {/* 1. Search Textbox */}
          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search TXN No, Narration, Ref..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-slate-100"
            />
          </div>

          {/* 2. Type Dropdown */}
          <div className="w-full sm:w-auto">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full sm:w-auto px-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="Collection">Collection</option>
              <option value="LoanIssue">Loan Issue</option>
              <option value="LoanRepayment">Loan Repayment</option>
              <option value="Expense">Expense</option>
              <option value="OpeningBalance">Opening Balance</option>
              <option value="Adjustment">Adjustment</option>
            </select>
          </div>

          {/* 3. From Date */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
              From:
            </span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            />
          </div>

          {/* 4. To Date */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 whitespace-nowrap">
              To:
            </span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full sm:w-auto px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none cursor-pointer"
            />
          </div>

          {/* 5. Filter & 6. Reset Buttons */}
          <div className="flex items-center gap-2 shrink-0 pt-1 xl:pt-0">
            <button
              type="submit"
              className="flex-1 xl:flex-none px-4 py-1.5 sm:py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
            <button
              type="button"
              onClick={handleResetFilters}
              className="flex-1 xl:flex-none px-3.5 py-1.5 sm:py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-center"
            >
              Reset
            </button>
          </div>
        </form>
      </div>

      {/* Generic Data Table Component with Server-Side Pagination */}
      <DataTable<TransactionItem>
        apiUrl="/api/transactions"
        params={activeFilters}
        columns={columns}
        mobileCardRender={renderMobileCard}
        initialPageSize={10}
        pageSizeOptions={[10, 25, 50, 100]}
        emptyMessage="No transaction audit records found."
        loadingMessage="Loading transaction audit ledger..."
        refreshTrigger={refreshTrigger}
      />
    </div>
  );
}
