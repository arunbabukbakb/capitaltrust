import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../../authSlice';
import { UserCheck, Eye, EyeOff, Shield, Sun, Moon } from 'lucide-react';
import { RootState } from '../../store';
import { useTheme } from '../../components/ThemeContext';

interface RegisterProps {
  onNavigateToLogin: () => void;
}

export default function Register({ onNavigateToLogin }: RegisterProps) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { companySettings } = useSelector((state: RootState) => state.auth);
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agree) {
      setError("You must agree to the Terms of Service & Privacy Policy.");
      return;
    }
    setError('');
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, username, password, phoneNumber: phone })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create your account");
      }
      // Don't log the user in. Instead, navigate to login with a success message.
      navigate('/login', {
        state: {
          message: "Account created successfully! It is now pending administrator approval."
        }
      });
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md glass-panel rounded-2xl p-6 sm:p-8 shadow-xl flex flex-col gap-5 animate-fade-in text-slate-900 dark:text-slate-100 relative">
      {/* Theme toggle — top right */}
      <button
        onClick={toggleTheme}
        className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
      </button>
      {/* Brand Header */}
      <div className="flex flex-col items-center text-center">
        <div className="flex items-center gap-2 mb-1">
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
          <h1 className="font-headline font-bold text-2xl tracking-tight text-slate-950 dark:text-white">
            {companySettings?.companyName || 'CapitalTrust'}
          </h1>
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
          Fund Management
        </p>
      </div>

      <header className="text-center">
        <h2 className="text-xl font-bold font-headline text-slate-950 dark:text-white">Create Account</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Begin your wealth management journey.
        </p>
      </header>

      {error && (
        <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-455 rounded-xl font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Full Name */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
            Full Name
          </label>
          <input
            required
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700 transition-all font-medium text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Username & Phone in a row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              Username
            </label>
            <input
              required
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700 transition-all font-medium text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
              Phone Number
            </label>
            <input
              type="tel"
              placeholder="+91 98765 43210"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700 transition-all font-medium text-slate-900 dark:text-slate-100"
            />
          </div>
        </div>

        {/* Business Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
            Business Email
          </label>
          <input
            required
            type="email"
            placeholder="user@trustcaps.in"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700 transition-all font-medium text-slate-900 dark:text-slate-100"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400">
            Password
          </label>
          <div className="relative">
            <input
              required
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-4 pr-12 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-950/5 dark:focus:ring-slate-100/5 focus:border-slate-950 dark:focus:border-slate-700 transition-all font-medium text-slate-900 dark:text-slate-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <p className="text-[9px] text-slate-450 dark:text-slate-500 italic">
            Must be at least 12 characters with 1 symbol.
          </p>
        </div>

        {/* Terms and Conditions */}
        <div className="flex items-start gap-2.5 pt-1">
          <input
            required
            type="checkbox"
            id="terms"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="w-4 h-4 mt-0.5 rounded border-slate-200 dark:border-slate-800 text-slate-950 focus:ring-slate-950 dark:focus:ring-slate-100 cursor-pointer"
          />
          <label htmlFor="terms" className="text-xs text-slate-500 dark:text-slate-400 cursor-pointer leading-normal">
            I agree to the{' '}
            <a className="text-slate-950 dark:text-white font-bold hover:underline" href="#ts">
              Terms of Service
            </a>{' '}
            and{' '}
            <a className="text-slate-950 dark:text-white font-bold hover:underline" href="#pp">
              Privacy Policy
            </a>.
          </label>
        </div>

        {/* Submission triggers */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-bold py-3 px-6 rounded-xl shadow-md hover:bg-slate-900 dark:hover:bg-slate-100 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 cursor-pointer disabled:opacity-50"
        >
          {loading ? "CREATING PORTFOLIO..." : "CREATE ACCOUNT →"}
        </button>
      </form>

      {/* Switch link */}
      <footer className="pt-4 border-t border-slate-200 dark:border-slate-800 text-center">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Already have an account?{' '}
          <button
            onClick={onNavigateToLogin}
            className="text-slate-950 dark:text-white font-bold hover:underline ml-1 cursor-pointer"
          >
            Sign In
          </button>
        </p>
      </footer>
    </div>
  );
}
