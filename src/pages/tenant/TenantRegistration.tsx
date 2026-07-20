import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Coins, 
  ArrowLeft, 
  Globe, 
  User, 
  Mail, 
  Lock, 
  Building, 
  ExternalLink,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function TenantRegistration() {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    companyName: '',
    subdomain: '',
    adminName: '',
    adminEmail: '',
    adminUsername: '',
    adminPassword: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registeredUrl, setRegisteredUrl] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'subdomain') {
      // Allow only lowercase alphanumeric characters and hyphens
      const formatted = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const getAppUrl = () => {
    const envUrl =
      (import.meta as any).env?.VITE_APP_URL ||
      (typeof process !== 'undefined' && process.env?.APP_URL);

    let rawAppUrl = envUrl || (typeof window !== 'undefined' ? window.location.origin : '');

    if (
      envUrl &&
      envUrl.includes('localhost') &&
      typeof window !== 'undefined' &&
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1'
    ) {
      rawAppUrl = window.location.origin;
    }
    return rawAppUrl;
  };

  const buildTenantUrl = (subdomainStr: string) => {
    const rawUrl = getAppUrl();
    if (!rawUrl) return `http://${subdomainStr || 'tenant'}.localhost/login`;

    try {
      const url = new URL(rawUrl);
      const parts = url.hostname.split('.');
      let tenantHostname = url.hostname;

      if (parts.length === 2 && parts[1] === 'localhost') {
        tenantHostname = `${subdomainStr}.${parts[1]}`;
      } else if (parts.length > 2) {
        tenantHostname = `${subdomainStr}.${parts.slice(1).join('.')}`;
      } else {
        tenantHostname = `${subdomainStr}.${url.hostname}`;
      }

      url.hostname = tenantHostname;
      url.pathname = '/login';
      return url.toString();
    } catch (e) {
      return `http://${subdomainStr || 'tenant'}.localhost:3000/login`;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { companyName, subdomain, adminName, adminEmail, adminUsername, adminPassword } = formData;

    if (!companyName || !subdomain || !adminName || !adminEmail || !adminUsername || !adminPassword) {
      setError('Please fill in all required fields.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/tenants/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Registration failed.');
      }

      // Successful registration
      const fullTenantUrl = buildTenantUrl(data.subdomain || subdomain);
      setRegisteredUrl(fullTenantUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred during registration.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTenant = () => {
    if (registeredUrl) {
      window.open(registeredUrl, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-[#090d16] text-[#e2e8f0] flex flex-col relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

      {/* Navigation */}
      <div className="max-w-7xl mx-auto w-full px-6 py-6 relative z-10 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>

        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-lg">
            <Coins className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-bold text-white font-headline">CapitalTrust</span>
        </div>
      </div>

      {/* Main Registration Container */}
      <main className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-md w-full bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
          
          {registeredUrl ? (
            /* Success State */
            <div className="text-center space-y-6 py-6">
              <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white font-headline">Workspace Ready!</h2>
                <p className="text-xs text-slate-400">
                  Your tenant organization has been initialized successfully. You can now access your dedicated login panel.
                </p>
              </div>

              {/* Subdomain URL Display Box */}
              <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl flex flex-col items-center gap-2">
                <div className="text-[10px] text-slate-500 font-mono tracking-wider uppercase">Your Custom Address</div>
                <div className="text-sm font-bold text-indigo-300 select-all font-mono break-all">
                  {registeredUrl}
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleOpenTenant}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer"
                >
                  Go to Login Workspace
                  <ExternalLink className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setRegisteredUrl('');
                    setFormData({
                      companyName: '',
                      subdomain: '',
                      adminName: '',
                      adminEmail: '',
                      adminUsername: '',
                      adminPassword: ''
                    });
                  }}
                  className="w-full text-center text-xs text-slate-400 hover:text-white transition-colors py-2 cursor-pointer"
                >
                  Register Another Organization
                </button>
              </div>
            </div>
          ) : (
            /* Form Input State */
            <div className="space-y-6">
              <header className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-white font-headline">Register Organization</h2>
                <p className="text-xs text-slate-400">
                  Spin up your custom multi-tenant portal and create the administrator user workspace.
                </p>
              </header>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3.5 rounded-xl flex items-start gap-2.5 text-red-400 text-xs text-left">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5 text-left">
                {/* Organization Details */}
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/60 pb-1.5">
                    1. Organization Info
                  </h3>
                  
                  {/* Company Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Company / Tenant Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Building className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="companyName"
                        value={formData.companyName}
                        onChange={handleChange}
                        required
                        placeholder="e.g. CapitalTrust Tanzania"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Subdomain */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Tenant Subdomain *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Globe className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="subdomain"
                        value={formData.subdomain}
                        onChange={handleChange}
                        required
                        placeholder="e.g. tz-branch"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                    {/* Live Domain Preview */}
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Preview: <span className="text-indigo-400 font-semibold">{buildTenantUrl(formData.subdomain || 'tz-branch')}</span>
                    </div>
                  </div>
                </div>

                {/* Administrator Credentials */}
                <div className="space-y-4 pt-2">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800/60 pb-1.5">
                    2. Workspace Administrator
                  </h3>

                  {/* Admin Name */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Administrator Full Name *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        type="text"
                        name="adminName"
                        value={formData.adminName}
                        onChange={handleChange}
                        required
                        placeholder="e.g. James Mwangi"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Admin Email */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-300">Admin Email Address *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="adminEmail"
                        value={formData.adminEmail}
                        onChange={handleChange}
                        required
                        placeholder="e.g. james.mwangi@capitaltrust.com"
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Admin Username */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Username *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="text"
                          name="adminUsername"
                          value={formData.adminUsername}
                          onChange={handleChange}
                          required
                          placeholder="e.g. admin"
                          className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Admin Password */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-slate-300">Password *</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                          <Lock className="w-3.5 h-3.5" />
                        </div>
                        <input
                          type="password"
                          name="adminPassword"
                          value={formData.adminPassword}
                          onChange={handleChange}
                          required
                          placeholder="••••••••"
                          className="w-full pl-8 pr-3.5 py-2.5 bg-slate-950/40 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3.5 mt-2 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Provisioning Space...
                    </>
                  ) : (
                    "Launch Tenant Workspace"
                  )}
                </button>
              </form>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}
