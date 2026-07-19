import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Layers,
  CheckCircle,
  AlertTriangle,
  Plus,
  RefreshCw,
  Search,
  Check,
  XCircle,
  ExternalLink,
  CreditCard,
  IndianRupee,
  Calendar,
  X,
  Clock
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

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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

      // Update local state
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

      // Update local tenant list
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

      // Update local modal list
      setAmcRecords(prev =>
        prev.map(rec =>
          rec.id === amcId
            ? { ...rec, paidStatus: data.paidStatus, paidDate: data.paidDate }
            : rec
        )
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setPayingAmcId(null);
    }
  };

  // Filter list
  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(search.toLowerCase()) ||
    t.adminEmail.toLowerCase().includes(search.toLowerCase()) ||
    t.id.toLowerCase().includes(search.toLowerCase())
  );

  // Stats calculation
  const totalCount = tenants.length;
  const activeCount = tenants.filter(t => t.isActive === 1).length;
  const suspendedCount = totalCount - activeCount;

  const getSubdomainUrl = (subdomain: string) => {
    const portStr = window.location.port ? `:${window.location.port}` : '';
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    
    if (parts.length === 2 && parts[1] === 'localhost') {
      return `http://${subdomain}.localhost${portStr}/login`;
    }
    
    const mainHost = parts.length > 2 ? parts.slice(1).join('.') : hostname;
    return `http://${subdomain}.${mainHost}${portStr}/login`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-8">
      {/* Page Title */}
      <div>
        <h3 className="text-xl sm:text-2xl font-bold text-white font-headline">Tenants Registry</h3>
        <p className="text-xs text-slate-400 mt-1">Monitor tenant spaces, billing statuses, and search registrations.</p>
      </div>

      {/* Error Callout */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex gap-2 text-xs text-red-400 font-semibold items-center animate-shake">
          <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-550/20 rounded-xl text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tenants</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-0.5">{totalCount}</h3>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-555/20 rounded-xl text-emerald-400">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Active Workspace Areas</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-0.5">{activeCount}</h3>
          </div>
        </div>

        <div className="bg-slate-900/30 border border-slate-800/80 rounded-2xl p-5 flex items-center gap-4">
          <div className="p-3 bg-red-500/10 border border-red-555/20 rounded-xl text-rose-455">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">Suspended Areas</p>
            <h3 className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-0.5">{suspendedCount}</h3>
          </div>
        </div>
      </div>

      {/* Content Card */}
      <div className="bg-slate-900/30 border border-slate-800/85 rounded-2xl overflow-hidden flex flex-col shadow-xl">
        
        {/* Action Header bar */}
        <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white font-headline">Platform Registrations</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">Manage subdomains, toggle status parameters, and monitor administrative contacts.</p>
          </div>

          <div className="flex w-full sm:w-auto items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Filter registrations..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full sm:w-64 pl-9 pr-4 py-2 bg-slate-955/40 border border-slate-800/80 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
            <button
              onClick={fetchTenants}
              disabled={loading}
              className="p-2 border border-slate-800 hover:bg-slate-900 rounded-xl text-slate-400 hover:text-white transition cursor-pointer disabled:opacity-50"
              title="Refresh Table"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => navigate('/register-tenant')}
              className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-cyan-550 hover:from-indigo-650 hover:to-cyan-650 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Tenant</span>
            </button>
          </div>
        </div>

        {/* Listing Table (Desktop) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/40 text-slate-455 font-bold border-b border-slate-800/80 uppercase tracking-wider text-[10px]">
                <th className="p-4 pl-6">ID</th>
                <th className="p-4">Organization Space</th>
                <th className="p-4">Subdomain / Domain Link</th>
                <th className="p-4">Admin Email</th>
                <th className="p-4">Reg. Billing</th>
                <th className="p-4 text-center">Status</th>
                <th className="p-4 pr-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850/60 font-medium text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-550 font-bold">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-500" />
                    Loading workspace registry data...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-slate-500 italic">
                    No matching records located in registry database.
                  </td>
                </tr>
              ) : (
                filteredTenants.map(tenant => (
                  <tr
                    key={tenant.id}
                    className="hover:bg-slate-800/20 border-b border-slate-850/40 transition duration-150"
                  >
                    <td className="p-4 pl-6 font-mono font-bold text-slate-500 text-[10px]">
                      {tenant.id}
                    </td>
                    <td className="p-4 font-bold text-white">
                      {tenant.name}
                    </td>
                    <td className="p-4 font-mono">
                      <a
                        href={getSubdomainUrl(tenant.subdomain)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1.5"
                      >
                        <span>{tenant.subdomain}.capitaltrust</span>
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </a>
                    </td>
                    <td className="p-4">
                      {tenant.adminEmail}
                    </td>
                    <td className="p-4 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold border ${
                            tenant.paymentStatus === 'Paid'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                          }`}
                        >
                          {tenant.paymentStatus === 'Paid' ? 'PAID' : 'PENDING'}
                        </span>
                        {tenant.paymentStatus !== 'Paid' && (
                          <button
                            disabled={confirmingRegId !== null}
                            onClick={() => handleConfirmRegPayment(tenant.id)}
                            className="px-2 py-0.5 bg-slate-950 border border-slate-800 hover:border-slate-650 hover:bg-slate-900 rounded text-[8px] font-bold text-indigo-400 transition cursor-pointer"
                          >
                            {confirmingRegId === tenant.id ? 'Recording...' : 'Mark Paid'}
                          </button>
                        )}
                      </div>
                      {tenant.paymentDate && (
                        <p className="text-[9px] font-mono text-slate-500">
                          {new Date(tenant.paymentDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                          tenant.isActive === 1
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {tenant.isActive === 1 ? 'ACTIVE' : 'SUSPENDED'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleOpenBilling(tenant)}
                          className="px-3 py-1.5 border border-slate-800 hover:bg-slate-900 rounded-lg text-[10px] font-bold uppercase text-slate-400 hover:text-white transition cursor-pointer flex items-center gap-1"
                          title="View AMC details"
                        >
                          <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                          <span>AMC Billing</span>
                        </button>
                        <button
                          disabled={updatingId !== null}
                          onClick={() => handleToggleStatus(tenant.id, tenant.isActive)}
                          className={`px-3 py-1.5 border rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer min-w-[85px] ${
                            tenant.isActive === 1
                              ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-red-400'
                              : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400'
                          }`}
                        >
                          {updatingId === tenant.id ? (
                            <RefreshCw className="w-3 h-3 animate-spin" />
                          ) : tenant.isActive === 1 ? (
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
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile listing cards */}
        <div className="block md:hidden divide-y divide-slate-850/60">
          {loading ? (
            <div className="p-12 text-center text-slate-550 font-bold">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-500" />
              Loading registry...
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="p-12 text-center text-slate-500 italic">
              No matching records.
            </div>
          ) : (
            filteredTenants.map(tenant => (
              <div key={tenant.id} className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-sm font-bold text-white">{tenant.name}</h4>
                    <p className="text-[10px] font-mono text-slate-500">#{tenant.id}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[8px] font-bold border ${
                      tenant.isActive === 1
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {tenant.isActive === 1 ? 'ACTIVE' : 'SUSPENDED'}
                  </span>
                </div>

                <div className="space-y-1 font-mono text-[10px] text-slate-400">
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase text-[9px]">Domain</span>
                    <a
                      href={getSubdomainUrl(tenant.subdomain)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400"
                    >
                      {tenant.subdomain}.capitaltrust
                    </a>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 uppercase text-[9px]">Admin Email</span>
                    <span>{tenant.adminEmail}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-500 uppercase text-[9px]">Reg. Payment</span>
                    <div className="flex gap-1.5 items-center">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[8px] font-bold border ${
                          tenant.paymentStatus === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                        }`}
                      >
                        {tenant.paymentStatus === 'Paid' ? 'PAID' : 'PENDING'}
                      </span>
                      {tenant.paymentStatus !== 'Paid' && (
                        <button
                          disabled={confirmingRegId !== null}
                          onClick={() => handleConfirmRegPayment(tenant.id)}
                          className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 hover:border-slate-700 text-[8px] font-bold text-indigo-455 rounded transition"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    onClick={() => handleOpenBilling(tenant)}
                    className="flex-1 py-2 border border-slate-800 hover:bg-slate-900 rounded-lg text-[10px] font-bold uppercase text-slate-400 hover:text-white transition flex justify-center items-center gap-1.5 cursor-pointer"
                  >
                    <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                    <span>AMC Billing</span>
                  </button>
                  <button
                    disabled={updatingId !== null}
                    onClick={() => handleToggleStatus(tenant.id, tenant.isActive)}
                    className={`flex-1 py-2 border rounded-lg text-[10px] font-bold uppercase transition flex items-center justify-center gap-1.5 cursor-pointer ${
                      tenant.isActive === 1
                        ? 'border-red-500/30 bg-red-500/5 hover:bg-red-500/15 text-red-400'
                        : 'border-emerald-500/30 bg-emerald-500/5 hover:bg-emerald-500/15 text-emerald-400'
                    }`}
                  >
                    {updatingId === tenant.id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : tenant.isActive === 1 ? (
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
              </div>
            ))
          )}
        </div>

      </div>

      {/* AMC BILLING HISTORY MODAL */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[#0c1220] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden p-6 space-y-4">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-3 border-b border-slate-800/80">
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white font-headline flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>AMC Billing History</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Annual maintenance invoicing logs for workspace <span className="text-white font-semibold">"{selectedTenant.name}"</span>
                </p>
              </div>
              <button
                onClick={() => setSelectedTenant(null)}
                className="p-1 hover:bg-slate-800 rounded-md text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Error */}
            {amcError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3.5 flex gap-2 text-xs font-semibold items-center">
                <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <span>{amcError}</span>
              </div>
            )}

            {/* Modal Content */}
            <div className="overflow-x-auto max-h-96">
              {loadingAmc ? (
                <div className="py-12 text-center text-slate-500 font-bold">
                  <RefreshCw className="w-7 h-7 animate-spin mx-auto mb-2 text-indigo-400" />
                  <span>Loading maintenance billing details...</span>
                </div>
              ) : amcRecords.length === 0 ? (
                <div className="py-12 text-center text-slate-500 italic text-xs">
                  No AMC records generated yet. Set registration payment to 'Paid' first.
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-950/40 text-slate-400 font-bold border-b border-slate-800/80 uppercase tracking-wider text-[9px]">
                      <th className="p-3 pl-4">Billing ID</th>
                      <th className="p-3">AMC Charge</th>
                      <th className="p-3">Due Date</th>
                      <th className="p-3">Paid Date</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 font-medium text-slate-350">
                    {amcRecords.map(record => (
                      <tr key={record.id} className="hover:bg-slate-800/10 border-b border-slate-850/40 transition">
                        <td className="p-3 pl-4 font-mono text-[10px] text-slate-550">
                          #{record.id}
                        </td>
                        <td className="p-3 font-bold text-white font-mono flex items-center gap-0.5">
                          <IndianRupee className="w-3.5 h-3.5 text-slate-500" />
                          <span>{record.amcCharge.toFixed(2)}</span>
                        </td>
                        <td className="p-3 font-mono text-[10px]">
                          {new Date(record.dueDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-400">
                          {record.paidDate ? new Date(record.paidDate).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold border ${
                              record.paidStatus === 'Paid'
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                : 'bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse'
                            }`}
                          >
                            {record.paidStatus === 'Paid' ? 'SETTLED' : 'DUE'}
                          </span>
                        </td>
                        <td className="p-3 pr-4 text-right">
                          {record.paidStatus !== 'Paid' ? (
                            <button
                              disabled={payingAmcId !== null}
                              onClick={() => handlePayAmc(record.id)}
                              className="px-2.5 py-1 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-500/25 hover:border-emerald-500 hover:bg-emerald-500/20 rounded text-[9px] font-bold text-emerald-400 transition cursor-pointer flex items-center justify-end gap-1 ml-auto"
                            >
                              {payingAmcId === record.id ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Check className="w-3 h-3" />
                                  <span>Mark Settled</span>
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-[10px] text-slate-500 italic">No action</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-3 border-t border-slate-800/80">
              <button
                onClick={() => setSelectedTenant(null)}
                className="px-4 py-2 border border-slate-800 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Close Panel
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
