import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../authSlice';
import { Mail, Lock, Eye, EyeOff, ShieldCheck, HelpCircle } from 'lucide-react';
import { RootState } from '../store';

interface LoginProps {
  onNavigateToRegister: () => void;
}

export default function Login({ onNavigateToRegister }: LoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotMessage, setForgotMessage] = useState('');
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { companySettings } = useSelector((state: RootState) => state.auth);
  const registrationMessage = location.state?.message;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }
      dispatch(setCredentials({ user: data.user, token: data.token }));
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || "Failed to log into portal");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setForgotMessage('');
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to request password reset");
      }
      setForgotMessage(data.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative flex items-center justify-center min-h-full py-8 sm:py-12 px-4 selection:bg-slate-900 selection:text-white">
      {/* Decorative Blur Spheres background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10 bg-[#f7f9fb]">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-emerald-100 opacity-50 blur-[130px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[35%] h-[35%] bg-blue-100 opacity-60 blur-[110px] rounded-full" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
        {/* LEFT/CENTRAL INTERACTIVE LOGIN FORM */}
        <div className="md:col-span-7 lg:col-span-6 flex flex-col justify-center">
          <main className="w-full max-w-[420px] sm:max-w-[460px] mx-auto z-10">
            <div className="mb-6 text-center">
              <div className="flex items-center justify-center gap-3">
                {companySettings?.companyLogo ? (
                  <img
                    src={companySettings.companyLogo}
                    alt={companySettings.companyName || 'Logo'}
                    className="max-h-9 max-w-[120px] object-contain flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 bg-slate-950 flex items-center justify-center rounded-xl shadow-md text-white font-bold text-lg">
                    🏛️
                  </div>
                )}
                <h1 className="font-headline font-bold text-2xl text-slate-900 tracking-tight">
                  {companySettings?.companyName || 'CapitalTrust'}
                </h1>
              </div>
              <p className="text-xs font-medium text-slate-500 mt-1.5">Secure Institutional Fund Management</p>
            </div>

            {/* Login Card */}
            <div className="glass-panel login-card rounded-2xl p-6 flex flex-col gap-4 shadow-xl bg-white">
              {view === 'login' ? (
                <>
                  <header>
                    <h3 className="text-lg font-bold font-headline text-slate-900">Welcome back</h3>
                  </header>

                  {registrationMessage && (
                    <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium">
                      {registrationMessage}
                    </div>
                  )}

                  {error && (
                    <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Username or Email</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input required type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username or Email"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-950 transition-all font-medium text-slate-900" />
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Password</label>
                        <button type="button" onClick={() => setView('forgot')} className="text-[10px] font-bold text-emerald-700 hover:underline transition-all">
                          Forgot password?
                        </button>
                      </div>
                      <div className="relative">
                        <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-950 transition-all font-medium text-slate-900" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors">
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                        className="w-4 h-4 rounded border-slate-300 text-slate-950 focus:ring-slate-950 cursor-pointer" />
                      <label htmlFor="remember" className="text-xs text-slate-500 font-medium select-none cursor-pointer">Remember me for 30 days</label>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full bg-slate-950 text-white font-bold py-3 sm:py-3.5 rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50">
                      {loading ? "Authenticating..." : "Login to Portal →"}
                    </button>
                  </form>

                  <div className="relative my-1">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-3 text-slate-400 text-[10px] font-semibold tracking-widest">Security Verified</span></div>
                  </div>

                  <div className="text-center">
                    <p className="text-xs text-slate-500">Don't have an account?{' '}
                      <button onClick={onNavigateToRegister} className="text-slate-950 font-bold hover:underline ml-1 cursor-pointer">Create an account</button>
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <header>
                    <h2 className="text-lg font-bold font-headline text-slate-900">Reset Password</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Enter your email to receive a password reset link.</p>
                  </header>

                  {error && <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 rounded-lg font-medium">{error}</div>}
                  {forgotMessage && <div className="p-3 text-xs bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium">{forgotMessage}</div>}

                  <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input required type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="name@organization.com"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 sm:py-3.5 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 focus:border-slate-950 transition-all font-medium text-slate-900" />
                      </div>
                    </div>

                    <button type="submit" disabled={loading}
                      className="w-full bg-slate-950 text-white font-bold py-3 sm:py-3.5 rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50">
                      {loading ? "Sending..." : "Send Reset Link"}
                    </button>
                  </form>

                  <div className="text-center mt-4">
                    <button onClick={() => setView('login')} className="text-xs text-slate-500 font-bold hover:underline">
                      ← Back to Login
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Custom security indicators */}
            <footer className="mt-6 flex flex-col items-center gap-3 opacity-70">
              <p className="text-[9px] text-slate-400 tracking-widest leading-relaxed uppercase text-center font-bold">
                © 2026 {(companySettings?.companyName || 'CapitalTrust').toUpperCase()} GLOBAL MARKETS. ALL RIGHTS RESERVED.
              </p>
            </footer>
          </main>
        </div>

        {/* SIDE BAR GRAPHIC COMPONENT (Visual Interest Column) */}
        <aside className="hidden md:block md:col-span-5 lg:col-span-6 bg-slate-950 text-white rounded-2xl p-8 py-12 relative overflow-hidden min-h-[460px] lg:min-h-[520px] flex flex-col justify-end shadow-xl border border-slate-900">
          {/* background shine */}
          <div className="absolute -top-[20%] -left-[20%] w-[100%] h-[100%] bg-emerald-500/10 rounded-full blur-[80px]" />
          <div className="absolute bottom-[10%] right-[-10%] w-[80%] h-[80%] bg-blue-500/10 rounded-full blur-[100px]" />
          
          <div className="relative z-10 flex flex-col gap-6">
            <div className="w-10 h-10 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center font-bold text-xl">
              📈
            </div>
            <div>
              <h3 className="font-headline font-bold text-2xl text-white mb-2">Growth Intelligence</h3>
              <p className="text-slate-400 text-sm leading-relaxed font-normal">
                Access real-time portfolio analytics and risk management tools designed for modern institutional investors. Keep track of outstanding credit indices dynamically.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
