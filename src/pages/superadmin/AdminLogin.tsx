import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Key, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/super-admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Save token and super admin details
      localStorage.setItem('token', data.token);
      localStorage.setItem('superadmin_user', JSON.stringify(data.user));

      navigate('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to authenticate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070b13] text-[#e2e8f0] flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-[-25%] left-[-15%] w-[60%] h-[70%] rounded-full bg-indigo-650/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[70%] rounded-full bg-cyan-650/10 blur-[150px] pointer-events-none" />

      <div className="max-w-md w-full bg-slate-900/30 border border-slate-800/85 rounded-3xl p-6 sm:p-8 backdrop-blur-2xl shadow-2xl relative z-10 space-y-6 animate-fade-in">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-gradient-to-tr from-indigo-500/10 to-cyan-550/10 border border-indigo-500/20 rounded-2xl text-indigo-400 mb-2">
            <Shield className="w-8 h-8" />
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-headline">Super Admin Control</h2>
          <p className="text-xs text-slate-400">Access the CapitalTrust platform tenant management console</p>
        </div>

        {/* Error Callout */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex gap-2 text-xs text-red-400 font-semibold items-center animate-shake">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1">
            <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                required
                type="text"
                placeholder="superadmin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
              Password
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                required
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-lg shadow-indigo-500/20 transition duration-150 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Authenticate</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center pt-2">
          <a
            href="/"
            className="text-[10px] sm:text-xs text-slate-500 hover:text-white transition cursor-pointer"
          >
            &larr; Back to Main Domain Page
          </a>
        </div>
      </div>
    </div>
  );
}
