import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Mail, Key, Save, RefreshCw, AlertTriangle, Check } from 'lucide-react';

export default function AdminProfile() {
  const navigate = useNavigate();

  // Profile data
  const adminUser = localStorage.getItem('superadmin_user')
    ? JSON.parse(localStorage.getItem('superadmin_user')!)
    : null;

  const [fullName, setFullName] = useState(adminUser?.fullName || '');
  const [email, setEmail] = useState(adminUser?.email || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('token') || !adminUser) {
      navigate('/admin/login');
      return;
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/super-admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password: password || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      // Update local cache
      localStorage.setItem('superadmin_user', JSON.stringify(data.user));
      setSuccess('Profile updated successfully!');
      setPassword('');
    } catch (err: any) {
      setError(err.message || 'Error updating profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-8 max-w-2xl mx-auto space-y-4 sm:space-y-6 font-sans text-slate-200">
      <div>
        <h3 className="text-lg sm:text-2xl font-bold text-white font-headline">SuperAdmin Profile</h3>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">Manage your administrator details and system credentials.</p>
      </div>

      <div className="bg-[#0d1322] border border-slate-800/85 rounded-2xl p-4 sm:p-8 shadow-xl space-y-4 sm:space-y-6">
        {error && (
          <div className="bg-red-500/10 border border-red-505/20 text-red-400 rounded-xl p-4 flex gap-2 text-xs font-semibold items-center animate-shake">
            <AlertTriangle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-555/20 text-emerald-400 rounded-xl p-4 flex gap-2 text-xs font-semibold items-center animate-pulse">
            <Check className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
                Username (Immutable)
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600" />
                <input
                  disabled
                  type="text"
                  value={adminUser?.username || 'superadmin'}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-950/20 border border-slate-850/80 rounded-xl text-xs sm:text-sm font-bold text-slate-500 cursor-not-allowed font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                <input
                  required
                  type="text"
                  placeholder="Super Administrator"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-955/40 border border-slate-800/80 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
              <input
                required
                type="email"
                placeholder="superadmin@capitaltrust.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-955/40 border border-slate-800/80 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
              Change Password (Leave blank to preserve current)
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-555" />
              <input
                type="password"
                placeholder="Enter new password (min. 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-955/40 border border-slate-800/80 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
