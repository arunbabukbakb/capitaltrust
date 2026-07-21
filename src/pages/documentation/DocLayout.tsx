import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Rocket,
  Users,
  Coins,
  CreditCard,
  Receipt,
  Shield,
  FileSpreadsheet,
  ChevronRight,
  Menu,
  X,
  Home,
  Sparkles,
  Search,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';

export default function DocLayout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [docSearch, setDocSearch] = useState('');

  const docModules = [
    {
      id: 'getting-started',
      title: 'How to Start',
      path: '/document/getting-started',
      icon: <Rocket className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400" />,
      desc: 'Demo testing, Organization signup, Payments & Login'
    },
    {
      id: 'member-management',
      title: 'Member Management',
      path: '/document/member-management',
      icon: <Users className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-600 dark:text-cyan-400" />,
      desc: 'User profiles, Roles, & Permissions'
    },
    {
      id: 'collection',
      title: 'Collection',
      path: '/document/collection',
      icon: <Coins className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 dark:text-emerald-400" />,
      desc: 'Fund collection posting & Audit summary'
    },
    {
      id: 'loan',
      title: 'Loan Management',
      path: '/document/loan',
      icon: <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />,
      desc: 'Loan requests, Approvals, Facilities & EMI Repayments'
    },
    {
      id: 'expense',
      title: 'Expense Management',
      path: '/document/expense',
      icon: <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400" />,
      desc: 'Expense recording & Admin approval workflows'
    },
    {
      id: 'admin-features',
      title: 'Admin Features',
      path: '/document/admin-features',
      icon: <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />,
      desc: 'Company settings, Menu management & Permission matrix'
    },
    {
      id: 'report',
      title: 'Reports & Audit Ledger',
      path: '/document/report',
      icon: <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-teal-600 dark:text-teal-400" />,
      desc: 'Transaction audit ledger, Date filters & Metrics'
    }
  ];

  const filteredModules = docModules.filter(
    (m) =>
      m.title.toLowerCase().includes(docSearch.toLowerCase()) ||
      m.desc.toLowerCase().includes(docSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-[#e2e8f0] font-sans selection:bg-indigo-500 selection:text-white flex flex-col transition-colors duration-200">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-40 bg-white/90 dark:bg-[#090d16]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-2.5 sm:px-6 py-1.5 sm:py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-1 sm:p-1.5 lg:hidden bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:text-slate-900 dark:hover:text-white cursor-pointer"
          >
            {isMobileOpen ? <X className="w-4 h-4 sm:w-5 sm:h-5" /> : <Menu className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          <div
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 sm:gap-2.5 cursor-pointer group"
          >
            <div className="p-1 sm:p-1.5 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-lg sm:rounded-xl shadow-md group-hover:scale-105 transition-transform">
              <BookOpen className="w-3.5 h-3.5 sm:w-5 sm:h-5 text-white" />
            </div>
            <div>
              <div className="text-xs sm:text-base md:text-lg font-bold font-headline text-slate-900 dark:text-white flex items-center gap-1 sm:gap-1.5">
                CapitalTrust <span className="text-[10px] sm:text-xs text-indigo-600 dark:text-indigo-400 font-mono font-normal">Docs</span>
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 hidden sm:block">User Guide & Module Documentation</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Light / Dark Mode Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1 sm:p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-lg sm:rounded-xl transition-colors cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
            ) : (
              <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600" />
            )}
          </button>

          {/* Single Home Button */}
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-semibold rounded-lg sm:rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Home</span>
          </button>
        </div>
      </header>

      {/* Main Documentation Body */}
      <div className="flex w-full h-[calc(100vh-41px)] sm:h-[calc(100vh-53px)] overflow-hidden">
        {/* Left Sidebar — Sticky on Desktop, Slide-over on Mobile */}
        <aside
          className={`fixed lg:relative top-[41px] sm:top-[53px] lg:top-0 left-0 z-30 w-72 sm:w-80 h-[calc(100vh-41px)] sm:h-[calc(100vh-53px)] lg:h-full bg-white dark:bg-[#090d16] lg:bg-slate-50 lg:dark:bg-transparent border-r border-slate-200 dark:border-slate-800/80 p-3 sm:p-4 transition-transform duration-300 overflow-y-auto shrink-0 shadow-lg lg:shadow-none ${
            isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          <div className="space-y-3 sm:space-y-4">
            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search module docs..."
                value={docSearch}
                onChange={(e) => setDocSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
              />
            </div>

            {/* Sidebar Module Items */}
            <div className="space-y-1">
              <span className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 px-3 block mb-1">
                Documentation Modules
              </span>
              {filteredModules.map((mod) => (
                <NavLink
                  key={mod.id}
                  to={mod.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-start gap-2.5 sm:gap-3 p-2.5 sm:p-3 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-200 dark:border-indigo-500/40 text-indigo-900 dark:text-white font-bold shadow-xs'
                        : 'bg-white dark:bg-slate-900/30 border-slate-200/80 dark:border-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-900/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                    }`
                  }
                >
                  <div className="mt-0.5 shrink-0">{mod.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm md:text-base font-bold font-headline flex items-center justify-between">
                      <span>{mod.title}</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 opacity-60" />
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">{mod.desc}</p>
                  </div>
                </NavLink>
              ))}
            </div>
          </div>
        </aside>

        {/* Backdrop for Mobile Sidebar */}
        {isMobileOpen && (
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-20 lg:hidden"
          />
        )}

        {/* Main Doc Page Content Render */}
        <main className="flex-1 min-w-0 overflow-y-auto p-3 sm:p-5 md:p-7">
          <div className="bg-white dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3.5 sm:p-6 md:p-8 shadow-xs min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
