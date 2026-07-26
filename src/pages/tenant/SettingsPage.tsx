import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { setCompanySettings } from '../../authSlice';
import { ShieldCheck, Building, Mail, Phone, Save, MapPin, Download, Receipt, FileText, Camera } from 'lucide-react';
import { generateSubscriptionInvoicePDF } from '../../templates/invoices/subscriptionInvoiceTemplate';
import { generateAmcInvoicePDF } from '../../templates/invoices/amcInvoiceTemplate';

export default function SettingsPage() {
  const { user, activeRole, companySettings } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstnumber, setGstnumber] = useState('');
  const [fullBillingData, setFullBillingData] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeRoleType = activeRole?.roleType || user?.role;
  const isAdmin = activeRoleType === 'admin';

  useEffect(() => {
    fetchTenantSettings();
  }, []);

  const fetchTenantSettings = async () => {
    try {
      const res = await fetch('/api/settings/company');
      if (res.ok) {
        const data = await res.json();
        setFullBillingData(data);
        if (data?.tenantDetails) {
          setCompanyName(data.tenantDetails.name || '');
          setCompanyLogo(data.tenantDetails.logo || '');
          setSupportEmail(data.tenantDetails.adminEmail || '');
          setSupportPhone(data.tenantDetails.phone || '');
          setAddress(data.tenantDetails.address || '');
          setGstnumber(data.tenantDetails.gstnumber || data.gstnumber || '');
        }
      }
    } catch (err) {
      console.error('Error fetching tenant company settings:', err);
    }
  };

  const handleTriggerUpload = () => {
    if (isAdmin && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleRemoveLogo = async () => {
    setCompanyLogo('');
    try {
      await fetch('/api/settings/logo', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logo: '' })
      });
      const getRes = await fetch('/api/settings/company');
      if (getRes.ok) {
        const freshSettings = await getRes.json();
        dispatch(setCompanySettings(freshSettings));
      }
    } catch (err) {
      console.error('Error removing logo:', err);
    }
  };

  const handleLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("The selected file is too large. Please upload an image smaller than 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const base64Image = reader.result;
        setCompanyLogo(base64Image);

        // Upload logo via dedicated tenant logo upload API
        if (isAdmin) {
          setUploadingLogo(true);
          try {
            const res = await fetch('/api/settings/logo', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ logo: base64Image })
            });

            if (res.ok) {
              const getRes = await fetch('/api/settings/company');
              if (getRes.ok) {
                const freshSettings = await getRes.json();
                dispatch(setCompanySettings(freshSettings));
              }
              setSuccess('Tenant logo updated successfully.');
            }
          } catch (err) {
            console.error('Error uploading tenant logo:', err);
          } finally {
            setUploadingLogo(false);
          }
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) {
      setError('Company name is required');
      return;
    }
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const res = await fetch('/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, companyLogo, supportEmail, supportPhone, address, gstnumber, gstno: gstnumber }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update company settings');
      }

      // Re-fetch company settings to update globally in Redux and local state
      const getRes = await fetch('/api/settings/company');
      if (getRes.ok) {
        const freshSettings = await getRes.json();
        dispatch(setCompanySettings(freshSettings));
        setFullBillingData(freshSettings);
        if (freshSettings?.tenantDetails) {
          setCompanyName(freshSettings.tenantDetails.name || '');
          setCompanyLogo(freshSettings.tenantDetails.logo || '');
          setSupportEmail(freshSettings.tenantDetails.adminEmail || '');
          setSupportPhone(freshSettings.tenantDetails.phone || '');
          setAddress(freshSettings.tenantDetails.address || '');
          setGstnumber(freshSettings.tenantDetails.gstnumber || freshSettings.gstnumber || '');
        }
      }

      setSuccess('Tenant organization branding settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-6 animate-fade-in mt-16 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm md:text-2xl font-bold font-headline text-slate-900 dark:text-white">Workspace & Organization Settings</h3>
          <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-1">Configure tenant organization profile, custom logo, support contact details, and tax invoices.</p>
        </div>
        {(activeRoleType === 'admin' || activeRoleType === 'manager') && (
          <Link
            to="/contact"
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs flex-shrink-0 cursor-pointer"
          >
            <Mail className="w-4 h-4" />
            <span>Contact Support</span>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Account Details & Tenant Organization Branding */}
        <div className="lg:col-span-6 space-y-6">
          {/* 1. Account Details as Read-only Summary Labels */}
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-3 backdrop-blur-xl">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-headline">Account Details</h4>
              <p className="hidden sm:block text-[10px] text-slate-400 dark:text-slate-400">Your administrator account profile in the tenant workspace.</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 block truncate">Client ID</span>
                <div className="text-[11px] font-bold font-mono text-slate-800 dark:text-slate-200 truncate">{user?.id || 'N/A'}</div>
              </div>

              <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 block truncate">Registered Name</span>
                <div className="text-[11px] font-bold text-slate-800 dark:text-slate-200 truncate">{user?.fullName || 'N/A'}</div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-xl border border-emerald-100/80 dark:border-emerald-900/60 space-y-0.5">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 flex-shrink-0" />
                  Security
                </span>
                <div className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 truncate">Basel III Compliant</div>
              </div>
            </div>
          </div>

          {/* 2. Tenant Organization Branding */}
          <div className="bg-white dark:bg-slate-900/60 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-5 backdrop-blur-xl">
            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800/60 pb-3">
              <div>
                <h4 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white font-headline">Tenant Organization Branding</h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-400">Manage tenant profile, support contact info, and workspace logo.</p>
              </div>
              {!isAdmin && (
                <span className="text-[8px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Read Only
                </span>
              )}
            </div>

            {success && <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-lg font-medium">{success}</div>}
            {error && <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-lg font-medium">{error}</div>}

            <form onSubmit={handleSaveCompanySettings} className="space-y-4">
              {/* Dark Mode Friendly Click-To-Upload Logo Avatar Box */}
              <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/80 dark:bg-slate-950/50 rounded-2xl border border-slate-200/80 dark:border-slate-800/80">
                <div
                  onClick={handleTriggerUpload}
                  className={`relative group w-14 h-14 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden cursor-pointer hover:border-indigo-500 dark:hover:border-indigo-400 transition-all flex-shrink-0 shadow-sm ${!isAdmin ? 'pointer-events-none' : ''}`}
                  title={isAdmin ? "Click image to upload custom logo" : "Tenant Logo"}
                >
                  {companyLogo ? (
                    <img
                      src={companyLogo}
                      alt="Organization Logo"
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                      <Camera className="w-5 h-5 text-slate-400 dark:text-slate-500 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors" />
                      <span className="text-[8px] font-bold mt-0.5">Logo</span>
                    </div>
                  )}

                  {/* Hover Overlay for Upload */}
                  {isAdmin && (
                    <div className="absolute inset-0 bg-slate-950/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[9px] font-bold gap-0.5">
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingLogo ? '...' : 'Upload'}</span>
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Organization Logo</span>
                    {companyLogo && isAdmin && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        className="text-[9px] text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold hover:underline cursor-pointer"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Click logo box to upload (PNG/SVG, max 2MB).</p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoFileChange}
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Organization / Tenant Name *</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="CapitalTrust Workspace"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-75"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Support Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="email"
                      disabled={!isAdmin}
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      placeholder="admin@tenant.com"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-75"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Support Phone</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={supportPhone}
                      onChange={(e) => setSupportPhone(e.target.value)}
                      placeholder="+255 700 000 000"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-75"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1">Corporate Address</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <textarea
                    rows={3}
                    disabled={!isAdmin}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="123 Financial District, City"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-75 resize-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1">GST Number / Tax ID</label>
                <div className="relative">
                  <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={gstnumber}
                    onChange={(e) => setGstnumber(e.target.value)}
                    placeholder="e.g. 22AAAAA0000A1Z5"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all disabled:opacity-75 font-mono uppercase"
                  />
                </div>
              </div>

              {isAdmin && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex justify-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-950 dark:bg-indigo-600 hover:bg-slate-900 dark:hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Organization Settings'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Billing & Invoices Section */}
        <div className="lg:col-span-6 bg-white dark:bg-slate-900/60 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800/80 shadow-sm space-y-6 backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/60 pb-3">
            <div>
              <h4 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
                <Receipt className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                Billing & GST Tax Invoices
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Download official GST compliant PDF tax invoices for subscription setup & AMC renewals.</p>
            </div>
          </div>

          {/* 1. Subscription License Bill (Only if Paid) */}
          {fullBillingData?.tenantDetails?.paymentStatus === 'Paid' && (
            <div className="space-y-3">
              <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Subscription & License Bill</span>
              </h5>
              <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400">
                      {fullBillingData?.tenantDetails?.invoiceno || `INV-${new Date().getFullYear()}${String(fullBillingData?.tenantDetails?.id || 1).padStart(4, '0')}`}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60">
                      Paid
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">Workspace Activation & Platform License Setup</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Date: {fullBillingData?.tenantDetails?.paymentDate ? new Date(fullBillingData.tenantDetails.paymentDate).toLocaleDateString() : 'N/A'} • Amount Paid: ₹{(fullBillingData?.tenantDetails?.amount || 0).toFixed(2)} (GST Incl.)
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (fullBillingData) {
                      generateSubscriptionInvoicePDF({
                        companySettings: fullBillingData,
                        tenantDetails: fullBillingData.tenantDetails || {
                          id: 1,
                          name: companyName || 'Organization',
                          subdomain: 'demo',
                          adminEmail: supportEmail || 'admin@capitaltrust.com',
                          phone: supportPhone,
                          address: address
                        }
                      });
                    }
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download PDF</span>
                </button>
              </div>
            </div>
          )}

          {/* 2. AMC Bills Table / Cards (Only Paid Bills) */}
          <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/60">
            <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Receipt className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Annual Maintenance Contract (AMC) Paid Bills</span>
            </h5>

            {(!fullBillingData?.amcList || fullBillingData.amcList.filter((a: any) => a.paidStatus === 'Paid').length === 0) ? (
              <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-xs text-slate-400 dark:text-slate-500 font-medium">
                No paid AMC billing records found.
              </div>
            ) : (
              <div className="space-y-2.5">
                {fullBillingData.amcList.filter((a: any) => a.paidStatus === 'Paid').map((amc: any) => {
                  const amcInvoiceNo = amc.invoiceno || `AMC-INV-${new Date().getFullYear()}${String(amc.id).padStart(4, '0')}`;
                  const gstRate = amc.gst ?? 18;
                  const baseCharge = Number(amc.amcCharge) || 0;
                  const gstAmt = amc.gstamount !== undefined && amc.gstamount !== null ? Number(amc.gstamount) : (baseCharge * (gstRate / 100));
                  const totalAmcAmount = baseCharge + gstAmt;

                  return (
                    <div key={amc.id} className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-400">{amcInvoiceNo}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/60">
                            Paid
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">AMC Renewal Charge</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">
                          Due Date: {amc.dueDate ? new Date(amc.dueDate).toLocaleDateString() : 'N/A'} {amc.paidDate ? `• Paid Date: ${new Date(amc.paidDate).toLocaleDateString()}` : ''} • Amount Paid: ₹{totalAmcAmount.toFixed(2)} (GST Incl.)
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          generateAmcInvoicePDF({
                            companySettings: fullBillingData,
                            tenantDetails: fullBillingData.tenantDetails || {
                              name: companyName || 'Organization',
                              subdomain: 'demo',
                              adminEmail: supportEmail,
                              phone: supportPhone,
                              address: address
                            },
                            amcRecord: amc
                          });
                        }}
                        className="px-3.5 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow transition cursor-pointer shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Download PDF</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
