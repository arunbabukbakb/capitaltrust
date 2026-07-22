import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { useTheme } from '../../components/ThemeContext';
import { Lock, Eye, EyeOff, Sun, Moon, CheckCircle, XCircle, AlertCircle, ShieldCheck } from 'lucide-react';

export default function ResetPassword() {
  const location = useLocation();
  const navigate = useNavigate();
  const { companySettings } = useSelector((state: RootState) => state.auth);
  const { theme, toggleTheme } = useTheme();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Extract token from URL query string
  const token = new URLSearchParams(location.search).get('token');

  useEffect(() => {
    if (!token) {
      setError('Invalid or missing reset token. Please request a new password reset link.');
    }
  }, [token]);

  // Password strength indicators
  const strength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
  const strengthCount = Object.values(strength).filter(Boolean).length;
  const strengthLabel = strengthCount <= 1 ? 'Weak' : strengthCount === 2 ? 'Fair' : strengthCount === 3 ? 'Good' : 'Strong';
  const strengthColor = strengthCount <= 1 ? 'bg-rose-500' : strengthCount === 2 ? 'bg-amber-500' : strengthCount === 3 ? 'bg-blue-500' : 'bg-emerald-500';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Invalid or missing reset token.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to reset password.');
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full relative flex items-center justify-center min-h-full py-8 sm:py-12 px-4 selection:bg-slate-900 dark:selection:bg-slate-100 dark:selection:text-slate-900 transition-colors duration-200">

      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-md transition-all cursor-pointer"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
      </button>

      {/* Decorative blur orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-indigo-100 dark:bg-indigo-950/10 opacity-50 blur-[130px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[35%] h-[35%] bg-blue-100 dark:bg-blue-950/10 opacity-60 blur-[110px] rounded-full" />
      </div>

      <main className="w-full max-w-[420px] sm:max-w-[460px] mx-auto z-10 animate-fade-in px-2 sm:px-0">

        {/* Header / Logo */}
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

        {/* Card */}
        <div className="glass-panel login-card rounded-2xl p-4 sm:p-6 flex flex-col gap-4 shadow-xl">

          {success ? (
            /* Success State */
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Password Reset!</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Your password has been successfully updated. You can now log in with your new password.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold py-3 rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-900 dark:hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                Go to Login →
              </button>
            </div>

          ) : !token ? (
            /* Invalid Token State */
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex items-center justify-center">
                <XCircle className="w-8 h-8 text-rose-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Invalid Link</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  This password reset link is invalid or has expired. Please request a new one from the login page.
                </p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold py-3 rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-900 dark:hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                Back to Login
              </button>
            </div>

          ) : (
            /* Reset Form */
            <>
              <header className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4 text-indigo-500" />
                  </div>
                  <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white">Set New Password</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Choose a strong password for your account. This link expires in 1 hour.
                </p>
              </header>

              {error && (
                <div className="flex items-start gap-2 p-3 text-xs bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 rounded-lg font-medium">
                  <AlertCircle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="flex flex-col gap-3">

                {/* New Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      id="reset-password"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 sm:py-3 pl-11 pr-12 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700 transition-all font-medium text-slate-900 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Strength meter */}
                  {password.length > 0 && (
                    <div className="mt-1.5 space-y-1.5">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((i) => (
                          <div
                            key={i}
                            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                              i <= strengthCount ? strengthColor : 'bg-slate-200 dark:bg-slate-800'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                          {[
                            { ok: strength.length, label: '8+ chars' },
                            { ok: strength.uppercase, label: 'Uppercase' },
                            { ok: strength.number, label: 'Number' },
                            { ok: strength.special, label: 'Special' },
                          ].map(({ ok, label }) => (
                            <span
                              key={label}
                              className={`text-[10px] font-medium ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}
                            >
                              {ok ? '✓' : '○'} {label}
                            </span>
                          ))}
                        </div>
                        <span className={`text-[10px] font-bold ${strengthCount <= 1 ? 'text-rose-500' : strengthCount === 2 ? 'text-amber-500' : strengthCount === 3 ? 'text-blue-500' : 'text-emerald-500'}`}>
                          {strengthLabel}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Confirm Password */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input
                      id="reset-confirm-password"
                      required
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className={`w-full bg-slate-50 dark:bg-slate-950 border rounded-xl py-2.5 sm:py-3 pl-11 pr-12 text-sm focus:outline-none focus:ring-2 transition-all font-medium text-slate-900 dark:text-slate-100 ${
                        confirmPassword && password !== confirmPassword
                          ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/10 focus:border-rose-500'
                          : confirmPassword && password === confirmPassword
                            ? 'border-emerald-400 dark:border-emerald-600 focus:ring-emerald-500/10 focus:border-emerald-500'
                            : 'border-slate-200 dark:border-slate-800 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-[10px] text-rose-500 font-medium mt-0.5">Passwords do not match</p>
                  )}
                  {confirmPassword && password === confirmPassword && (
                    <p className="text-[10px] text-emerald-500 font-medium mt-0.5">✓ Passwords match</p>
                  )}
                </div>

                <button
                  type="submit"
                  id="reset-password-submit"
                  disabled={loading || !password || !confirmPassword}
                  className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold py-3 sm:py-3.5 rounded-xl shadow-md uppercase tracking-wider text-xs hover:bg-slate-900 dark:hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Resetting...' : 'Reset Password'}
                </button>
              </form>

              <div className="text-center">
                <button
                  onClick={() => navigate('/login')}
                  className="text-xs text-slate-500 dark:text-slate-400 font-bold hover:underline cursor-pointer"
                >
                  ← Back to Login
                </button>
              </div>
            </>
          )}
        </div>

        <footer className="mt-6 flex flex-col items-center gap-3 opacity-70">
          <p className="text-[9px] text-slate-450 dark:text-slate-500 tracking-widest leading-relaxed uppercase text-center font-bold">
            © 2026 {(companySettings?.companyName || 'CapitalTrust').toUpperCase()} GLOBAL MARKETS. ALL RIGHTS RESERVED.
          </p>
        </footer>
      </main>
    </div>
  );
}
