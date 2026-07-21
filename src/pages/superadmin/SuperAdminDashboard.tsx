import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  ExternalLink,
  CreditCard,
  IndianRupee,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  Coins,
  ShieldCheck,
  Zap,
  Users
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
  const [pricing, setPricing] = useState<{ price: number; tax: number; amc: number }>({ price: 0, tax: 0, amc: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    try {
      const [tenantsRes, pricingRes] = await Promise.all([
        fetch('/api/super-admin/tenants'),
        fetch('/api/super-admin/price')
      ]);

      if (!tenantsRes.ok) {
        throw new Error('Failed to fetch tenants data.');
      }
      const tenantsData = await tenantsRes.json();
      setTenants(tenantsData);

      if (pricingRes.ok) {
        const pricingData = await pricingRes.json();
        setPricing(pricingData);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  // Metrics Calculations
  const totalTenants = tenants.length;
  const activeTenants = tenants.filter(t => t.isActive === 1).length;
  const suspendedTenants = tenants.filter(t => t.isActive === 0).length;
  const paidTenants = tenants.filter(t => t.paymentStatus === 'Paid').length;
  const pendingPaymentTenants = tenants.filter(t => t.paymentStatus === 'Pending').length;

  const registrationFeeWithTax = pricing.price + (pricing.price * (pricing.tax / 100));
  const estimatedRevenue = paidTenants * registrationFeeWithTax;

  const activePercentage = totalTenants > 0 ? Math.round((activeTenants / totalTenants) * 100) : 0;
  const recentTenants = tenants.slice(0, 5);

  return (
    <div className="p-2.5 sm:p-6 space-y-4 sm:space-y-8 max-w-7xl mx-auto animate-fade-in text-slate-200 font-sans w-full max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 bg-[#0d1322] border border-slate-800/80 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-1 z-10">
          <span className="inline-block px-2.5 py-0.5 sm:px-3 sm:py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-wider rounded-full">
            Platform Master Console
          </span>
          <h1 className="text-lg sm:text-3xl font-extrabold font-headline text-white tracking-tight">
            SuperAdmin Overview & Metrics
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Real-time analytics for tenant organizations, licensing revenues, and operational health.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-lg cursor-pointer disabled:opacity-50 z-10 self-end md:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {error && (
        <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* METRIC TILES GRID (2 Cols on Mobile, 4 Cols on Desktop) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-6">
        {/* TILE 1: Total Tenants */}
        <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono truncate">
                Total Tenants
              </span>
              <div className="p-1 sm:p-2 bg-indigo-500/10 text-indigo-400 rounded-lg sm:rounded-xl border border-indigo-500/20 shrink-0">
                <Building2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-4">
              <h3 className="text-xl sm:text-4xl font-extrabold text-white font-headline">
                {totalTenants}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-semibold">
                <span className="text-emerald-400 font-bold">{activeTenants}</span> Active Workspaces
              </p>
            </div>
          </div>
          <div className="mt-2 sm:mt-5 pt-1.5 sm:pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] sm:text-[11px]">
            <span className="text-slate-400 font-medium text-[9px] sm:text-[11px]">{suspendedTenants} Suspended</span>
            <button
              onClick={() => navigate('/admin/tenants')}
              className="text-indigo-400 font-bold hover:underline flex items-center gap-0.5 text-[9px] sm:text-[11px]"
            >
              <span>View</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* TILE 2: Active Workspaces */}
        <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono truncate">
                Active Workspaces
              </span>
              <div className="p-1 sm:p-2 bg-emerald-500/10 text-emerald-400 rounded-lg sm:rounded-xl border border-emerald-500/20 shrink-0">
                <Zap className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-4">
              <h3 className="text-xl sm:text-4xl font-extrabold text-white font-headline">
                {activeTenants}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-semibold">
                <span className="text-emerald-400 font-bold">{activePercentage}%</span> Health Rate
              </p>
            </div>
          </div>
          <div className="mt-2 sm:mt-5 pt-1.5 sm:pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] sm:text-[11px]">
            <span className="text-slate-400 font-medium text-[9px] sm:text-[11px]">Status: Healthy</span>
            <span className="text-emerald-400 font-bold flex items-center gap-1 text-[9px] sm:text-[11px]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Live
            </span>
          </div>
        </div>

        {/* TILE 3: Pending Registration Payments */}
        <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono truncate">
                Pending Payments
              </span>
              <div className="p-1 sm:p-2 bg-amber-500/10 text-amber-400 rounded-lg sm:rounded-xl border border-amber-500/20 shrink-0">
                <Clock className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-4">
              <h3 className="text-xl sm:text-4xl font-extrabold text-white font-headline">
                {pendingPaymentTenants}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-semibold">
                <span className="text-amber-400 font-bold">{pendingPaymentTenants}</span> Awaiting Confirm
              </p>
            </div>
          </div>
          <div className="mt-2 sm:mt-5 pt-1.5 sm:pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] sm:text-[11px]">
            <span className="text-slate-400 font-medium text-[9px] sm:text-[11px]">{paidTenants} Paid</span>
            <button
              onClick={() => navigate('/admin/tenants')}
              className="text-amber-400 font-bold hover:underline flex items-center gap-0.5 text-[9px] sm:text-[11px]"
            >
              <span>Confirm</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* TILE 4: Licensing Revenue */}
        <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xl flex flex-col justify-between hover:border-slate-700 transition">
          <div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-400 font-mono truncate">
                Est. Revenue
              </span>
              <div className="p-1 sm:p-2 bg-cyan-500/10 text-cyan-400 rounded-lg sm:rounded-xl border border-cyan-500/20 shrink-0">
                <Coins className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
              </div>
            </div>
            <div className="mt-1.5 sm:mt-4">
              <h3 className="text-lg sm:text-3xl font-extrabold text-white font-headline truncate">
                ₹{estimatedRevenue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-semibold truncate">
                Plan: ₹{pricing.price} (+{pricing.tax}%)
              </p>
            </div>
          </div>
          <div className="mt-2 sm:mt-5 pt-1.5 sm:pt-3 border-t border-slate-800/60 flex justify-between items-center text-[10px] sm:text-[11px]">
            <span className="text-slate-400 font-medium text-[9px] sm:text-[11px]">AMC: ₹{pricing.amc}</span>
            <button
              onClick={() => navigate('/admin/pricing')}
              className="text-cyan-400 font-bold hover:underline flex items-center gap-0.5 text-[9px] sm:text-[11px]"
            >
              <span>Pricing</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS & MODULES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => navigate('/admin/tenants')}
          className="bg-gradient-to-r from-indigo-950/40 via-[#0d1322] to-[#0d1322] border border-indigo-500/30 hover:border-indigo-500/60 p-6 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl group-hover:scale-110 transition">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-headline">Tenants Registry & Editing</h4>
              <p className="text-xs text-slate-400 mt-0.5">Manage organizations, subdomains, payment states, and AMC billing.</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:translate-x-1 transition" />
        </div>

        <div
          onClick={() => navigate('/admin/pricing')}
          className="bg-gradient-to-r from-cyan-950/40 via-[#0d1322] to-[#0d1322] border border-cyan-500/30 hover:border-cyan-500/60 p-6 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer transition transform hover:-translate-y-0.5 group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-2xl group-hover:scale-110 transition">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white font-headline">Platform Pricing Master</h4>
              <p className="text-xs text-slate-400 mt-0.5">Configure registration base fee, GST tax percentage, and annual AMC charges.</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-cyan-400 group-hover:translate-x-1 transition" />
        </div>
      </div>

      {/* RECENT REGISTRATIONS CONTAINER */}
      <div className="bg-[#0d1322] border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl space-y-4 p-4 sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-white font-headline flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
              Recent Tenant Registrations
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">Latest 5 organization signups across the platform.</p>
          </div>

          <button
            onClick={() => navigate('/admin/tenants')}
            className="text-[11px] sm:text-xs font-bold text-indigo-400 hover:text-white flex items-center gap-1 transition"
          >
            <span>View All</span>
            <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
        </div>

        {/* MOBILE APP CARDS (< lg screens) */}
        <div className="block lg:hidden space-y-2.5">
          {recentTenants.length === 0 ? (
            <div className="p-4 text-center text-slate-500 text-xs bg-[#070b13] rounded-xl">
              No tenant organizations registered yet.
            </div>
          ) : (
            recentTenants.map(t => (
              <div key={t.id} className="bg-[#070b13] border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-base">🏛️</span>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate">{t.name}</h4>
                    <span className="text-[10px] font-mono text-indigo-400 block truncate">{t.subdomain}</span>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      t.paymentStatus === 'Paid'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {t.paymentStatus}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                      t.isActive === 1
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border-red-500/20'
                    }`}
                  >
                    {t.isActive === 1 ? 'Active' : 'Suspended'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE (>= lg screens) */}
        <div className="hidden lg:block overflow-x-auto border border-slate-800/80 rounded-xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-[#070b13] text-slate-400 font-bold uppercase tracking-wider text-[10px] border-b border-slate-800">
              <tr>
                <th className="px-5 py-3">Organization</th>
                <th className="px-5 py-3">Subdomain</th>
                <th className="px-5 py-3">Admin Email</th>
                <th className="px-5 py-3">Created Date</th>
                <th className="px-5 py-3 text-center">Payment Status</th>
                <th className="px-5 py-3 text-center">Workspace Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {recentTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-slate-500">
                    No tenant organizations registered yet.
                  </td>
                </tr>
              ) : (
                recentTenants.map(t => (
                  <tr key={t.id} className="hover:bg-slate-900/40 transition">
                    <td className="px-5 py-3 font-bold text-white flex items-center gap-2">
                      <span>🏛️</span>
                      <span>{t.name}</span>
                    </td>
                    <td className="px-5 py-3 font-mono text-indigo-400">{t.subdomain}</td>
                    <td className="px-5 py-3 text-slate-400">{t.adminEmail}</td>
                    <td className="px-5 py-3 text-slate-400 whitespace-nowrap">
                      {t.createdDate ? new Date(t.createdDate).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.paymentStatus === 'Paid'
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}
                      >
                        {t.paymentStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                          t.isActive === 1
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}
                      >
                        {t.isActive === 1 ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
