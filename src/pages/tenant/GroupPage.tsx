import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
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
  Hash
} from 'lucide-react';

interface Group {
  id: number;
  name: string;
  code: string;
  status: 'Active' | 'Inactive';
  createdAt?: string;
  updatedAt?: string;
}

export default function GroupPage() {
  const { t } = useTranslation();
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Group | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    status: 'Active' as 'Active' | 'Inactive'
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<Group | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchGroups();
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

  const fetchGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/groups', {
        headers: getSubdomainHeader()
      });
      if (!res.ok) {
        throw new Error('Failed to fetch groups list.');
      }
      const data = await res.json();
      setGroups(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching groups.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormError('');
    setFormData({
      name: '',
      code: '',
      status: 'Active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (group: Group) => {
    setEditingItem(group);
    setFormError('');
    setFormData({
      name: group.name,
      code: group.code,
      status: group.status
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Group name is required.');
      return;
    }
    if (!formData.code.trim()) {
      setFormError('Group code is required.');
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/groups/${editingItem.id}`
        : '/api/groups';
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
        throw new Error(data.error || 'Failed to save group.');
      }

      showToast(
        editingItem
          ? `Group "${formData.name}" updated successfully.`
          : `Created Group "${formData.name}" successfully.`,
        'success'
      );
      setIsModalOpen(false);
      fetchGroups();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getSubdomainHeader()
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete group.');
      }

      showToast(`Group "${deleteTarget.name}" deleted successfully.`, 'success');
      setDeleteTarget(null);
      fetchGroups();
    } catch (err: any) {
      showToast(err.message || 'Error deleting group.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Groups
  const filteredGroups = groups.filter(g => {
    const matchesSearch =
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' ? true : g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // KPI Calculations
  const totalGroups = groups.length;
  const activeGroups = groups.filter(g => g.status === 'Active').length;
  const inactiveGroups = groups.filter(g => g.status === 'Inactive').length;

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
            <Users className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('organizationPage.groupTitle')}</h1>
            <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-1 sm:line-clamp-none">
              {t('organizationPage.groupSub')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={fetchGroups}
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
            <span>{t('organizationPage.addGroup')}</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 lg:gap-5">
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{t('organizationPage.totalGroups')}</span>
            <div className="p-1.5 sm:p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-500">
              <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white mt-1 sm:mt-2">{totalGroups}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">{t('organizationPage.totalGroups')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{t('organizationPage.activeGroups')}</span>
            <div className="p-1.5 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg sm:rounded-xl text-emerald-500">
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-2">{activeGroups}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">{t('organizationPage.activeGroups')}</p>
        </div>

        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{t('organizationPage.inactiveGroups')}</span>
            <div className="p-1.5 sm:p-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-slate-400">
              <XCircle className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-black text-slate-600 dark:text-slate-400 mt-1 sm:mt-2">{inactiveGroups}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">{t('organizationPage.inactiveGroups')}</p>
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
            onClick={fetchGroups}
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
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3 sm:left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search group by name or code..."
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

          {/* Status Filter */}
          <div className="flex items-center justify-between sm:justify-start gap-2">
            <span className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">Filter:</span>
            <div className="flex items-center p-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg sm:rounded-xl">
              {(['All', 'Active', 'Inactive'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-md sm:rounded-lg text-xs sm:text-sm font-bold transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* MOBILE APP CARD LIST VIEW (< 640px) */}
        <div className="block sm:hidden divide-y divide-slate-200 dark:divide-slate-800/60 p-2">
          {loading ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading groups...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No groups found</p>
            </div>
          ) : (
            filteredGroups.map((g) => (
              <div key={g.id} className="p-3.5 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl my-2 border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono font-bold text-[10px] tracking-wider mb-1">
                      <Hash className="w-2.5 h-2.5 text-indigo-500" /> {g.code}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{g.name}</h4>
                  </div>

                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    g.status === 'Active'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                  }`}>
                    {g.status}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
                  <button
                    onClick={() => handleOpenEditModal(g)}
                    className="px-2.5 py-1 bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 rounded-lg text-[11px] font-bold border border-indigo-500/20 flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(g)}
                    className="p-1 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/20"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
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
                <th className="py-4 px-6 whitespace-nowrap w-44">Group Code</th>
                <th className="py-4 px-6 whitespace-nowrap">Group Name</th>
                <th className="py-4 px-6 text-center whitespace-nowrap">Status</th>
                <th className="py-4 px-6 text-right pr-8 whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      <p className="text-sm font-medium">Loading groups list...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-9 h-9 text-slate-400 dark:text-slate-600 mb-1" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No groups found</p>
                      <p className="text-xs text-slate-500">
                        {search || statusFilter !== 'All'
                          ? 'Try adjusting your search query or filter.'
                          : 'Click "Add Group" to create the first group for this tenant.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredGroups.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4.5 px-6 font-mono font-bold whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-300 tracking-wider whitespace-nowrap shrink-0">
                        <Hash className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                        {g.code}
                      </span>
                    </td>

                    <td className="py-4.5 px-6 font-bold text-slate-900 dark:text-white text-sm">
                      {g.name}
                    </td>

                    <td className="py-4.5 px-6 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold ${
                        g.status === 'Active'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-300 dark:border-slate-700'
                      }`}>
                        {g.status === 'Active' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                        {g.status}
                      </span>
                    </td>

                    <td className="py-4.5 px-6 text-right pr-8">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => handleOpenEditModal(g)}
                          className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-xs font-bold text-indigo-600 dark:text-indigo-300 transition cursor-pointer"
                          title="Edit Group Details"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => setDeleteTarget(g)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 transition cursor-pointer"
                          title="Delete Group"
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="p-1.5 sm:p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-500">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white">
                    {editingItem ? `${t('organizationPage.editGroup')}: ${editingItem.name}` : t('organizationPage.createGroup')}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {t('organizationPage.configureGroupSub')}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Banner */}
            {formError && (
              <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs sm:text-sm text-rose-600 dark:text-rose-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSave} className="space-y-4 sm:space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1 sm:space-y-1.5 sm:col-span-2">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                    {t('organizationPage.groupName')} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Self Help Group A1"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

                <div className="space-y-1 sm:space-y-1.5">
                  <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                    <Hash className="w-3.5 h-3.5 text-indigo-500" />
                    <span>{t('organizationPage.groupCode')} <span className="text-rose-500">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. GRP-A1"
                    className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-mono font-bold text-indigo-600 dark:text-indigo-300 uppercase focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>

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
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold transition"
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
                    <span>{editingItem ? t('common.save') : t('organizationPage.createGroup')}</span>
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
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{t('organizationPage.deleteGroupTitle')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Delete group <strong className="text-slate-900 dark:text-white">"{deleteTarget.name}"</strong>?
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
