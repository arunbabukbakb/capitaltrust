import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../../authSlice';
import { Mail, Lock, Eye, EyeOff, Sparkles, Key, UserCheck, Sun, Moon } from 'lucide-react';
import { RootState } from '../../store';
import { getSubdomain } from '../../main';
import { useTheme } from '../../components/ThemeContext';

interface LoginProps {
  onNavigateToRegister: () => void;
}

export default function Login({ onNavigateToRegister }: LoginProps) {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('123');
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
  const { theme, toggleTheme } = useTheme();
  const registrationMessage = location.state?.message;

  const subdomain = getSubdomain();
  const searchParams = new URLSearchParams(location.search);
  const isDemoParam = searchParams.get('demo') === 'true' || searchParams.get('demo') === '1';
  const isDemo = subdomain === 'demo' || isDemoParam;

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
    <div className="w-full relative flex items-center justify-center min-h-full py-8 sm:py-12 px-4 selection:bg-slate-900 dark:selection:bg-slate-100 dark:selection:text-slate-900 transition-colors duration-200">
      {/* Theme toggle — fixed top-right */}
      <button
        onClick={toggleTheme}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-md transition-all cursor-pointer"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
      </button>
      {/* Decorative Blur Spheres background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-emerald-100 dark:bg-emerald-950/10 opacity-50 blur-[130px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[35%] h-[35%] bg-blue-100 dark:bg-blue-950/10 opacity-60 blur-[110px] rounded-full" />
      </div>

      <main className="w-full max-w-[420px] sm:max-w-[460px] mx-auto z-10 animate-fade-in px-2 sm:px-0">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3">
            {companySettings?.companyLogo ? (
              <img
                src={companySettings.companyLogo}
                alt={companySettings.companyName || 'Logo'}
                className="max-h-9 max-w-[120px] object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-9 h-9 bg-slate-950 dark:bg-white flex items-center justify-center rounded-xl shadow-md text-white dark:text-slate-950 font-bold text-lg">
                🏛️
              </div>
            )}
            <h1 className="font-headline font-bold text-2xl text-slate-900 dark:text-white tracking-tight">
              {companySettings?.companyName || 'CapitalTrust'}
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">Secure Institutional Fund Management</p>
        </div>

        {/* Login Card */}
        <div className="glass-panel login-card rounded-2xl p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 shadow-xl">
          {view === 'login' ? (
            <>
              <header>
                <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Welcome back</h3>
              </header>

              {isDemo && (
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-cyan-500/10 border border-indigo-500/30 dark:border-indigo-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400">
                      <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
                      <span>Demo Mode Credentials</span>
                    </div>
                    <span className="text-[10px] bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono font-bold px-2 py-0.5 rounded border border-indigo-500/30 uppercase">
                      Demo Data
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-300 mb-3 leading-relaxed">
                    Click any role below to autofill demo credentials:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setUsername('admin');
                        setPassword('123');
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        username === 'admin'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">Admin</div>
                      <div className="text-xs font-bold font-mono mt-0.5 truncate">admin</div>
                      <div className="text-[10px] opacity-80 font-mono">Pass: 123</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUsername('manager');
                        setPassword('123');
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        username === 'manager'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">Manager</div>
                      <div className="text-xs font-bold font-mono mt-0.5 truncate">manager</div>
                      <div className="text-[10px] opacity-80 font-mono">Pass: 123</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setUsername('john');
                        setPassword('123');
                      }}
                      className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                        username === 'john'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-500/20'
                          : 'bg-white/80 dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-indigo-400'
                      }`}
                    >
                      <div className="text-[9px] font-bold uppercase tracking-wider opacity-80">Member</div>
                      <div className="text-xs font-bold font-mono mt-0.5 truncate">john</div>
                      <div className="text-[10px] opacity-80 font-mono">Pass: 123</div>
                    </button>
                  </div>
                </div>
              )}

              {registrationMessage && (
                <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium">
                  {registrationMessage}
                </div>
              )}

              {error && (
                <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 rounded-lg font-medium">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Username or Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input required type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username or Email"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 sm:py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700 transition-all font-medium text-slate-900 dark:text-slate-100" />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Password</label>
                    <button type="button" onClick={() => setView('forgot')} className="text-[10px] text-slate-500 dark:text-slate-450 hover:underline font-bold">
                      Forgot password?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input required type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 sm:py-3 pl-11 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700 transition-all font-medium text-slate-900 dark:text-slate-100" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember checkbox option */}
                <div className="flex items-center gap-2 py-1">
                  <input type="checkbox" id="remember" checked={remember} onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-200 dark:border-slate-800 text-slate-950 focus:ring-slate-950 dark:focus:ring-slate-100 cursor-pointer" />
                  <label htmlFor="remember" className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                    Remember my access token
                  </label>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold py-3 sm:py-3.5 rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-900 dark:hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50">
                  {loading ? "Verifying..." : "Sign In"}
                </button>
              </form>

              {/* Registration invite */}
              <footer className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Need a member profile?
                  <button onClick={onNavigateToRegister} className="text-slate-950 dark:text-white font-bold hover:underline ml-1 cursor-pointer">
                    Create an account
                  </button>
                </p>
              </footer>
            </>
          ) : (
            <>
              <header>
                <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Recover Password</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Enter your email to receive a password reset link.</p>
              </header>

              {error && (
                <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 rounded-lg font-medium">
                  {error}
                </div>
              )}

              {forgotMessage && (
                <div className="p-3 text-xs bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-lg font-medium">
                  {forgotMessage}
                </div>
              )}

              <form onSubmit={handleForgotSubmit} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">Business Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input required type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} placeholder="name@company.com"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700 transition-all font-medium text-slate-900 dark:text-slate-100" />
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold py-3 sm:py-3.5 rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-900 dark:hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-3 cursor-pointer disabled:opacity-50">
                  {loading ? "Sending..." : "Send Reset Link"}
                </button>
              </form>

              <div className="text-center mt-4">
                <button onClick={() => setView('login')} className="text-xs text-slate-500 dark:text-slate-400 font-bold hover:underline">
                  ← Back to Login
                </button>
              </div>
            </>
          )}
        </div>

        {/* Custom security indicators */}
        <footer className="mt-6 flex flex-col items-center gap-3 opacity-70">
          <p className="text-[9px] text-slate-450 dark:text-slate-500 tracking-widest leading-relaxed uppercase text-center font-bold">
            © 2026 {(companySettings?.companyName || 'CapitalTrust').toUpperCase()} GLOBAL MARKETS. ALL RIGHTS RESERVED.
          </p>
        </footer>
      </main>
    </div>
  );
}
