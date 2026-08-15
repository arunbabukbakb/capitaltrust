import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Landmark,
  Plus,
  Search,
  Edit3,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Star,
  CreditCard,
  Check
} from 'lucide-react';

interface BankAccount {
  id: number;
  name: string;
  branch: string;
  accountNumber: string;
  ifsc: string;
  address?: string;
  status: 'Active' | 'Inactive';
  isPrimary: number;
  createdAt?: string;
  updatedAt?: string;
}

export default function BankPage() {
  const { t } = useTranslation();
  const [banks, setBanks] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search
  const [search, setSearch] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    branch: '',
    accountNumber: '',
    ifsc: '',
    address: '',
    status: 'Active' as 'Active' | 'Inactive',
    isPrimary: 0
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<BankAccount | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Toggling Primary state
  const [settingPrimaryId, setSettingPrimaryId] = useState<number | null>(null);

  useEffect(() => {
    fetchBanks();
  }, []);

  const getSubdomainHeader = (): Record<string, string> => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return { 'x-tenant-id': parts[0] };
    }
    return { 'x-tenant-id': 'demo' };
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchBanks = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/banks', {
        headers: getSubdomainHeader()
      });
      if (!res.ok) {
        throw new Error('Failed to fetch bank accounts.');
      }
      const data = await res.json();
      setBanks(data);
    } catch (err: any) {
      setError(err.message || 'Error loading bank accounts.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormError('');
    setFormData({
      name: '',
      branch: '',
      accountNumber: '',
      ifsc: '',
      address: '',
      status: 'Active',
      isPrimary: banks.length === 0 ? 1 : 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (bank: BankAccount) => {
    setEditingItem(bank);
    setFormError('');
    setFormData({
      name: bank.name,
      branch: bank.branch,
      accountNumber: bank.accountNumber,
      ifsc: bank.ifsc,
      address: bank.address || '',
      status: bank.status,
      isPrimary: bank.isPrimary
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Bank Name is required.');
      return;
    }
    if (!formData.branch.trim()) {
      setFormError('Branch Name is required.');
      return;
    }
    if (!formData.accountNumber.trim()) {
      setFormError('Account Number is required.');
      return;
    }
    if (!formData.ifsc.trim()) {
      setFormError('IFSC Code is required.');
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/banks/${editingItem.id}`
        : '/api/banks';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...getSubdomainHeader()
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save bank account.');
      }

      showToast(
        editingItem
          ? `Updated "${formData.name}" details successfully.`
          : `Added "${formData.name}" bank account successfully.`,
        'success'
      );
      setIsModalOpen(false);
      fetchBanks();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleSetPrimary = async (bank: BankAccount) => {
    if (bank.isPrimary === 1) return;
    setSettingPrimaryId(bank.id);

    try {
      const res = await fetch(`/api/banks/${bank.id}/primary`, {
        method: 'PATCH',
        headers: getSubdomainHeader()
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to set primary bank account.');
      }

      showToast(`"${bank.name}" set as the primary bank account.`, 'success');
      fetchBanks();
    } catch (err: any) {
      showToast(err.message || 'Error setting primary bank account.', 'error');
    } finally {
      setSettingPrimaryId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/banks/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getSubdomainHeader()
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete bank account.');
      }

      showToast(`Bank account "${deleteTarget.name}" deleted.`, 'success');
      setDeleteTarget(null);
      fetchBanks();
    } catch (err: any) {
      showToast(err.message || 'Error deleting bank account.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Banks
  const filteredBanks = banks.filter(b => {
    const q = search.toLowerCase();
    return (
      b.name.toLowerCase().includes(q) ||
      b.branch.toLowerCase().includes(q) ||
      b.accountNumber.toLowerCase().includes(q) ||
      b.ifsc.toLowerCase().includes(q)
    );
  });

  // KPI Calculations
  const totalBanks = banks.length;
  const activeBanks = banks.filter(b => b.status === 'Active').length;
  const primaryBank = banks.find(b => b.isPrimary === 1);

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-12 mt-16 sm:mt-20 px-2 sm:px-0 max-w-full overflow-x-hidden">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 sm:top-6 right-4 sm:right-6 z-50 px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold backdrop-blur-md animate-fade-in ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-6 lg:p-7 rounded-xl sm:rounded-2xl backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="p-2 sm:p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-600 dark:text-indigo-400">
            <Landmark className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('organizationPage.bankTitle')}</h1>
            <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-1 sm:line-clamp-none">
              {t('organizationPage.bankSub')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={fetchBanks}
            disabled={loading}
            className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t('organizationPage.addAccount')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{t('organizationPage.totalAccounts')}</span>
            <div className="p-1.5 sm:p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-500">
              <Landmark className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white mt-1 sm:mt-2">{totalBanks}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">{t('organizationPage.totalAccounts')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{t('organizationPage.activeAccounts')}</span>
            <div className="p-1.5 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg sm:rounded-xl text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-2">{activeBanks}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">{t('organizationPage.activeAccounts')}</p>
        </div>

        <div className="col-span-2 sm:col-span-1 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{t('organizationPage.primaryBank')}</span>
            <div className="p-1.5 sm:p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg sm:rounded-xl text-amber-500">
              <Star className="w-3.5 h-3.5 sm:w-5 sm:h-5 fill-amber-500" />
            </div>
          </div>
          <p className="text-sm sm:text-lg font-black text-amber-600 dark:text-amber-400 mt-1 sm:mt-2 truncate">
            {primaryBank ? primaryBank.name : t('organizationPage.noneSet')}
          </p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">
            {primaryBank ? `A/C: ****${primaryBank.accountNumber.slice(-4)}` : t('organizationPage.primaryBank')}
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-3.5 sm:p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchBanks}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-700 dark:text-rose-200 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Container */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl overflow-hidden backdrop-blur-xl shadow-xs">
        {/* Controls Bar */}
        <div className="p-3.5 sm:p-6 border-b border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('organizationPage.searchBankPlaceholder')}
              className="w-full pl-9 sm:pl-10 pr-4 py-2 sm:py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* MOBILE APP CARD LIST VIEW (< 640px) */}
        <div className="block sm:hidden divide-y divide-slate-200 dark:divide-slate-800/60 p-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading bank accounts...</p>
            </div>
          ) : filteredBanks.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No bank accounts found</p>
            </div>
          ) : (
            filteredBanks.map((b) => (
              <div key={b.id} className={`p-3.5 rounded-xl my-2 border shadow-xs space-y-2.5 ${
                b.isPrimary === 1
                  ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30'
                  : 'bg-slate-50/50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800/80'
              }`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg border ${
                      b.isPrimary === 1
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                        : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                    }`}>
                      <Landmark className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">{b.name}</h4>
                      <p className="text-[10px] text-slate-500 font-medium">{b.branch} Branch</p>
                    </div>
                  </div>

                  {b.isPrimary === 1 ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-extrabold">
                      <Star className="w-2.5 h-2.5 fill-amber-500" /> Primary
                    </span>
                  ) : (
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      b.status === 'Active' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {b.status}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">A/C Number</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{b.accountNumber}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">IFSC</span>
                    <span className="font-mono font-bold text-indigo-600 dark:text-indigo-300">{b.ifsc}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  {b.isPrimary === 1 ? (
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Default Settlement Bank
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSetPrimary(b)}
                      disabled={settingPrimaryId === b.id}
                      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold border border-slate-200 dark:border-slate-700 flex items-center gap-1"
                    >
                      {settingPrimaryId === b.id ? (
                        <Loader2 className="w-3 h-3 animate-spin text-amber-500" />
                      ) : (
                        <Star className="w-3 h-3 text-slate-400" />
                      )}
                      Make Primary
                    </button>
                  )}

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditModal(b)}
                      className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-lg border border-indigo-500/20"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(b)}
                      className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/20"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800/80 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
              <tr>
                <th className="py-4 px-6 whitespace-nowrap">Bank & Branch</th>
                <th className="py-4 px-6 whitespace-nowrap">Account Number</th>
                <th className="py-4 px-6 whitespace-nowrap">IFSC Code</th>
                <th className="py-4 px-6 text-center whitespace-nowrap">Primary Status</th>
                <th className="py-4 px-6 text-center whitespace-nowrap">Status</th>
                <th className="py-4 px-6 text-right pr-8 whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      <p className="text-sm font-medium">Loading bank accounts...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredBanks.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Landmark className="w-9 h-9 text-slate-400 dark:text-slate-600 mb-1" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No bank accounts configured</p>
                      <p className="text-xs text-slate-500">
                        {search
                          ? 'No bank match your search query.'
                          : 'Click "Add Bank Account" to configure settlement bank.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredBanks.map((b) => (
                  <tr key={b.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors ${
                    b.isPrimary === 1 ? 'bg-amber-500/5' : ''
                  }`}>
                    <td className="py-4.5 px-6 font-bold text-slate-900 dark:text-white">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl border ${
                          b.isPrimary === 1
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}>
                          <Landmark className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            {b.name}
                            {b.isPrimary === 1 && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs font-extrabold">
                                <Star className="w-3.5 h-3.5 fill-amber-500" /> Primary Bank
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 font-medium">{b.branch} Branch</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4.5 px-6 font-mono font-bold text-slate-900 dark:text-white text-sm">
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-indigo-500" />
                        <span>{b.accountNumber}</span>
                      </div>
                    </td>

                    <td className="py-4.5 px-6 font-mono font-bold text-indigo-600 dark:text-indigo-300 text-sm">
                      <span className="px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                        {b.ifsc}
                      </span>
                    </td>

                    <td className="py-4.5 px-6 text-center">
                      {b.isPrimary === 1 ? (
                        <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-xs font-extrabold">
                          <Check className="w-3.5 h-3.5" /> Primary Account
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetPrimary(b)}
                          disabled={settingPrimaryId === b.id}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-300 border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold transition cursor-pointer"
                        >
                          {settingPrimaryId === b.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                          ) : (
                            <Star className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Set as Primary</span>
                        </button>
                      )}
                    </td>

                    <td className="py-4.5 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ${
                        b.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}>
                        {b.status === 'Active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {b.status}
                      </span>
                    </td>

                    <td className="py-4.5 px-6 text-right pr-8">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handleOpenEditModal(b)}
                          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-300 transition cursor-pointer"
                          title="Edit Bank Details"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(b)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 transition cursor-pointer"
                          title="Delete Bank Account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Bank Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg sm:max-w-xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-8 space-y-4 sm:space-y-6 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="p-1.5 sm:p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-500">
                  <Landmark className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingItem ? t('organizationPage.editBankAccount') : t('organizationPage.addBankAccount')}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('organizationPage.bankModalSub')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Error */}
            {formError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs sm:text-sm text-rose-600 dark:text-rose-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Form Body */}
            <form onSubmit={handleSave} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-5">
                {/* Bank Name */}
                <div className="space-y-1 sm:space-y-1.5 sm:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t('organizationPage.bankName')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. HDFC Bank, State Bank of India"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Branch */}
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t('organizationPage.branchName')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.branch}
                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                    placeholder="e.g. MG Road Branch"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* IFSC Code */}
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t('organizationPage.ifscCode')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.ifsc}
                    onChange={(e) => setFormData({ ...formData, ifsc: e.target.value.toUpperCase() })}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-mono font-bold text-indigo-600 dark:text-indigo-300 uppercase focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Account Number */}
                <div className="space-y-1 sm:space-y-1.5 sm:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t('organizationPage.accountNumber')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.accountNumber}
                    onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                    placeholder="e.g. 50100234567890"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                {/* Address */}
                <div className="space-y-1 sm:space-y-1.5 sm:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">{t('organizationPage.branchAddressOptional')}</label>
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Branch address details..."
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition resize-none"
                  />
                </div>

                {/* Status */}
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">{t('organizationPage.status')}</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Is Primary Toggle */}
                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">{t('organizationPage.isPrimaryAccount')}</label>
                  <div
                    onClick={() => setFormData({ ...formData, isPrimary: formData.isPrimary === 1 ? 0 : 1 })}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 sm:px-4 sm:py-3 rounded-lg sm:rounded-xl border cursor-pointer transition select-none ${
                      formData.isPrimary === 1
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    <Star className={`w-4 h-4 ${formData.isPrimary === 1 ? 'fill-amber-500 text-amber-500' : 'text-slate-400'}`} />
                    <span className="text-xs sm:text-sm">
                      {formData.isPrimary === 1 ? t('organizationPage.primaryBankAccount') : t('organizationPage.setAsPrimary')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer"
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{t('organizationPage.saving')}</span>
                    </>
                  ) : (
                    <span>{editingItem ? t('common.save') : t('organizationPage.createBank')}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{t('organizationPage.deleteBankTitle')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Delete bank <strong className="text-slate-900 dark:text-white">"{deleteTarget.name}"</strong> ({deleteTarget.accountNumber})?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold transition"
              >
                {t('common.cancel')}
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('organizationPage.deleting')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{t('common.delete')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
