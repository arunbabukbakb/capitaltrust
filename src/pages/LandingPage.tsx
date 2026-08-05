import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Shield,
  Coins,
  TrendingUp,
  Users,
  Layers,
  CheckCircle,
  ArrowRight,
  Globe,
  Cpu,
  Activity,
  UserCheck,
  Play,
  Sparkles,
  Receipt,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../components/ThemeContext';
import WhatsAppButton from '../components/WhatsAppButton';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { useTranslation } from 'react-i18next';

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { companySettings } = useSelector((state: RootState) => state.auth);
  const { t, i18n } = useTranslation();

  const [langOpen, setLangOpen] = useState(false);
  const langRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!langOpen) return;
    const handler = (e: MouseEvent) => {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [langOpen]);

  const languages = [
    { code: 'en', label: 'English', nativeLabel: 'English' },
    { code: 'ml', label: 'Malayalam', nativeLabel: 'മലയാളം' },
  ];

  const getViteAppUrl = (): string => {
    const envUrl =
      (import.meta as any).env?.VITE_APP_URL ||
      (typeof process !== 'undefined' && process.env?.VITE_APP_URL);
    if (envUrl) {
      if (
        typeof window !== 'undefined' &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
        envUrl.includes('localhost')
      ) {
        return window.location.origin;
      }
      return envUrl;
    }
    if (typeof window !== 'undefined') return window.location.origin;
    return '';
  };

  const buildSubdomainUrl = (subdomain: string, path: string = '/login'): string => {
    const rawAppUrl = getViteAppUrl();
    if (!rawAppUrl) return path;

    try {
      const url = new URL(rawAppUrl);
      if (!url.hostname.startsWith(`${subdomain}.`)) {
        url.hostname = `${subdomain}.${url.hostname}`;
      }
      url.pathname = path;
      if (subdomain === 'demo') {
        url.searchParams.set('demo', 'true');
      }
      return url.toString();
    } catch (e) {
      return path;
    }
  };

  const handleLoadDemo = () => {
    const demoUrl = buildSubdomainUrl('demo', '/login');
    if (demoUrl && demoUrl !== '/login') {
      window.location.href = demoUrl;
    } else {
      navigate('/login?demo=true');
    }
  };

  const getDemoDisplayUrl = (): string => {
    const fullUrl = buildSubdomainUrl('demo', '/dashboard');
    try {
      const url = new URL(fullUrl);
      return `${url.host}${url.pathname}`;
    } catch (e) {
      return 'demo/dashboard';
    }
  };

  const getSubdomainExampleDisplay = (): string => {
    const fullUrl = buildSubdomainUrl('mybranch', '');
    try {
      const url = new URL(fullUrl);
      return url.host;
    } catch (e) {
      return 'mybranch';
    }
  };

  const benefits = [
    {
      icon: <Receipt className="w-6 h-6 text-indigo-400 animate-pulse" />,
      title: t('landing.benefit1Title'),
      desc: t('landing.benefit1Desc')
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-cyan-400" />,
      title: t('landing.benefit2Title'),
      desc: t('landing.benefit2Desc')
    },
    {
      icon: <Coins className="w-6 h-6 text-emerald-400" />,
      title: t('landing.benefit3Title'),
      desc: t('landing.benefit3Desc')
    },
    {
      icon: <Activity className="w-6 h-6 text-purple-400" />,
      title: t('landing.benefit4Title'),
      desc: t('landing.benefit4Desc')
    },
    {
      icon: <Shield className="w-6 h-6 text-blue-400" />,
      title: t('landing.benefit5Title'),
      desc: t('landing.benefit5Desc')
    },
    {
      icon: <UserCheck className="w-6 h-6 text-amber-400" />,
      title: t('landing.benefit6Title'),
      desc: t('landing.benefit6Desc')
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-[#e2e8f0] relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] rounded-full bg-violet-600/5 blur-[90px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 py-3.5 sm:py-6 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src={companySettings?.companyLogo || '/favicon.png'}
            alt={companySettings?.companyName || 'CapitalTrust Logo'}
            className="h-8 sm:h-9 w-auto object-contain shrink-0"
          />
          <div className="hidden sm:block">
            <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-indigo-600 via-slate-700 to-slate-500 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent font-headline tracking-tight">
              CapitalTrust
            </span>
            <span className="ml-1.5 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded border border-indigo-500/30">
              Portal
            </span>
          </div>
        </div>

        {/* Desktop nav buttons */}
        <div className="hidden sm:flex items-center gap-3 sm:gap-4">
          <a
            href="#features"
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            {t('landing.features')}
          </a>
          <button
            onClick={() => navigate('/document/getting-started')}
            className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {t('landing.documentation')}
          </button>

          {/* Language Switcher (Direct 1-Click Toggle) */}
          <button
            onClick={() => i18n.changeLanguage(i18n.language?.startsWith('ml') ? 'en' : 'ml')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all cursor-pointer text-xs font-bold"
            title={i18n.language?.startsWith('ml') ? 'Switch to English' : 'മലയാളത്തിലേക്ക് മാറുക'}
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span>{i18n.language?.startsWith('ml') ? 'മലയാളം' : 'English'}</span>
          </button>

          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 dark:hover:bg-slate-700/60 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            title={theme === 'dark' ? t('header.switchLight') : t('header.switchDark')}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleLoadDemo}
            className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 hover:text-indigo-700 dark:hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-indigo-500 dark:fill-indigo-400 text-indigo-500 dark:text-indigo-400" />
            {t('landing.liveDemo')}
          </button>
          <button
            onClick={() => navigate('/register-tenant')}
            className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-bold text-white rounded-xl group bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 cursor-pointer"
          >
            <span className="relative px-4 py-2 transition-all ease-in duration-75 bg-white dark:bg-[#090d16] text-slate-900 dark:text-white rounded-[10px] group-hover:bg-transparent group-hover:text-white">
              {t('landing.createOrganization')}
            </span>
          </button>
        </div>

        {/* Mobile: Get Started + Language + Theme toggle */}
        <div className="sm:hidden flex items-center gap-2">
          {/* Mobile Language Button toggle */}
          <button
            onClick={() => i18n.changeLanguage(i18n.language?.startsWith('ml') ? 'en' : 'ml')}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
            title={i18n.language?.startsWith('ml') ? 'Switch to English' : 'മലയാളത്തിലേക്ക് മാറുക'}
          >
            <Globe className="w-3 h-3 text-indigo-500" />
            <span>{i18n.language?.startsWith('ml') ? 'ML' : 'EN'}</span>
          </button>
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={() => navigate('/register-tenant')}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-indigo-500 to-cyan-500 rounded-lg cursor-pointer"
          >
            {t('landing.getStarted')}
          </button>
        </div>
      </header>

      {/* Mobile Action Bar */}
      <div className="sm:hidden sticky top-[57px] z-10 bg-white/95 dark:bg-[#090d16]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/60 px-4 py-2.5 flex items-center gap-2">
        <button
          onClick={handleLoadDemo}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-300 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
        >
          <Play className="w-3 h-3 fill-indigo-500 dark:fill-indigo-400 text-indigo-500 dark:text-indigo-400" />
          {t('landing.demo')}
        </button>
        <a
          href="#features"
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-all"
        >
          {t('landing.features')}
        </a>
        <button
          onClick={() => navigate('/document/getting-started')}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 text-[11px] font-bold rounded-lg transition-all cursor-pointer"
        >
          {t('landing.docs')}
        </button>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 sm:pt-20 pb-12 sm:pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-300 text-xs font-semibold mb-6 animate-pulse">
          <Globe className="w-3.5 h-3.5" />
          {t('landing.badge')}
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-headline tracking-tight max-w-4xl mx-auto leading-tight mb-6 text-slate-900 dark:text-white">
          {t('landing.heroTitle1')}{" "}
          <span className="bg-gradient-to-r from-indigo-500 via-cyan-500 to-teal-500 dark:from-indigo-400 dark:via-cyan-400 dark:to-teal-400 bg-clip-text text-transparent">
            {t('landing.heroScale')}
          </span>
        </h1>

        <p className="text-slate-600 dark:text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
          {t('landing.heroSubtitle')}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={handleLoadDemo}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            {t('landing.launchDemoSite')}
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => navigate('/register-tenant')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
          >
            {t('landing.createOrganization')}
          </button>
          <a
            href="#features"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-100 dark:bg-slate-900/40 hover:bg-slate-200 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-bold rounded-xl transition-all"
          >
            {t('landing.exploreBenefits')}
          </a>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-16 relative rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/20 p-2 max-w-5xl mx-auto shadow-2xl shadow-indigo-500/5 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-slate-50 dark:from-[#090d16] via-transparent to-transparent z-10 pointer-events-none" />
          <div className="w-full h-8 bg-slate-100 dark:bg-slate-950/60 rounded-t-xl flex items-center px-4 gap-1.5 border-b border-slate-200 dark:border-slate-800/50">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            <button
              onClick={handleLoadDemo}
              className="mx-auto bg-white dark:bg-slate-900/80 hover:bg-slate-50 dark:hover:bg-slate-800/80 border border-slate-300 dark:border-slate-800 hover:border-indigo-500/50 text-[10px] text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-300 py-0.5 px-6 rounded-md select-none font-mono flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>{getDemoDisplayUrl()}</span>
              <Sparkles className="w-3 h-3 text-indigo-400" />
            </button>
          </div>
          <div className="bg-slate-50 dark:bg-slate-950/40 p-6 flex flex-col md:flex-row gap-6 items-start rounded-b-xl border-t border-slate-200 dark:border-slate-900">
            {/* Left Column (Mini Stats) */}
            <div className="w-full md:w-1/3 space-y-4">
              <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 rounded-xl text-left shadow-xs dark:shadow-none">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Total Active Loans</div>
                <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">T-Shs 452,000,000</div>
                <div className="text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                  <CheckCircle className="w-3 h-3" /> +12.4% this month
                </div>
              </div>
              <div className="p-4 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/60 rounded-xl text-left shadow-xs dark:shadow-none">
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">Liquidity Pool reserves</div>
                <div className="text-xl font-bold text-indigo-600 dark:text-indigo-300 mt-1">T-Shs 1.25 Billion</div>
                <div className="text-[10px] text-indigo-500 dark:text-indigo-400 flex items-center gap-1 mt-1 font-semibold">
                  <Cpu className="w-3 h-3" /> Reinvestment Enabled
                </div>
              </div>
            </div>
            {/* Right Column (Visual Mock) */}
            <div className="w-full md:w-2/3 p-4 bg-white dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/50 rounded-xl text-left space-y-4 shadow-xs dark:shadow-none">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800/40">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-500 dark:text-cyan-400 animate-pulse" />
                  Live Collection Audit Feed
                </h4>
                <span className="text-[9px] bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 px-2 py-0.5 rounded font-mono font-semibold">ONLINE</span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Suleiman Nditi", desc: "Weekly Loan Repayment Contribution", amount: "T-Shs 45,000", status: "Approved", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
                  { name: "Fatuma Mwinyi", desc: "Credit Installment (Interest Slab v4)", amount: "T-Shs 120,000", status: "Approved", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10" },
                  { name: "Chande Juma", desc: "Liquidity Pool Contribution", amount: "T-Shs 300,000", status: "Processing", color: "text-amber-600 dark:text-amber-400 bg-amber-500/10" }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 dark:bg-slate-950/40 rounded-lg border border-slate-200 dark:border-slate-900 hover:border-slate-300 dark:hover:border-slate-800 transition-colors">
                    <div>
                      <div className="text-xs font-bold text-slate-700 dark:text-slate-200">{item.name}</div>
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">{item.amount}</div>
                      <div className="mt-1 flex justify-end">
                        <span className={`text-[8px] font-bold uppercase px-1.5 py-0.5 rounded ${item.color}`}>
                          {item.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Grid */}
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-slate-200 dark:border-slate-800/40">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold font-headline tracking-tight text-slate-900 dark:text-white mb-4">
            {t('landing.completeSolution')}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-xs sm:text-sm font-normal">
            {t('landing.solutionSub')}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((b, idx) => (
            <div
              key={idx}
              className="p-6 bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800/60 rounded-2xl hover:border-indigo-400 dark:hover:border-indigo-500/40 transition-all duration-300 hover:bg-slate-50 dark:hover:bg-slate-900/40 group text-left shadow-sm dark:shadow-none"
            >
              <div className="p-3 bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl inline-block mb-5 group-hover:scale-110 transition-transform">
                {b.icon}
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {b.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Subdomain Testing Step Guide */}
      <section className="relative z-10 max-w-5xl mx-4 sm:mx-auto px-4 sm:px-6 py-12 sm:py-16 mt-10 sm:mt-16 bg-gradient-to-r from-indigo-50 dark:from-indigo-900/20 to-cyan-50 dark:to-cyan-900/20 border border-indigo-100 dark:border-slate-800/80 rounded-3xl mb-12 sm:mb-24 text-left">
        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mb-4">
          {t('landing.howToTestTitle')}
        </h3>
        <p className="text-slate-600 dark:text-slate-400 text-xs mb-6 leading-relaxed">
          {t('landing.howToTestSub', { subdomain: 'mybranch' })}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: "1", title: t('landing.step1Title'), desc: t('landing.step1Desc') },
            { step: "2", title: t('landing.step2Title'), desc: t('landing.step2Desc', { example: getSubdomainExampleDisplay() }) },
            { step: "3", title: t('landing.step3Title'), desc: t('landing.step3Desc') }
          ].map((item, idx) => (
            <div key={idx} className="space-y-2">
              <span className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-600 dark:text-indigo-400">
                {item.step}
              </span>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">{item.title}</h4>
              <p className="text-slate-600 dark:text-slate-400 text-[11px] leading-normal" dangerouslySetInnerHTML={{ __html: item.desc }} />
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500 dark:text-slate-400 text-xs">
        <div>
          &copy; {new Date().getFullYear()} CapitalTrust. {t('landing.allRightsReserved')}
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => navigate('/privacy-policy')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {t('landing.privacyPolicy')}
          </button>
          <button
            onClick={() => navigate('/terms-of-service')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {t('landing.termsOfService')}
          </button>
          <button
            onClick={() => navigate('/document/getting-started')}
            className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            {t('landing.documentation')}
          </button>
        </div>
      </footer>

      {/* Floating WhatsApp Contact Button */}
      <WhatsAppButton />
    </div>
  );
}
