import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setCompanySettings } from '../authSlice';
import { ShieldCheck, Building, Image, Mail, Phone, Save } from 'lucide-react';

export default function SettingsPage() {
  const { user, activeRole, companySettings } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const activeRoleType = activeRole?.roleType || user?.role;
  const isAdmin = activeRoleType === 'admin';

  useEffect(() => {
    if (companySettings) {
      setCompanyName(companySettings.companyName || '');
      setCompanyLogo(companySettings.companyLogo || '');
      setSupportEmail(companySettings.supportEmail || '');
      setSupportPhone(companySettings.supportPhone || '');
    }
  }, [companySettings]);

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("The selected file is too large. Please upload an image smaller than 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCompanyLogo(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
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
        body: JSON.stringify({ companyName, companyLogo, supportEmail, supportPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update company settings');
      }

      // Re-fetch company settings to update globally
      const getRes = await fetch('/api/settings/company');
      if (getRes.ok) {
        const freshSettings = await getRes.json();
        dispatch(setCompanySettings(freshSettings));
      }

      setSuccess('Company branding settings updated successfully.');
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-6 md:space-y-8 animate-fade-in mt-16 max-w-4xl">
      <div>
        <h3 className="text-sm md:text-2xl font-bold font-headline text-slate-900">Operational Terminal Settings</h3>
        <p className="hidden sm:block text-xs text-slate-500 mt-1">Configure profile thresholds, secure wire routing numbers, and company branding.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Side: Personal / Account Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h4 className="text-sm md:text-base font-bold text-slate-900 font-headline">Account Details</h4>
            <p className="text-[10px] text-slate-400">Your profile details in the system.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Corporate Client ID</label>
              <input type="text" readOnly value={user?.id || ''} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">System Registered Name</label>
              <input type="text" readOnly value={user?.fullName || ''} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold" />
            </div>
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Security Certification</label>
              <div className="flex items-center gap-1.5 p-3.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded-xl text-[10px] md:text-xs font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Your account complies with global Basel III risk buffer directives.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Admin Company Branding Settings */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="text-sm md:text-base font-bold text-slate-900 font-headline">Company Branding</h4>
                <p className="text-[10px] text-slate-400">Configure global app name, logo image, and support channels.</p>
              </div>
              {!isAdmin && (
                <span className="text-[8px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                  Read Only
                </span>
              )}
            </div>

            {success && <div className="mb-4 p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium">{success}</div>}
            {error && <div className="mb-4 p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">{error}</div>}

            <form onSubmit={handleSaveCompanySettings} className="space-y-4">
              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Company Name</label>
                <div className="relative">
                  <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    disabled={!isAdmin}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="CapitalTrust"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-950 transition-all disabled:opacity-75"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Company Logo</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Image className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      disabled={!isAdmin}
                      value={companyLogo}
                      onChange={(e) => setCompanyLogo(e.target.value)}
                      placeholder="https://example.com/logo.png or Base64 URI"
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-950 transition-all disabled:opacity-75"
                    />
                  </div>
                  {isAdmin && (
                    <label className="px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold flex items-center justify-center cursor-pointer transition-colors flex-shrink-0 select-none">
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleLogoFileChange}
                      />
                    </label>
                  )}
                </div>
                {companyLogo && (
                  <div className="mt-2 p-2 border border-slate-100 rounded-lg bg-slate-50 flex items-center justify-center relative group">
                    <img
                      src={companyLogo}
                      alt="Logo Preview"
                      className="max-h-8 max-w-[120px] object-contain"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => setCompanyLogo('')}
                        className="absolute top-1 right-1 text-[8px] bg-rose-50 text-rose-600 font-bold px-1.5 py-0.5 rounded border border-rose-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Support Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    disabled={!isAdmin}
                    value={supportEmail}
                    onChange={(e) => setSupportEmail(e.target.value)}
                    placeholder="support@capitaltrust.com"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-950 transition-all disabled:opacity-75"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Support Phone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    disabled={!isAdmin}
                    value={supportPhone}
                    onChange={(e) => setSupportPhone(e.target.value)}
                    placeholder="+1 (555) 555-5555"
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-950 transition-all disabled:opacity-75"
                  />
                </div>
              </div>

              {isAdmin && (
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2 py-2 bg-slate-950 text-white hover:bg-slate-900 rounded-lg text-xs font-bold shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{saving ? 'Saving...' : 'Save Branding'}</span>
                </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
