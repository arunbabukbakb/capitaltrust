import React, { useState, useEffect } from 'react';
import {
  Building2,
  Users,
  UserCheck,
  Layers,
  FileCheck2,
  Globe,
  Phone,
  Mail,
  User,
  Calendar,
  MapPin,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Hash,
  FileText
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OrganizationTypeOption {
  id: number;
  typeName: string;
  code: string;
}

interface Metrics {
  totalMembers: number;
  activeMembers: number;
  totalGroups: number;
  activeLoanCount: number;
}

export default function OrganizationInfoPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [orgTypes, setOrgTypes] = useState<OrganizationTypeOption[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalMembers: 0,
    activeMembers: 0,
    totalGroups: 0,
    activeLoanCount: 0
  });

  const [form, setForm] = useState({
    name: '',
    code: '',
    organizationTypeId: '',
    registerNumber: '',
    registerDate: '',
    establishedDate: '',
    status: 'Active' as 'Active' | 'Inactive',
    contactPerson: '',
    phone: '',
    adminEmail: '',
    website: '',
    addressLine1: '',
    addressLine2: '',
    country: 'India',
    state: '',
    city: '',
    pincode: ''
  });

  useEffect(() => {
    fetchOrgTypes();
    fetchOrgInfo();
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getSubdomainHeader = (): Record<string, string> => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return { 'x-tenant-id': parts[0] };
    }
    return { 'x-tenant-id': 'demo' };
  };

  const fetchOrgTypes = async () => {
    try {
      const res = await fetch('/api/super-admin/organization-types/public');
      if (res.ok) {
        const data = await res.json();
        setOrgTypes(data);
      }
    } catch (e) {
      console.error('Failed to fetch org types', e);
    }
  };

  const fetchOrgInfo = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/organization-info', {
        headers: getSubdomainHeader()
      });
      if (!res.ok) {
        throw new Error('Failed to fetch organization information.');
      }
      const data = await res.json();
      const org = data.organization || {};
      setMetrics(data.metrics || { totalMembers: 0, activeMembers: 0, totalGroups: 0, activeLoanCount: 0 });

      setForm({
        name: org.name || '',
        code: org.code || '',
        organizationTypeId: org.organizationTypeId ? String(org.organizationTypeId) : '',
        registerNumber: org.registerNumber || org.gstnumber || '',
        registerDate: org.registerDate || '',
        establishedDate: org.establishedDate || '',
        status: org.isActive === 1 ? 'Active' : 'Inactive',
        contactPerson: org.contactPerson || '',
        phone: org.phone || '',
        adminEmail: org.adminEmail || '',
        website: org.website || '',
        addressLine1: org.addressLine1 || org.address || '',
        addressLine2: org.addressLine2 || '',
        country: org.country || 'India',
        state: org.state || '',
        city: org.city || '',
        pincode: org.pincode || ''
      });
    } catch (err: any) {
      setError(err.message || 'Error loading organization details.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      showToast('Organization Name is required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/organization-info', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getSubdomainHeader()
        },
        body: JSON.stringify({
          ...form,
          organizationTypeId: form.organizationTypeId ? Number(form.organizationTypeId) : null,
          status: form.status
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save organization information.');
      }

      showToast('Organization information saved successfully.', 'success');
      fetchOrgInfo();
    } catch (err: any) {
      showToast(err.message || 'Error saving organization details.', 'error');
    } finally {
      setSaving(false);
    }
  };

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
      <div className="flex flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-6 lg:p-7 rounded-xl sm:rounded-2xl backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="p-2 sm:p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-600 dark:text-indigo-400">
            <Building2 className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('organizationPage.detailsTitle')}
            </h1>
            <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium line-clamp-1 sm:line-clamp-none">
              {t('organizationPage.detailsSub')}
            </p>
          </div>
        </div>

        <button
          onClick={fetchOrgInfo}
          disabled={loading}
          className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* TOP KPI Summary Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4 lg:gap-5">
        {/* Total Members */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{t('organizationPage.totalMembers')}</span>
            <div className="p-1.5 sm:p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-500">
              <Users className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-black text-slate-900 dark:text-white mt-1 sm:mt-2">{metrics.totalMembers}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">{t('organizationPage.totalMembers')}</p>
        </div>

        {/* Active Members */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">{t('organizationPage.activeMembers')}</span>
            <div className="p-1.5 sm:p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg sm:rounded-xl text-emerald-500">
              <UserCheck className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1 sm:mt-2">{metrics.activeMembers}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">{t('organizationPage.activeMembers')}</p>
        </div>

        {/* Total Groups */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">Total Groups</span>
            <div className="p-1.5 sm:p-2.5 bg-cyan-500/10 border border-cyan-500/20 rounded-lg sm:rounded-xl text-cyan-500">
              <Layers className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 mt-1 sm:mt-2">{metrics.totalGroups}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">Configured tenant groups</p>
        </div>

        {/* Active Loan Count */}
        <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-5 lg:p-6 backdrop-blur-xl shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] sm:text-xs lg:text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">Active Loans</span>
            <div className="p-1.5 sm:p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-lg sm:rounded-xl text-amber-500">
              <FileCheck2 className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
          </div>
          <p className="text-lg sm:text-3xl font-black text-amber-600 dark:text-amber-400 mt-1 sm:mt-2">{metrics.activeLoanCount}</p>
          <p className="text-[9px] sm:text-xs text-slate-400 dark:text-slate-500 mt-0.5 sm:mt-1 font-medium truncate">Running loan portfolios</p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 sm:p-4 border border-rose-500/20 bg-rose-500/10 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-semibold text-rose-700 dark:text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchOrgInfo}
            className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 rounded-lg text-rose-700 dark:text-rose-200 transition"
          >
            Retry
          </button>
        </div>
      )}

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 lg:p-8 backdrop-blur-xl shadow-xs space-y-6 sm:space-y-8">
        {/* Section 1: Basic Identification */}
        <div className="space-y-3 sm:space-y-5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
            <FileText className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
            <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('organizationPage.basicIdentification')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Name */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.orgName')} <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. CapitalTrust Finance Society"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Code */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('organizationPage.orgCode')}</span>
              </label>
              <input
                type="text"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. CT-SOCIETY-01"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-mono font-bold text-indigo-600 dark:text-indigo-400 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition uppercase"
              />
            </div>

            {/* Organization Type */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.orgType')}
              </label>
              <select
                value={form.organizationTypeId}
                onChange={(e) => setForm({ ...form, organizationTypeId: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="">-- Select Type --</option>
                {orgTypes.map((ot) => (
                  <option key={ot.id} value={ot.id}>
                    {ot.typeName} ({ot.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.status')}
              </label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value as 'Active' | 'Inactive' })}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            {/* Register Number */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.regNoGst')}
              </label>
              <input
                type="text"
                value={form.registerNumber}
                onChange={(e) => setForm({ ...form, registerNumber: e.target.value })}
                placeholder="e.g. REG-987654321"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Register Date */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('organizationPage.regDate')}</span>
              </label>
              <input
                type="date"
                value={form.registerDate}
                onChange={(e) => setForm({ ...form, registerDate: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Established Date */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('organizationPage.estDate')}</span>
              </label>
              <input
                type="date"
                value={form.establishedDate}
                onChange={(e) => setForm({ ...form, establishedDate: e.target.value })}
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact & Web Info */}
        <div className="space-y-3 sm:space-y-5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
            <User className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
            <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('organizationPage.contactDigitalInfo')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Contact Person */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('organizationPage.contactPerson')}</span>
              </label>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Phone */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('organizationPage.phoneNo')}</span>
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 9876543210"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Admin Email */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('organizationPage.adminEmail')}</span>
              </label>
              <input
                type="email"
                value={form.adminEmail}
                onChange={(e) => setForm({ ...form, adminEmail: e.target.value })}
                placeholder="admin@society.org"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Website */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-indigo-500" />
                <span>{t('organizationPage.websiteUrl')}</span>
              </label>
              <input
                type="text"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://www.capitaltrust.in"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Physical Address */}
        <div className="space-y-3 sm:space-y-5">
          <div className="flex items-center gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-800/80">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
            <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white uppercase tracking-wider">
              {t('organizationPage.addressLocationDetails')}
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-5">
            {/* Address Line 1 */}
            <div className="space-y-1 sm:space-y-1.5 sm:col-span-2">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.addressLine1')}
              </label>
              <input
                type="text"
                value={form.addressLine1}
                onChange={(e) => setForm({ ...form, addressLine1: e.target.value })}
                placeholder="Building No, Street Name, Floor"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Address Line 2 */}
            <div className="space-y-1 sm:space-y-1.5 sm:col-span-2">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.addressLine2')}
              </label>
              <input
                type="text"
                value={form.addressLine2}
                onChange={(e) => setForm({ ...form, addressLine2: e.target.value })}
                placeholder="Landmark, Area"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* City */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.city')}
              </label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Bangalore"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* State */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.state')}
              </label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="e.g. Karnataka"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Country */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.country')}
              </label>
              <input
                type="text"
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                placeholder="India"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            {/* Pincode */}
            <div className="space-y-1 sm:space-y-1.5">
              <label className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                {t('organizationPage.pincode')}
              </label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                placeholder="560001"
                className="w-full px-3 py-2 sm:px-4 sm:py-3 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-lg sm:rounded-xl text-xs sm:text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800/80">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 sm:px-8 sm:py-3.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t('organizationPage.savingDetails')}</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>{t('organizationPage.saveOrgDetails')}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
