import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setCredentials } from '../authSlice';
import { UserCheck, Eye, EyeOff, Shield } from 'lucide-react';
import { RootState } from '../store';

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
    <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-2 bg-white/95 rounded-2xl overflow-hidden shadow-2xl border border-slate-200">
      {/* BRAND & VISUAL LEFT ACCENT PANEL */}
      <div className="hidden lg:flex flex-col justify-between p-12 bg-slate-950 text-white relative overflow-hidden">
        {/* Animated Background decorative overlay representing gold flows */}
        <div className="absolute inset-0 pointer-events-none opacity-10">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-12">
            {companySettings?.companyLogo ? (
              <img
                src={companySettings.companyLogo}
                alt={companySettings.companyName || 'Logo'}
                className="max-h-8 max-w-[120px] object-contain flex-shrink-0"
              />
            ) : (
              <span className="p-1 px-1.5 bg-white text-slate-950 rounded font-bold text-lg">🏛️</span>
            )}
            <span className="font-headline font-bold text-xl tracking-tight">
              {companySettings?.companyName || 'CapitalTrust'}
            </span>
          </div>
          <div className="mt-12">
            <h1 className="font-headline font-bold text-4xl mb-6 leading-tight">
              Secure your financial future with precision.
            </h1>
            <p className="text-slate-400 font-medium leading-relaxed max-w-md">
              Join an elite network of institutional managers and high-net-worth individuals managing global assets with institutional-grade tools.
            </p>
          </div>
        </div>

        {/* Proof Badge Block */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 bg-white/5 p-4 rounded-xl border border-white/10 backdrop-blur-md">
            <div className="flex -space-x-3">
              <img 
                className="w-10 h-10 rounded-full border-2 border-slate-950 object-cover" 
                alt="Representative 1"
                referrerPolicy="no-referrer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuD1t45ocMjBrddZ7RzpwnhSuPYCwAiv-a0oiUyoFsm32SHz604YT8Lnm1aO9FRBcQdtj-t8yqTBVXzp_c0y-z6Zd0wZe_rOAg4ri8tlasoXiMexbpDN27_Uqq4f40A1HmXVGKbNjDHcDqn9l2RNP9axCzpEvUI432RLQICJmd9JjShx4y8S-zPnTx4XQ_tJ6-7rWUkctlYANZtp9XHWbn_LjsGkoOm62o3l0Um9ApRclmPUykOmqUk9"
              />
              <img 
                className="w-10 h-10 rounded-full border-2 border-slate-950 object-cover" 
                alt="Representative 2"
                referrerPolicy="no-referrer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCqP7gZrxa7gU1p6yVQGsCqbVW4xHa-vGBcLTibqJg1U0U9u5MS-szLU086gakcOhzdKmsDolFdATT23BWv_anfq30YI2aBJ5cLKfKwBnMViO0_jUpsBw1JqKfrHw8xTvrNOqNReYLA7EXLKCtT7fH9_hhfJ4xmvpziU_GOIgVVP7WP4Rk2lqpxMatsu0O0oMUEK9lClwhxINBw0MJTg5GTXZPkEjIjm1G0cc23_gjQtjpiwhcg7tB2"
              />
              <img 
                className="w-10 h-10 rounded-full border-2 border-slate-950 object-cover" 
                alt="Representative 3"
                referrerPolicy="no-referrer"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBf9c7NJ0EsN4MHnycaTdupwDrXbxmzDak0NURcMfjybWavPjH17w4BAkPlNLLX3_IuKguwUeqTsGNSoxb6R0ckN15F7pvpPk5-EgQ3CCx0vL7ow-6w2C631259wCO8EaSBqDVR2RMRhatTwiAtit3bPDdlwW2NNtzG9GHvsF4YSfKPxotI4gua8NGKTSKw4HhfkKFaqgHrBGBAj3JVOXwObbZBeHH4bm8tcvGcwCpSYw53uPkqMUFj"
              />
            </div>
            <div>
              <p className="text-[10px] tracking-wider uppercase font-bold text-emerald-400">Trusted by Experts</p>
              <p className="text-xs text-slate-300">5,000+ fund managers globally</p>
            </div>
          </div>
        </div>
      </div>

      {/* FORM INTERACTIVE RIGHT PANEL */}
      <div className="p-6 sm:p-12 md:p-16 flex flex-col justify-center bg-slate-50">
        <div className="max-w-md mx-auto w-full">
          <header className="mb-8">
            <h2 className="text-3xl font-bold font-headline text-slate-900 mb-1">Create Account</h2>
            <p className="text-sm text-slate-500">Enter your details to begin your wealth journey.</p>
          </header>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                Full Name
              </label>
              <input
                required
                type="text"
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Username */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                Username
              </label>
              <input
                required
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                Business Email
              </label>
              <input
                required
                type="email"
                placeholder="john@capitaltrust.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1.5">
                Phone Number
              </label>
              <input
                type="tel"
                placeholder="+1 (555) 000-0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-4 pr-12 py-2.5 sm:py-3 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-900 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-500 italic mt-1">
                Must be at least 12 characters with 1 symbol.
              </p>
            </div>

            {/* Terms and Conditions */}
            <div className="flex items-start gap-2.5 pt-2">
              <input
                required
                type="checkbox"
                id="terms"
                checked={agree}
                onChange={(e) => setAgree(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded border-slate-200 text-slate-950 focus:ring-slate-950 cursor-pointer"
              />
              <label htmlFor="terms" className="text-xs text-slate-500 cursor-pointer leading-normal">
                I agree to the{' '}
                <a className="text-slate-950 font-bold hover:underline" href="#ts">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a className="text-slate-950 font-bold hover:underline" href="#pp">
                  Privacy Policy_
                </a>.
              </label>
            </div>

            {/* Submission triggers */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-950 text-white font-semibold py-3 sm:py-3.5 px-6 rounded-xl shadow-md hover:bg-slate-900 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4 cursor-pointer disabled:opacity-50"
            >
              {loading ? "CREATING PORTFOLIO..." : "CREATE ACCOUNT →"}
            </button>
          </form>

          {/* Switch link */}
          <footer className="mt-8 pt-6 border-t border-slate-200 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <button
                onClick={onNavigateToLogin}
                className="text-slate-950 font-bold hover:underline ml-1"
              >
                Sign In
              </button>
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}
