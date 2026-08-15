import React, { useState, useEffect } from 'react';
import {
  Building2,
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
  Hash,
  Tags,
  FileText,
  Layers,
  ArrowUpDown
} from 'lucide-react';

interface OrganizationType {
  id: number;
  typeName: string;
  code: string;
  description?: string;
  status: 'Active' | 'Inactive';
  orderNumber: number;
  createdAt?: string;
  updatedAt?: string;
  tenantCount?: number;
}

export default function AdminOrganizationTypes() {
  const [types, setTypes] = useState<OrganizationType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'Inactive'>('All');

  // Add / Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<OrganizationType | null>(null);
  const [formData, setFormData] = useState({
    typeName: '',
    code: '',
    description: '',
    status: 'Active' as 'Active' | 'Inactive',
    orderNumber: 1
  });
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete Modal
  const [deleteTarget, setDeleteTarget] = useState<OrganizationType | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Toggling status state
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    fetchOrganizationTypes();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrganizationTypes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/organization-types');
      if (!res.ok) {
        throw new Error('Failed to fetch organization types.');
      }
      const data = await res.json();
      setTypes(data);
    } catch (err: any) {
      setError(err.message || 'Error fetching organization types.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormError('');
    const nextOrder = types.length > 0
      ? Math.max(...types.map(t => t.orderNumber || 0)) + 1
      : 1;
    setFormData({
      typeName: '',
      code: '',
      description: '',
      status: 'Active',
      orderNumber: nextOrder
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: OrganizationType) => {
    setEditingItem(item);
    setFormError('');
    setFormData({
      typeName: item.typeName,
      code: item.code,
      description: item.description || '',
      status: item.status,
      orderNumber: item.orderNumber || 0
    });
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.typeName.trim()) {
      setFormError('Organization Type Name is required.');
      return;
    }
    if (!formData.code.trim()) {
      setFormError('Organization Type Code is required.');
      return;
    }

    setSaving(true);
    try {
      const url = editingItem
        ? `/api/super-admin/organization-types/${editingItem.id}`
        : '/api/super-admin/organization-types';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeName: formData.typeName,
          code: formData.code,
          description: formData.description,
          status: formData.status,
          orderNumber: Number(formData.orderNumber) || 0
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save organization type.');
      }

      showToast(
        editingItem
          ? `Updated "${formData.typeName}" successfully.`
          : `Created new Organization Type "${formData.typeName}".`,
        'success'
      );
      setIsModalOpen(false);
      fetchOrganizationTypes();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: OrganizationType) => {
    setTogglingId(item.id);
    const newStatus = item.status === 'Active' ? 'Inactive' : 'Active';
    try {
      const res = await fetch(`/api/super-admin/organization-types/${item.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to update status.');
      }

      setTypes(prev =>
        prev.map(t => (t.id === item.id ? { ...t, status: newStatus } : t))
      );
      showToast(`Status updated to ${newStatus} for "${item.typeName}".`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to update status.', 'error');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    if (deleteTarget.tenantCount && deleteTarget.tenantCount > 0) {
      setDeleteError(`Cannot delete because ${deleteTarget.tenantCount} tenant(s) are currently assigned to this Organization Type.`);
      return;
    }

    setDeleting(true);
    setDeleteError('');
    try {
      const res = await fetch(`/api/super-admin/organization-types/${deleteTarget.id}`, {
        method: 'DELETE'
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete organization type.');
      }

      showToast(`Organization Type "${deleteTarget.typeName}" deleted.`, 'success');
      setDeleteTarget(null);
      fetchOrganizationTypes();
    } catch (err: any) {
      setDeleteError(err.message || 'Error deleting organization type.');
    } finally {
      setDeleting(false);
    }
  };

  // Filtered Items
  const filteredTypes = types.filter(t => {
    const matchesSearch =
      t.typeName.toLowerCase().includes(search.toLowerCase()) ||
      t.code.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus =
      statusFilter === 'All' ? true : t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const totalTypes = types.length;
  const activeTypes = types.filter(t => t.status === 'Active').length;
  const inactiveTypes = types.filter(t => t.status === 'Inactive').length;
  const totalMappedTenants = types.reduce((acc, curr) => acc + (curr.tenantCount || 0), 0);

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-xl border shadow-xl flex items-center gap-3 text-xs font-semibold backdrop-blur-md animate-fade-in ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/50 border border-slate-800/80 p-6 rounded-2xl backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Tags className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Organization Type Master</h1>
              <p className="text-xs text-slate-400 font-medium">
                Manage organization classifications, display order, and tenant type definitions
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchOrganizationTypes}
            disabled={loading}
            className="p-2.5 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-slate-300 hover:text-white transition cursor-pointer disabled:opacity-50"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Organization Type</span>
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Types</span>
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-white mt-2">{totalTypes}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Configured classifications</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Active Types</span>
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{activeTypes}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Available for selection</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Inactive Types</span>
            <div className="p-2 bg-slate-800 border border-slate-700/50 rounded-xl text-slate-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-400 mt-2">{inactiveTypes}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Disabled / Legacy types</p>
        </div>

        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Mapped Tenants</span>
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-black text-cyan-400 mt-2">{totalMappedTenants}</p>
          <p className="text-[10px] text-slate-500 mt-1 font-medium">Tenants assigned types</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-xs font-semibold text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchOrganizationTypes}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-200 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Filter and Table Container */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-hidden backdrop-blur-xl">
        {/* Controls Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, code, or description..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Filter Status:</span>
            <div className="flex items-center p-1 bg-slate-950/60 border border-slate-800 rounded-xl">
              {(['All', 'Active', 'Inactive'] as const).map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    statusFilter === st
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/70 border-b border-slate-800/80 text-[11px] uppercase tracking-wider text-slate-400 font-bold">
              <tr>
                <th className="py-3.5 px-4 w-20 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <ArrowUpDown className="w-3 h-3 text-indigo-400" />
                    <span>Order</span>
                  </div>
                </th>
                <th className="py-3.5 px-4 w-28">Code</th>
                <th className="py-3.5 px-4">Organization Type</th>
                <th className="py-3.5 px-4">Description</th>
                <th className="py-3.5 px-4 text-center">Tenants</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right pr-6">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                      <p className="text-xs font-medium">Loading organization types...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredTypes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Tags className="w-8 h-8 text-slate-600 mb-1" />
                      <p className="text-xs font-bold text-slate-300">No organization types found</p>
                      <p className="text-[11px] text-slate-500">
                        {search || statusFilter !== 'All'
                          ? 'Try adjusting your search query or filter criteria.'
                          : 'Click "Add Organization Type" to create the first entry.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTypes.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Order Number */}
                    <td className="py-4 px-4 text-center font-extrabold text-slate-300">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-slate-800/80 border border-slate-700/60 text-indigo-300 font-mono text-xs">
                        {item.orderNumber ?? 0}
                      </span>
                    </td>

                    {/* Code Badge */}
                    <td className="py-4 px-4 font-mono font-bold">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 tracking-wider">
                        <Hash className="w-3 h-3 text-indigo-400" />
                        {item.code}
                      </span>
                    </td>

                    {/* Type Name */}
                    <td className="py-4 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span>{item.typeName}</span>
                      </div>
                    </td>

                    {/* Description */}
                    <td className="py-4 px-4 text-slate-400 max-w-xs truncate">
                      {item.description ? item.description : <span className="text-slate-600 italic">No description</span>}
                    </td>

                    {/* Tenants count */}
                    <td className="py-4 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        (item.tenantCount || 0) > 0
                          ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                          : 'bg-slate-800 text-slate-500 border border-slate-700/40'
                      }`}>
                        <Building2 className="w-3 h-3" />
                        {item.tenantCount || 0}
                      </span>
                    </td>

                    {/* Status Toggle */}
                    <td className="py-4 px-4 text-center">
                      <button
                        onClick={() => handleToggleStatus(item)}
                        disabled={togglingId === item.id}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold transition cursor-pointer ${
                          item.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            : 'bg-slate-800 text-slate-400 border border-slate-700/60 hover:bg-slate-700/60'
                        }`}
                      >
                        {togglingId === item.id ? (
                          <Loader2 className="w-3 h-3 animate-spin text-indigo-400" />
                        ) : item.status === 'Active' ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <XCircle className="w-3 h-3 text-slate-500" />
                        )}
                        <span>{item.status}</span>
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right pr-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-300 transition cursor-pointer"
                          title="Edit Organization Type"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(item)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-400 transition cursor-pointer"
                          title="Delete Organization Type"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 flex items-center justify-between text-xs text-slate-400">
          <span>
            Showing <strong className="text-white">{filteredTypes.length}</strong> of{' '}
            <strong className="text-white">{types.length}</strong> organization types
          </span>
          <span className="text-[11px] text-slate-500">
            Sorted by display order number ASC
          </span>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <Tags className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    {editingItem ? 'Edit Organization Type' : 'Add New Organization Type'}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {editingItem ? `Modify settings for "${editingItem.typeName}"` : 'Define a new organization classification master entry'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Error */}
            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Modal Body */}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Type Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Organization Type Name <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.typeName}
                    onChange={(e) => setFormData({ ...formData, typeName: e.target.value })}
                    placeholder="e.g. Society, Trust, NBFC, Microfinance / MFI"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                {/* Code */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Unique Code <span className="text-rose-400">*</span></span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SOC, TRU, NBFC"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-indigo-300 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition uppercase"
                  />
                </div>

                {/* Display Order Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Display Order Number</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={formData.orderNumber}
                    onChange={(e) => setFormData({ ...formData, orderNumber: parseInt(e.target.value, 10) || 0 })}
                    placeholder="1"
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
                  />
                </div>

                {/* Status Selection */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Status</label>
                  <div className="flex items-center gap-4 p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="modal_status"
                        checked={formData.status === 'Active'}
                        onChange={() => setFormData({ ...formData, status: 'Active' })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Active
                      </span>
                    </label>

                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                      <input
                        type="radio"
                        name="modal_status"
                        checked={formData.status === 'Inactive'}
                        onChange={() => setFormData({ ...formData, status: 'Inactive' })}
                        className="text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-slate-400 flex items-center gap-1">
                        <XCircle className="w-3.5 h-3.5" /> Inactive
                      </span>
                    </label>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-300">Description (Optional)</label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Provide details about this organization classification..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition resize-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{editingItem ? 'Save Changes' : 'Create Organization Type'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-[#0b0f19] border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete Organization Type</h3>
                <p className="text-xs text-slate-400">
                  Are you sure you want to remove <strong className="text-white">"{deleteTarget.typeName}"</strong>?
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            {deleteTarget.tenantCount && deleteTarget.tenantCount > 0 ? (
              <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl">
                ⚠️ This Organization Type is currently linked to <strong>{deleteTarget.tenantCount}</strong> tenant(s). Please reassign those tenants before deleting.
              </p>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setDeleteTarget(null);
                  setDeleteError('');
                }}
                disabled={deleting}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>

              <button
                onClick={handleDelete}
                disabled={deleting || (!!deleteTarget.tenantCount && deleteTarget.tenantCount > 0)}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
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
