import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Check,
  XCircle,
  ExternalLink,
  CreditCard,
  Calendar,
  X,
  Edit2,
  Save,
  Filter
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  adminEmail: string;
  createdDate: string;
  isActive: number; // 0 or 1
  paymentStatus: string;
  paymentDate?: string;
}

export default function TenantManagement() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended' | 'paid' | 'pending'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Edit Modal State
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    subdomain: '',
    adminEmail: '',
    paymentStatus: 'Pending',
    isActive: 1
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // AMC Billing Modal State
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [amcRecords, setAmcRecords] = useState<any[]>([]);
  const [loadingAmc, setLoadingAmc] = useState(false);
  const [amcError, setAmcError] = useState('');
  const [payingAmcId, setPayingAmcId] = useState<number | null>(null);
  const [confirmingRegId, setConfirmingRegId] = useState<string | null>(null);

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/tenants');
      if (!res.ok) {
        throw new Error('Failed to fetch tenants list.');
      }
      const data = await res.json();
      setTenants(data);
    } catch (err: any) {
      setError(err.message || 'Error loading tenants data.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (tenantId: string, currentStatus: number) => {
    setUpdatingId(tenantId);
    try {
      const newStatus = currentStatus === 1 ? 0 : 1;
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to update tenant status.');
      }

      setTenants(prev =>
        prev.map(t => (t.id === tenantId ? { ...t, isActive: newStatus } : t))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleConfirmRegPayment = async (tenantId: string) => {
    setConfirmingRegId(tenantId);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenantId}/confirm-payment`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record registration payment.');
      }

      setTenants(prev =>
        prev.map(t =>
          t.id === tenantId
            ? { ...t, paymentStatus: data.paymentStatus, paymentDate: data.paymentDate }
            : t
        )
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setConfirmingRegId(null);
    }
  };

  // Open Edit Details Modal
  const handleOpenEditModal = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setEditForm({
      name: tenant.name,
      subdomain: tenant.subdomain,
      adminEmail: tenant.adminEmail,
      paymentStatus: tenant.paymentStatus || 'Pending',
      isActive: tenant.isActive
    });
    setEditError('');
  };

  // Save Edit Details
  const handleSaveTenantDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    setSavingEdit(true);
    setEditError('');
    try {
      const res = await fetch(`/api/super-admin/tenants/${editingTenant.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update tenant details.');
      }

      setTenants(prev =>
        prev.map(t => (t.id === editingTenant.id ? { ...t, ...data.tenant } : t))
      );
      setEditingTenant(null);
    } catch (err: any) {
      setEditError(err.message || 'Error updating tenant.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleOpenBilling = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setAmcRecords([]);
    setLoadingAmc(true);
    setAmcError('');
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}/amc`);
      if (!res.ok) {
        throw new Error('Failed to load AMC billing records.');
      }
      const data = await res.json();
      setAmcRecords(data);
    } catch (err: any) {
      setAmcError(err.message || 'Error loading AMC records.');
    } finally {
      setLoadingAmc(false);
    }
  };

  const handlePayAmc = async (amcId: number) => {
    setPayingAmcId(amcId);
    try {
      const res = await fetch(`/api/super-admin/amc/${amcId}/pay`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update AMC status.');
      }

      setAmcRecords(prev =>
        prev.map(rec =>
          rec.id === amcId
            ? { ...rec, paidStatus: 'Paid', paidDate: data.paidDate }
            : rec
        )
      );
      fetchTenants();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPayingAmcId(null);
    }
  };

  // Filter tenants based on search query and status filter
  const filteredTenants = tenants.filter(t => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.subdomain.toLowerCase().includes(search.toLowerCase()) ||
      t.adminEmail.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (statusFilter === 'active') return t.isActive === 1;
    if (statusFilter === 'suspended') return t.isActive === 0;
    if (statusFilter === 'paid') return t.paymentStatus === 'Paid';
    if (statusFilter === 'pending') return t.paymentStatus === 'Pending';

    return true;
  });

  return (
    <div className="p-2.5 sm:p-6 space-y-3 sm:space-y-6 max-w-7xl mx-auto animate-fade-in text-slate-200 font-sans w-full max-w-full overflow-x-hidden">
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-base sm:text-2xl font-extrabold font-headline text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
            <span>Tenants Registry</span>
          </h1>
          <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 line-clamp-1 sm:line-clamp-none">
            Manage organization accounts, update details, confirm registration payments, and AMC renewals.
          </p>
        </div>

        <button
          onClick={fetchTenants}
          disabled={loading}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 sm:px-4 sm:py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white rounded-xl text-[11px] sm:text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-2.5 justify-between items-stretch sm:items-center bg-[#0d1322] p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-800/80">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search organization, subdomain..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
          />
        </div>

        {/* Status Filter Dropdown Select */}
        <div className="relative flex items-center shrink-0">
          <Filter className="w-3.5 h-3.5 text-indigo-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto bg-[#070b13] border border-slate-700/80 rounded-xl pl-8 pr-8 py-1.5 text-xs text-white font-semibold focus:outline-none focus:border-indigo-500 cursor-pointer transition appearance-none"
          >
            <option value="all">Filter: All Organizations</option>
            <option value="active">Filter: Active Only</option>
            <option value="suspended">Filter: Suspended Only</option>
            <option value="paid">Filter: Paid License Only</option>
            <option value="pending">Filter: Payment Pending Only</option>
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 text-[9px]">
            ▼
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* MOBILE APP-STYLE CARD LIST VIEW (< lg screens) */}
      <div className="block lg:hidden space-y-2.5">
        {loading ? (
          <div className="p-6 text-center text-slate-500 bg-[#0d1322] border border-slate-800 rounded-xl">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
            <span className="text-xs">Loading tenant organizations...</span>
          </div>
        ) : filteredTenants.length === 0 ? (
          <div className="p-6 text-center text-slate-500 bg-[#0d1322] border border-slate-800 rounded-xl text-xs font-medium">
            No matching organization records found.
          </div>
        ) : (
          filteredTenants.map(t => {
            const port = window.location.port ? `:${window.location.port}` : '';
            const domainHost = window.location.hostname.includes('.')
              ? window.location.hostname.split('.').slice(1).join('.')
              : window.location.hostname;
            const tenantUrl = `http://${t.subdomain}.${domainHost}${port}`;

            return (
              <div key={t.id} className="bg-[#0d1322] border border-slate-800/90 rounded-xl p-3 shadow-md space-y-2.5">
                {/* Header: Name, Subdomain, Active Badge */}
                <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-8 h-8 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center text-xs font-bold shrink-0">
                      🏛️
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white leading-tight truncate">{t.name}</h4>
                      <div className="flex items-center gap-1 font-mono text-[10px] text-indigo-400 mt-0.5">
                        <span className="truncate">{t.subdomain}</span>
                        <a href={tenantUrl} target="_blank" rel="noopener noreferrer" className="p-0.5 hover:text-white shrink-0">
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${
                      t.isActive === 1
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {t.isActive === 1 ? 'Active' : 'Suspended'}
                  </span>
                </div>

                {/* Details grid: Admin contact & Payment status */}
                <div className="grid grid-cols-2 gap-2 text-[10px] bg-[#070b13] p-2 rounded-lg border border-slate-800/60">
                  <div className="min-w-0">
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Admin Email</span>
                    <span className="text-slate-300 font-medium truncate block" title={t.adminEmail}>{t.adminEmail}</span>
                  </div>

                  <div>
                    <span className="text-slate-500 block text-[9px] font-bold uppercase">Reg. Payment</span>
                    {t.paymentStatus === 'Paid' ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Paid
                      </span>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> Pending
                        </span>
                        <button
                          onClick={() => handleConfirmRegPayment(t.id)}
                          disabled={confirmingRegId === t.id}
                          className="text-[9px] font-bold text-cyan-400 underline ml-0.5 cursor-pointer"
                        >
                          Mark Paid
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action buttons on Mobile */}
                <div className="flex items-center justify-between gap-1.5 pt-0.5">
                  <button
                    onClick={() => handleOpenEditModal(t)}
                    className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-lg border border-slate-700 text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>

                  <button
                    onClick={() => handleOpenBilling(t)}
                    className="flex-1 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-lg text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>AMC</span>
                  </button>

                  <button
                    onClick={() => handleToggleStatus(t.id, t.isActive)}
                    disabled={updatingId === t.id}
                    className={`py-1.5 px-3 rounded-lg border text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50 ${
                      t.isActive === 1
                        ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                    }`}
                  >
                    {updatingId === t.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : t.isActive === 1 ? (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>Suspend</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3 h-3" />
                        <span>Activate</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* DESKTOP TENANTS TABLE (>= lg screens) */}
      <div className="hidden lg:block bg-[#0d1322] border border-slate-800/80 rounded-xl sm:rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#070b13] text-slate-400 font-bold uppercase tracking-wider text-[9px] sm:text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Subdomain</th>
                <th className="px-6 py-4">Admin Email</th>
                <th className="px-6 py-4">Reg. Date</th>
                <th className="px-6 py-4 text-center">Payment</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-indigo-400" />
                    <span>Loading registered tenant organizations...</span>
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    No matching organization records found.
                  </td>
                </tr>
              ) : (
                filteredTenants.map(t => {
                  const port = window.location.port ? `:${window.location.port}` : '';
                  const domainHost = window.location.hostname.includes('.')
                    ? window.location.hostname.split('.').slice(1).join('.')
                    : window.location.hostname;
                  const tenantUrl = `http://${t.subdomain}.${domainHost}${port}`;

                  return (
                    <tr key={t.id} className="hover:bg-slate-900/40 transition">
                      <td className="px-6 py-4 font-bold text-white">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg flex items-center justify-center text-xs">
                            🏛️
                          </span>
                          <span>{t.name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-mono">
                        <div className="flex items-center gap-1.5 text-indigo-400">
                          <span>{t.subdomain}</span>
                          <a
                            href={tenantUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 hover:text-white transition"
                            title={`Open ${tenantUrl}`}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-slate-400 font-medium">{t.adminEmail}</td>

                      <td className="px-6 py-4 text-slate-400 whitespace-nowrap">
                        {t.createdDate
                          ? new Date(t.createdDate).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric'
                            })
                          : 'N/A'}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {t.paymentStatus === 'Paid' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3 h-3" /> Paid
                          </span>
                        ) : (
                          <div className="flex flex-col items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              <AlertTriangle className="w-3 h-3" /> Pending
                            </span>
                            <button
                              onClick={() => handleConfirmRegPayment(t.id)}
                              disabled={confirmingRegId === t.id}
                              className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 underline cursor-pointer disabled:opacity-50"
                            >
                              {confirmingRegId === t.id ? 'Confirming...' : 'Mark Paid'}
                            </button>
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                            t.isActive === 1
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-red-500/10 text-red-400 border-red-500/20'
                          }`}
                        >
                          {t.isActive === 1 ? 'Active' : 'Suspended'}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-white rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="Edit Tenant Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>

                          <button
                            onClick={() => handleOpenBilling(t)}
                            className="p-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 hover:text-white rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                            title="Manage AMC Renewals"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            <span>AMC</span>
                          </button>

                          <button
                            onClick={() => handleToggleStatus(t.id, t.isActive)}
                            disabled={updatingId === t.id}
                            className={`p-1.5 rounded-lg border transition text-[11px] font-semibold flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                              t.isActive === 1
                                ? 'bg-red-500/10 hover:bg-red-500/20 border-red-500/20 text-red-400'
                                : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/20 text-emerald-400'
                            }`}
                            title={t.isActive === 1 ? 'Suspend Workspace' : 'Activate Workspace'}
                          >
                            {updatingId === t.id ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : t.isActive === 1 ? (
                              <>
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Suspend</span>
                              </>
                            ) : (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Activate</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT TENANT DETAILS MODAL */}
      {editingTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-sm sm:max-w-lg shadow-2xl p-4 sm:p-6 relative text-slate-200 animate-scale-up max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setEditingTenant(null)}
              className="absolute top-3.5 right-3.5 p-1.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <header className="mb-4">
              <h3 className="text-base sm:text-lg font-bold font-headline text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                Edit Tenant Organization Details
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Modify organization settings, subdomain, admin contact email, and active status.
              </p>
            </header>

            {editError && (
              <div className="p-2.5 mb-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveTenantDetails} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Organization Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Subdomain Slug</label>
                <input
                  type="text"
                  required
                  value={editForm.subdomain}
                  onChange={e => setEditForm({ ...editForm, subdomain: e.target.value })}
                  className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Admin Email Address</label>
                <input
                  type="email"
                  required
                  value={editForm.adminEmail}
                  onChange={e => setEditForm({ ...editForm, adminEmail: e.target.value })}
                  className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Registration Payment</label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={e => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Paid">Paid</option>
                    <option value="Pending">Pending</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Workspace Status</label>
                  <select
                    value={editForm.isActive}
                    onChange={e => setEditForm({ ...editForm, isActive: Number(e.target.value) })}
                    className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-2.5 py-2 text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value={1}>Active</option>
                    <option value={0}>Suspended</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTenant(null)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {savingEdit ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AMC BILLING RECORDS MODAL */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0d1322] border border-slate-800 rounded-2xl w-full max-w-sm sm:max-w-2xl shadow-2xl p-4 sm:p-6 relative text-slate-200 animate-scale-up max-h-[92vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTenant(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>

            <header className="mb-6">
              <h3 className="text-lg font-bold font-headline text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" />
                AMC Renewal History & Charges
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Organization: <strong className="text-white">{selectedTenant.name}</strong> ({selectedTenant.subdomain})
              </p>
            </header>

            {amcError && (
              <div className="p-3 mb-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
                {amcError}
              </div>
            )}

            {/* MOBILE AMC CARDS (< md screens) */}
            <div className="block md:hidden space-y-2 max-h-72 overflow-y-auto">
              {loadingAmc ? (
                <div className="p-4 text-center text-slate-500 text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-400" />
                  <span>Loading AMC records...</span>
                </div>
              ) : amcRecords.length === 0 ? (
                <div className="p-4 text-center text-slate-500 text-xs bg-[#070b13] rounded-xl border border-slate-800">
                  No AMC records generated yet for this organization.
                </div>
              ) : (
                amcRecords.map(record => (
                  <div key={record.id} className="bg-[#070b13] border border-slate-800 rounded-xl p-2.5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-white">₹{record.amcCharge.toFixed(2)}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                          record.paidStatus === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {record.paidStatus}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>Due: {new Date(record.dueDate).toLocaleDateString()}</span>
                      <span>Paid: {record.paidDate ? new Date(record.paidDate).toLocaleDateString() : '-'}</span>
                    </div>

                    {record.paidStatus !== 'Paid' && (
                      <div className="pt-1 flex justify-end">
                        <button
                          onClick={() => handlePayAmc(record.id)}
                          disabled={payingAmcId === record.id}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer disabled:opacity-50"
                        >
                          {payingAmcId === record.id ? 'Processing...' : 'Mark Paid'}
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* DESKTOP AMC TABLE (>= md screens) */}
            <div className="hidden md:block overflow-x-auto border border-slate-800 rounded-xl max-h-80">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#070b13] text-slate-400 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="px-4 py-3">Charge Amount</th>
                    <th className="px-4 py-3">Due Date</th>
                    <th className="px-4 py-3">Paid Date</th>
                    <th className="px-4 py-3">Payment Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {loadingAmc ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-1 text-indigo-400" />
                        <span>Loading AMC records...</span>
                      </td>
                    </tr>
                  ) : amcRecords.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        No Annual Maintenance Charge (AMC) records generated yet for this organization.
                      </td>
                    </tr>
                  ) : (
                    amcRecords.map(record => (
                      <tr key={record.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 font-mono font-bold text-white">
                          ₹{record.amcCharge.toFixed(2)}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {new Date(record.dueDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="px-4 py-3 font-mono text-slate-400">
                          {record.paidDate
                            ? new Date(record.paidDate).toLocaleDateString(undefined, {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              })
                            : '-'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                              record.paidStatus === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            }`}
                          >
                            {record.paidStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {record.paidStatus !== 'Paid' ? (
                            <button
                              onClick={() => handlePayAmc(record.id)}
                              disabled={payingAmcId === record.id}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition cursor-pointer disabled:opacity-50"
                            >
                              {payingAmcId === record.id ? 'Processing...' : 'Mark Paid'}
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[10px]">Settled</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
