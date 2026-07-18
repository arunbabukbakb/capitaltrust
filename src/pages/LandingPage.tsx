import React from 'react';
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
  UserCheck
} from 'lucide-react';

export default function LandingPage() {
  const navigate = useNavigate();

  const benefits = [
    {
      icon: <Layers className="w-6 h-6 text-indigo-400 animate-pulse" />,
      title: "Multi-Tenant Workspaces",
      desc: "Spin up isolated portals for branches or sub-agencies with custom subdomains instantly."
    },
    {
      icon: <TrendingUp className="w-6 h-6 text-cyan-400" />,
      title: "Advanced Credit & Loan Pipelines",
      desc: "Configure flexible group/single loan products, customize variable interest slabs, and auto-calculate due schedules."
    },
    {
      icon: <Coins className="w-6 h-6 text-emerald-400" />,
      title: "Liquidity Pool Tracking",
      desc: "Oversee aggregate reserves, track member cash contributions, and automate reinvestment rules."
    },
    {
      icon: <Activity className="w-6 h-6 text-purple-400" />,
      title: "Real-time Financial Audit",
      desc: "Get deep, auditable insights into repayment collections, outstanding principal status, and cash flow logs."
    },
    {
      icon: <Shield className="w-6 h-6 text-blue-400" />,
      title: "Granular Security Controls",
      desc: "Enforce strict role-based permission profiles, menu mappings, and approval gates."
    },
    {
      icon: <UserCheck className="w-6 h-6 text-amber-400" />,
      title: "Interactive Client Portals",
      desc: "Deliver premium interfaces for members to track repayments, apply for credit facilities, and check dues."
    }
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-[#e2e8f0] relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[350px] rounded-full bg-violet-600/5 blur-[90px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-800/60 bg-[#090d16]/75 backdrop-blur-md sticky top-0">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-xl shadow-lg shadow-indigo-500/20">
            <Coins className="w-6 h-6 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent font-headline tracking-tight">
              CapitalTrust
            </span>
            <span className="ml-1.5 px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
              Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <a 
            href="#features" 
            className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Features
          </a>
          <button 
            onClick={() => navigate('/register-tenant')}
            className="relative inline-flex items-center justify-center p-0.5 overflow-hidden text-xs font-bold text-white rounded-xl group bg-gradient-to-br from-indigo-500 via-purple-500 to-cyan-500 group-hover:from-indigo-500 group-hover:to-cyan-500 hover:shadow-lg hover:shadow-indigo-500/30 transition-all duration-300 cursor-pointer"
          >
            <span className="relative px-4 py-2 transition-all ease-in duration-75 bg-[#090d16] rounded-[10px] group-hover:bg-opacity-0">
              Create Organization
            </span>
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-300 text-xs font-semibold mb-6 animate-pulse">
          <Globe className="w-3.5 h-3.5" />
          Next-Generation Multi-Tenant Microfinance Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold font-headline tracking-tight max-w-4xl mx-auto leading-tight mb-6">
          Empower Your Lending Operations at{" "}
          <span className="bg-gradient-to-r from-indigo-400 via-cyan-400 to-teal-400 bg-clip-text text-transparent">
            Scale
          </span>
        </h1>

        <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
          The all-in-one credit facility, liquidity pool, and tenant management workspace designed to optimize micro-lending portals with bulletproof security.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button 
            onClick={() => navigate('/register-tenant')}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer"
          >
            Get Started & Create Tenant
            <ArrowRight className="w-4 h-4" />
          </button>
          <a
            href="#features"
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-800/40 hover:bg-slate-800/70 border border-slate-700/50 hover:border-slate-600 text-slate-300 hover:text-white text-xs font-bold rounded-xl transition-all"
          >
            Explore Benefits
          </a>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-16 relative rounded-2xl border border-slate-800/80 bg-slate-900/20 p-2 max-w-5xl mx-auto shadow-2xl shadow-indigo-500/5 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-t from-[#090d16] via-transparent to-transparent z-10 pointer-events-none" />
          <div className="w-full h-8 bg-slate-950/60 rounded-t-xl flex items-center px-4 gap-1.5 border-b border-slate-800/50">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
            <div className="mx-auto bg-slate-900/80 border border-slate-800 text-[10px] text-slate-500 py-0.5 px-6 rounded-md select-none font-mono">
              demo-organization.capitaltrust.com/dashboard
            </div>
          </div>
          <div className="bg-slate-950/40 p-6 flex flex-col md:flex-row gap-6 items-start rounded-b-xl border-t border-slate-900">
            {/* Left Column (Mini Stats) */}
            <div className="w-full md:w-1/3 space-y-4">
              <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl text-left">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Total Active Loans</div>
                <div className="text-xl font-bold text-white mt-1">T-Shs 452,000,000</div>
                <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1 font-semibold">
                  <CheckCircle className="w-3 h-3" /> +12.4% this month
                </div>
              </div>
              <div className="p-4 bg-slate-900/60 border border-slate-800/60 rounded-xl text-left">
                <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Liquidity Pool reserves</div>
                <div className="text-xl font-bold text-indigo-300 mt-1">T-Shs 1.25 Billion</div>
                <div className="text-[10px] text-indigo-400 flex items-center gap-1 mt-1 font-semibold">
                  <Cpu className="w-3 h-3" /> Reinvestment Enabled
                </div>
              </div>
            </div>
            {/* Right Column (Visual Mock) */}
            <div className="w-full md:w-2/3 p-4 bg-slate-900/30 border border-slate-800/50 rounded-xl text-left space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/40">
                <h4 className="text-xs font-bold text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
                  Live Collection Audit Feed
                </h4>
                <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded font-mono font-semibold">ONLINE</span>
              </div>
              <div className="space-y-2">
                {[
                  { name: "Suleiman Nditi", desc: "Weekly Loan Repayment Contribution", amount: "T-Shs 45,000", status: "Approved", color: "text-emerald-400 bg-emerald-500/10" },
                  { name: "Fatuma Mwinyi", desc: "Credit Installment (Interest Slab v4)", amount: "T-Shs 120,000", status: "Approved", color: "text-emerald-400 bg-emerald-500/10" },
                  { name: "Chande Juma", desc: "Liquidity Pool Contribution", amount: "T-Shs 300,000", status: "Processing", color: "text-amber-400 bg-amber-500/10" }
                ].map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-950/40 rounded-lg border border-slate-900 hover:border-slate-800 transition-colors">
                    <div>
                      <div className="text-xs font-bold text-slate-200">{item.name}</div>
                      <div className="text-[9px] text-slate-500 mt-0.5">{item.desc}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">{item.amount}</div>
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
      <section id="features" className="relative z-10 max-w-7xl mx-auto px-6 py-20 border-t border-slate-800/40">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-2xl sm:text-4xl font-extrabold font-headline tracking-tight text-white mb-4">
            A Complete Core Banking Solution for Microfinance
          </h2>
          <p className="text-slate-400 text-xs sm:text-sm font-normal">
            Everything your credit union, cooperative, or micro-loan branch needs to operate efficiently in a unified, multi-tenant portal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((b, idx) => (
            <div 
              key={idx}
              className="p-6 bg-slate-900/20 border border-slate-800/60 rounded-2xl hover:border-indigo-500/40 transition-all duration-300 hover:bg-slate-900/40 group text-left"
            >
              <div className="p-3 bg-slate-850 border border-slate-850 rounded-xl inline-block mb-5 group-hover:scale-110 transition-transform">
                {b.icon}
              </div>
              <h3 className="text-base font-bold text-white mb-3 group-hover:text-indigo-400 transition-colors">
                {b.title}
              </h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Subdomain Testing Step Guide */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16 bg-gradient-to-r from-indigo-900/20 to-cyan-900/20 border border-slate-800/80 rounded-3xl mb-24 text-left">
        <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">
          How to Test Tenant Subdomains Locally
        </h3>
        <p className="text-slate-400 text-xs mb-6 leading-relaxed">
          CapitalTrust supports full multi-tenancy. When you register an organization, you select a subdomain (e.g. <code>mybranch</code>). Here is how to access it on your machine:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: "1", title: "Create Organization", desc: "Fill in the registration form with your preferred subdomain, organization details, and administrator credentials." },
            { step: "2", title: "Access Custom Subdomain", desc: "Type the custom address in your browser: e.g. <code>mybranch.localhost:5173</code> to open your isolated client login portal." },
            { step: "3", title: "Log In & Manage", desc: "Enter your registered credentials to access your organization's custom dashboard, user roles, audit systems, and loans." }
          ].map((item, idx) => (
            <div key={idx} className="space-y-2">
              <span className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-400">
                {item.step}
              </span>
              <h4 className="text-xs font-bold text-white">{item.title}</h4>
              <p className="text-slate-400 text-[11px] leading-normal" dangerouslySetInnerHTML={{ __html: item.desc }} />
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 max-w-7xl mx-auto px-6 py-8 border-t border-slate-850 flex flex-col sm:flex-row justify-between items-center gap-4 text-slate-500 text-xs">
        <div>
          &copy; {new Date().getFullYear()} CapitalTrust. All rights reserved.
        </div>
        <div className="flex gap-4">
          <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
          <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
        </div>
      </footer>
    </div>
  );
}
