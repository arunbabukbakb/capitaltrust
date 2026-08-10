import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useTranslation } from 'react-i18next';
import {
  User,
  Calculator,
  Coins,
  Receipt,
  RefreshCw,
  Eye,
  FileText,
  Calendar,
  X,
  UserCheck,
  TrendingDown,
  DollarSign
} from 'lucide-react';

interface MemberDetails {
  id: string;
  fullName: string;
  email: string;
  username: string;
  role: string;
  phoneNumber?: string;
  status: number;
  profileImage?: string;
}

interface LoanItem {
  loanMemberId: number;
  loanId: string;
  loanNo: string;
  loanType: string;
  shareAmount: number;
  outstandingPrincipal: number;
  status: string;
  startDate: string;
  endDate: string;
}

interface LoanSummary {
  activeCount: number;
  totalShare: number;
  totalOutstanding: number;
  totalPrincipalPaid: number;
  totalInterestPaid: number;
}

interface CollectionTypeItem {
  typeId: number;
  typeName: string;
  openingBalance?: number;
  collectedAmount?: number;
  totalAmount: number;
}

interface CollectionSummary {
  totalCollected: number;
}

interface ExpenseItem {
  id: string;
  expenseDate: string;
  amount: number;
  paymentMode: string;
  referenceNo?: string | null;
  description: string;
  status: string;
}

interface ExpenseSummary {
  totalAmount: number;
}

interface LedgerResponse {
  memberDetails: MemberDetails;
  loans: {
    summary: LoanSummary;
    list: LoanItem[];
  };
  collections: {
    summary: CollectionSummary;
    typesList: CollectionTypeItem[];
  };
  expenses: {
    summary: ExpenseSummary;
    list: ExpenseItem[];
  };
}

interface UserListItem {
  id: string;
  fullName: string;
  username: string;
  email: string;
}

export default function MemberLedger() {
  const { t } = useTranslation();
  const { user, activeRole } = useSelector((state: RootState) => state.auth);

  const isAdminOrManager = activeRole?.roleType === 'admin' || activeRole?.roleType === 'manager' || user?.role === 'admin' || user?.role === 'manager';

  // Selection states
  const [usersList, setUsersList] = useState<UserListItem[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>(user?.id || '');

  // Ledger state
  const [ledgerData, setLedgerData] = useState<LedgerResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Modals state
  const [activeRepaymentsLoan, setActiveRepaymentsLoan] = useState<LoanItem | null>(null);
  const [repaymentsHistory, setRepaymentsHistory] = useState<any[]>([]);
  const [loadingRepayments, setLoadingRepayments] = useState<boolean>(false);

  const [activeCollectionType, setActiveCollectionType] = useState<CollectionTypeItem | null>(null);
  const [collectionHistory, setCollectionHistory] = useState<any[]>([]);
  const [loadingCollections, setLoadingCollections] = useState<boolean>(false);

  // Load user list for selection if admin/manager
  useEffect(() => {
    if (isAdminOrManager) {
      const fetchUsers = async () => {
        try {
          const res = await fetch('/api/users');
          if (res.ok) {
            const data = await res.json();
            setUsersList(data);
          }
        } catch (err) {
          console.error("Failed to load users list", err);
        }
      };
      fetchUsers();
    }
  }, [isAdminOrManager]);

  // Load ledger details whenever selected user changes
  useEffect(() => {
    if (selectedUserId) {
      fetchLedgerDetails(selectedUserId);
    }
  }, [selectedUserId]);

  const fetchLedgerDetails = async (userId: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/reports/member-ledger/${userId}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch ledger details.');
      }
      setLedgerData(data);
    } catch (err: any) {
      setError(err.message || 'Error loading member ledger details.');
      setLedgerData(null);
    } finally {
      setLoading(false);
    }
  };

  // Fetch loan payment history
  const handleViewLoanRepayments = async (loan: LoanItem) => {
    setActiveRepaymentsLoan(loan);
    setLoadingRepayments(true);
    try {
      const res = await fetch(`/api/reports/member-ledger/loans/${loan.loanMemberId}/payments`);
      if (!res.ok) throw new Error("Failed to load payments history");
      const data = await res.json();
      setRepaymentsHistory(data);
    } catch (err: any) {
      alert(err.message || "Failed to load payment history");
    } finally {
      setLoadingRepayments(false);
    }
  };

  // Fetch collection type history
  const handleViewCollectionHistory = async (type: CollectionTypeItem) => {
    setActiveCollectionType(type);
    setLoadingCollections(true);
    try {
      const res = await fetch(`/api/reports/member-ledger/collections/${type.typeId}/history?userId=${selectedUserId}`);
      if (!res.ok) throw new Error("Failed to load contribution history");
      const data = await res.json();
      setCollectionHistory(data);
    } catch (err: any) {
      alert(err.message || "Failed to load collection history");
    } finally {
      setLoadingCollections(false);
    }
  };



  return (
    <div className="p-0 md:p-6 space-y-4 md:space-y-8 animate-fade-in my-16 max-w-7xl mx-auto md:mb-20">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm md:text-2xl font-bold font-headline text-slate-900 dark:text-white">{t('reportPage.memberLedgerTitle')}</h3>
          <p className="hidden md:block text-xs text-slate-500 mt-1 dark:text-slate-400">{t('reportPage.memberLedgerSub')}</p>
        </div>

        {/* Member Selector (Admin/Manager only) */}
        {isAdminOrManager && (
          <div className="relative w-full md:w-80 z-20 flex items-center gap-2">
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="flex-1 px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-slate-950 focus:border-transparent transition text-slate-700 dark:text-white"
            >
              <option value="">-- {t('reportPage.selectMember')} --</option>
              {usersList.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} (ID: {u.id})
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedUserId && fetchLedgerDetails(selectedUserId)}
              disabled={!selectedUserId}
              className="p-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition disabled:opacity-50 flex-shrink-0 cursor-pointer"
              title="Refresh details"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="py-24 text-center text-slate-500 space-y-2 dark:text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-slate-800 dark:text-indigo-400" />
          <p className="text-sm font-semibold">Aggregating member ledger data from server...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-xl text-center text-xs font-semibold">
          {error}
        </div>
      ) : ledgerData ? (
        <div className="space-y-4 md:space-y-6">

          {/* Member details card */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-5 shadow-xs flex flex-col sm:flex-row items-center gap-3 md:gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-slate-50 dark:bg-slate-800 border border-slate-150 dark:border-slate-700 rounded-xl md:rounded-2xl overflow-hidden flex items-center justify-center flex-shrink-0">
              {ledgerData.memberDetails.profileImage ? (
                <img 
                  src={ledgerData.memberDetails.profileImage} 
                  alt={ledgerData.memberDetails.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-6 h-6 md:w-8 md:h-8 text-slate-700 dark:text-indigo-400" />
              )}
            </div>
            <div className="flex-1 text-center sm:text-left space-y-1">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 justify-center sm:justify-start">
                <h4 className="text-sm md:text-lg font-bold text-slate-900 dark:text-white">{ledgerData.memberDetails.fullName}</h4>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-block max-w-max mx-auto sm:mx-0 ${ledgerData.memberDetails.status === 1
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                  : 'bg-slate-50 text-slate-450 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                  }`}>
                  {ledgerData.memberDetails.status === 1 ? t('reportPage.activeMember') : t('reportPage.inactive')}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1 md:gap-2 text-[10px] md:text-xs text-slate-500 dark:text-slate-400 font-semibold font-mono">
                <div>{t('reportPage.userId')}: <span className="text-slate-700 dark:text-slate-200 font-bold">{ledgerData.memberDetails.id}</span></div>
                <div>{t('reportPage.email')}: <span className="text-slate-700 dark:text-slate-200 font-bold">{ledgerData.memberDetails.email}</span></div>
                <div>{t('reportPage.phone')}: <span className="text-slate-700 dark:text-slate-200 font-bold">{ledgerData.memberDetails.phoneNumber || 'Not Provided'}</span></div>
              </div>
            </div>
          </div>

          {/* Summaries Grid */}
          <div className="grid grid-cols-3 gap-1.5 md:gap-4 font-headline">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 sm:p-3 md:p-4 shadow-xs flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 text-center sm:text-left">
              <div className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-950/40 rounded-md sm:rounded-lg text-blue-600 dark:text-blue-400 flex-shrink-0">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">{t('reportPage.loansOutstanding')}</p>
                <h4 className="text-[10px] sm:text-sm md:text-base font-black text-slate-900 dark:text-white mt-0.5 truncate">
                  {ledgerData.loans.summary.activeCount} / <span className="text-red-500 font-bold">₹{Math.round(ledgerData.loans.summary.totalOutstanding)}</span>
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 sm:p-3 md:p-4 shadow-xs flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 text-center sm:text-left">
              <div className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-950/40 rounded-md sm:rounded-lg text-emerald-600 dark:text-emerald-400 flex-shrink-0">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">{t('reportPage.totalSavings')}</p>
                <h4 className="text-[10px] sm:text-sm md:text-base font-black text-emerald-600 dark:text-emerald-400 mt-0.5 truncate">
                  ₹{Math.round(ledgerData.collections.summary.totalCollected)}
                </h4>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 sm:p-3 md:p-4 shadow-xs flex flex-col sm:flex-row items-center gap-1.5 sm:gap-3 text-center sm:text-left">
              <div className="p-1.5 sm:p-2 bg-amber-50 dark:bg-amber-950/40 rounded-md sm:rounded-lg text-amber-600 dark:text-amber-450 flex-shrink-0">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 truncate">{t('reportPage.totalExpenses')}</p>
                <h4 className="text-[10px] sm:text-sm md:text-base font-black text-amber-600 dark:text-amber-450 mt-0.5 truncate">
                  ₹{Math.round(ledgerData.expenses.summary.totalAmount)}
                </h4>
              </div>
            </div>
          </div>

          {/* LOANS TAB SECTION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl shadow-xs overflow-hidden">
            <header className="p-3 md:px-6 md:py-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 text-slate-400" />
                {t('reportPage.loansLedger')}
              </h4>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold text-slate-550 dark:text-slate-400">
                <div>{t('reportPage.totalShare')}: <span className="text-slate-800 dark:text-white">₹{ledgerData.loans.summary.totalShare.toFixed(2)}</span></div>
                <div>{t('reportPage.principalPaid')}: <span className="text-slate-800 dark:text-white">₹{ledgerData.loans.summary.totalPrincipalPaid.toFixed(2)}</span></div>
                <div>{t('reportPage.interestPaid')}: <span className="text-slate-800 dark:text-white">₹{ledgerData.loans.summary.totalInterestPaid.toFixed(2)}</span></div>
              </div>
            </header>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 pl-6 uppercase tracking-wider text-[9px]">{t('reportPage.loanNo')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px]">{t('reportPage.type')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px] text-right">{t('reportPage.shareAmount')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px] text-right">{t('reportPage.outstandingPrincipal')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px] text-center">{t('reportPage.status')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px]">{t('reportPage.startDate')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px]">{t('reportPage.endDate')}</th>
                    <th className="p-3 pr-6 uppercase tracking-wider text-[9px] text-right">{t('collectionPage.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-250 font-semibold">
                  {ledgerData.loans.list.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 italic">{t('reportPage.noLoansMapped')}</td>
                    </tr>
                  ) : (
                    ledgerData.loans.list.map((loan) => (
                      <tr key={loan.loanMemberId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 pl-6 font-mono text-slate-900 dark:text-white font-bold">{loan.loanNo}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${loan.loanType === 'Single'
                            ? 'bg-blue-50 text-blue-800 border-blue-100 dark:bg-blue-500/10 dark:text-blue-455'
                            : 'bg-indigo-50 text-indigo-800 border-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-400'
                            }`}>
                            {loan.loanType}
                          </span>
                        </td>
                        <td className="p-3 text-right">₹{loan.shareAmount.toFixed(2)}</td>
                        <td className="p-3 text-right text-red-500">₹{loan.outstandingPrincipal.toFixed(2)}</td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${loan.status === 'Active'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-455'
                            : 'bg-slate-50 text-slate-450 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                            }`}>
                            {loan.status}
                          </span>
                        </td>
                        <td className="p-3 font-mono text-[10px]">{loan.startDate}</td>
                        <td className="p-3 font-mono text-[10px]">{loan.endDate}</td>
                        <td className="p-3 pr-6 text-right">
                          <button
                            onClick={() => handleViewLoanRepayments(loan)}
                            className="px-2.5 py-1 bg-slate-950 text-white hover:bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded text-[10px] transition font-bold flex items-center gap-1 ml-auto cursor-pointer"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{t('reportPage.repayments')}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {ledgerData.loans.list.length === 0 ? (
                <div className="p-6 text-center text-slate-400 italic text-xs">No loans mapped to this member.</div>
              ) : (
                ledgerData.loans.list.map((loan) => (
                  <div key={loan.loanMemberId} className="p-4 space-y-3 text-xs bg-white dark:bg-slate-900">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-slate-900 dark:text-white text-sm">{loan.loanNo}</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${loan.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-455'
                          : 'bg-slate-50 text-slate-450 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                          }`}>
                          {loan.status}
                        </span>
                        <button
                          onClick={() => handleViewLoanRepayments(loan)}
                          className="p-1 bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-500 rounded transition cursor-pointer"
                          title="View Repayments"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-500 dark:text-slate-400 font-semibold">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Type</span>
                        <span className="text-slate-850 dark:text-slate-205 font-bold">{loan.loanType}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Outstanding</span>
                        <span className="text-red-500 font-bold">₹{loan.outstandingPrincipal.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Share Amount</span>
                        <span className="text-slate-850 dark:text-slate-205">₹{loan.shareAmount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider">Tenure</span>
                        <span className="text-[10px] font-mono text-slate-700 dark:text-slate-300">{loan.startDate} to {loan.endDate}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* COLLECTIONS TAB SECTION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl shadow-xs overflow-hidden">
            <header className="p-3 md:px-6 md:py-4 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 text-slate-400" />
                {t('reportPage.savingsCollectionsLedger')}
              </h4>
            </header>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 pl-6 uppercase tracking-wider text-[9px]">{t('collectionPage.collectionType')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px] text-right">Opening Bal. (₹)</th>
                    <th className="p-3 uppercase tracking-wider text-[9px] text-right">Collections (₹)</th>
                    <th className="p-3 uppercase tracking-wider text-[9px] text-right">{t('reportPage.totalContributed')}</th>
                    <th className="p-3 pr-6 uppercase tracking-wider text-[9px] text-right">{t('collectionPage.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-250 font-semibold">
                  {ledgerData.collections.typesList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 italic">{t('reportPage.noSavingsDefined')}</td>
                    </tr>
                  ) : (
                    ledgerData.collections.typesList.map((type) => (
                      <tr key={type.typeId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 pl-6 font-bold text-slate-900 dark:text-white">{type.typeName}</td>
                        <td className="p-3 text-right text-slate-600 dark:text-slate-400 font-bold font-mono">₹{(type.openingBalance || 0).toFixed(2)}</td>
                        <td className="p-3 text-right text-slate-700 dark:text-slate-300 font-bold font-mono">₹{(type.collectedAmount || 0).toFixed(2)}</td>
                        <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-bold font-mono">₹{type.totalAmount.toFixed(2)}</td>
                        <td className="p-3 pr-6 text-right">
                          <button
                            onClick={() => handleViewCollectionHistory(type)}
                            disabled={type.totalAmount === 0}
                            className="px-2.5 py-1 bg-slate-950 text-white hover:bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded text-[10px] transition font-bold flex items-center gap-1 ml-auto cursor-pointer disabled:opacity-50"
                          >
                            <Eye className="w-3 h-3" />
                            <span>{t('reportPage.viewHistory')}</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {ledgerData.collections.typesList.length === 0 ? (
                <div className="p-6 text-center text-slate-400 italic text-xs">No savings defined.</div>
              ) : (
                ledgerData.collections.typesList.map((type) => (
                  <div key={type.typeId} className="p-4 flex justify-between items-center bg-white dark:bg-slate-900 gap-4 text-xs font-semibold">
                    <div className="min-w-0 space-y-0.5">
                      <span className="font-bold text-slate-900 dark:text-white text-sm block truncate">{type.typeName}</span>
                      <span className="text-[10px] text-slate-400 block font-normal">
                        Opening Bal: ₹{(type.openingBalance || 0).toFixed(2)} • Collected: ₹{(type.collectedAmount || 0).toFixed(2)}
                      </span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-sm block">Total: ₹{type.totalAmount.toFixed(2)}</span>
                    </div>

                    <button
                      onClick={() => handleViewCollectionHistory(type)}
                      disabled={type.totalAmount === 0}
                      className="px-3 py-2 bg-slate-950 text-white hover:bg-slate-900 dark:bg-indigo-600 dark:hover:bg-indigo-500 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 flex-shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>History</span>
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* EXPENSES TAB SECTION */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl shadow-xs overflow-hidden">
            <header className="p-3 md:px-6 md:py-4 border-b border-slate-200 dark:border-slate-800">
              <h4 className="text-xs md:text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />
                {t('reportPage.expensesLogged')}
              </h4>
            </header>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="p-3 pl-6 uppercase tracking-wider text-[9px]">{t('expensePage.refNo')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px]">{t('expensePage.expenseDate')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px]">{t('expensePage.description')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px] text-right">{t('expensePage.amount')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px]">{t('expensePage.paymentMode')}</th>
                    <th className="p-3 uppercase tracking-wider text-[9px]">{t('expensePage.refNo')}</th>
                    <th className="p-3 pr-6 uppercase tracking-wider text-[9px] text-center">{t('expensePage.allStatuses')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-250 font-semibold">
                  {ledgerData.expenses.list.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400 italic">{t('reportPage.noExpensesLogged')}</td>
                    </tr>
                  ) : (
                    ledgerData.expenses.list.map((expense) => (
                      <tr key={expense.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="p-3 pl-6 font-mono text-[10px] text-slate-900 dark:text-white font-bold">{expense.id}</td>
                        <td className="p-3 font-mono text-[10px]">{expense.expenseDate}</td>
                        <td className="p-3 max-w-xs truncate" title={expense.description}>{expense.description}</td>
                        <td className="p-3 text-right text-amber-600 font-bold">₹{expense.amount.toFixed(2)}</td>
                        <td className="p-3">{expense.paymentMode}</td>
                        <td className="p-3 font-mono text-[10px] text-slate-450">{expense.referenceNo || 'N/A'}</td>
                        <td className="p-3 pr-6 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${expense.status === 'Approved'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400'
                            : expense.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-500/10 dark:text-rose-455'
                              : 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-500/10 dark:text-amber-455'
                            }`}>
                            {expense.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {ledgerData.expenses.list.length === 0 ? (
                <div className="p-6 text-center text-slate-400 italic text-xs">No expenses logged by this member.</div>
              ) : (
                ledgerData.expenses.list.map((expense) => (
                  <div key={expense.id} className="p-4 space-y-2 text-xs bg-white dark:bg-slate-900 font-semibold">
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-black text-slate-900 dark:text-white">{expense.id}</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${expense.status === 'Approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400'
                        : expense.status === 'Cancelled'
                          ? 'bg-rose-50 text-rose-800 border-rose-100 dark:bg-rose-500/10 dark:text-rose-455'
                          : 'bg-amber-50 text-amber-800 border-amber-100 dark:bg-amber-500/10 dark:text-amber-455'
                        }`}>
                        {expense.status}
                      </span>
                    </div>

                    <div className="text-slate-800 dark:text-slate-200 text-xs font-bold leading-normal">
                      {expense.description}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-slate-500 dark:text-slate-400">
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-normal">Amount</span>
                        <span className="text-amber-600 font-bold">₹{expense.amount.toFixed(2)}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-normal">Date</span>
                        <span className="font-mono text-slate-700 dark:text-slate-350">{expense.expenseDate}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-normal">Payment Mode</span>
                        <span className="text-slate-700 dark:text-slate-350">{expense.paymentMode}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-normal">Ref No</span>
                        <span className="font-mono text-slate-700 dark:text-slate-350">{expense.referenceNo || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 border border-slate-200 dark:bg-slate-900 dark:border-slate-800 rounded-2xl p-16 text-center text-slate-400 dark:text-slate-500 text-xs italic font-bold">
          {isAdminOrManager ? 'Please search and select a member from the dropdown list to generate their ledger.' : 'No ledger data found.'}
        </div>
      )}

      {/* LOAN REPAYMENT HISTORY MODAL */}
      {activeRepaymentsLoan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-2xl shadow-2xl p-4 sm:p-6 relative text-slate-700 dark:text-slate-200 animate-scale-up">
            <button
              onClick={() => setActiveRepaymentsLoan(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <header className="mb-4">
              <h3 className="text-base sm:text-lg font-bold font-headline text-slate-900 dark:text-white flex items-center gap-2">
                <Calculator className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                Repayment History - Loan {activeRepaymentsLoan.loanNo}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Detailed list of all verified repayment transactions received for this member's loan share.
              </p>
            </header>

            <div className="max-h-96 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-xl">
              {loadingRepayments ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-800 dark:text-indigo-400" />
                  <p className="text-xs font-semibold mt-2">Loading payments...</p>
                </div>
              ) : repaymentsHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-450 italic">No repayments recorded for this loan yet.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 pl-4 uppercase tracking-wider text-[9px]">Due Month</th>
                      <th className="p-3 uppercase tracking-wider text-[9px]">Paid Date</th>
                      <th className="p-3 uppercase tracking-wider text-[9px] text-right">Amount</th>
                      <th className="p-3 uppercase tracking-wider text-[9px] text-right">Principal Component</th>
                      <th className="p-3 uppercase tracking-wider text-[9px] text-right">Interest Component</th>
                      <th className="p-3 pr-4 uppercase tracking-wider text-[9px]">Approved By</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-350">
                    {repaymentsHistory.map((rep) => (
                      <tr key={rep.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 pl-4">Month {rep.dueMonth}</td>
                        <td className="p-3 font-mono text-[10px]">{rep.paymentDate}</td>
                        <td className="p-3 text-right text-emerald-600">₹{rep.amount.toFixed(2)}</td>
                        <td className="p-3 text-right">₹{rep.principalPaid.toFixed(2)}</td>
                        <td className="p-3 text-right">₹{rep.interestPaid.toFixed(2)}</td>
                        <td className="p-3 pr-4">{rep.approvedBy || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setActiveRepaymentsLoan(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SAVINGS / COLLECTIONS TYPE HISTORY MODAL */}
      {activeCollectionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl p-4 sm:p-6 relative text-slate-700 dark:text-slate-200 animate-scale-up">
            <button
              onClick={() => setActiveCollectionType(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <header className="mb-4">
              <h3 className="text-base sm:text-lg font-bold font-headline text-slate-900 dark:text-white flex items-center gap-2">
                <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                History - {activeCollectionType.typeName}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Detailed timeline of all contributions made under this category.
              </p>
            </header>

            <div className="max-h-80 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-xl">
              {loadingCollections ? (
                <div className="py-12 text-center text-slate-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto text-slate-800 dark:text-indigo-400" />
                  <p className="text-xs font-semibold mt-2">Loading contributions...</p>
                </div>
              ) : collectionHistory.length === 0 ? (
                <div className="p-8 text-center text-slate-450 italic">No savings logged under this category.</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-bold border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="p-3 pl-4 uppercase tracking-wider text-[9px]">Collection Date</th>
                      <th className="p-3 pr-4 uppercase tracking-wider text-[9px] text-right">Contributed Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-350">
                    {collectionHistory.map((col) => (
                      <tr key={col.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="p-3 pl-4 font-mono text-[10px]">{col.date}</td>
                        <td className="p-3 pr-4 text-right text-emerald-600">₹{col.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-4 flex justify-end">
              <button
                onClick={() => setActiveCollectionType(null)}
                className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
