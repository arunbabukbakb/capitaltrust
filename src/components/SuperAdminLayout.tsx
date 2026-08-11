import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link, Navigate } from 'react-router-dom';
import { Shield, Layers, User, LogOut, Menu, X, Coins, LayoutDashboard, Building2, Mail, Send, Wrench, Activity, Video } from 'lucide-react';
import { initializeSuperAdminPushNotifications, registerForegroundMessageHandler } from '../firebase';

export default function SuperAdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const token = localStorage.getItem('token');
  const adminUser = localStorage.getItem('superadmin_user')
    ? JSON.parse(localStorage.getItem('superadmin_user')!)
    : null;

  useEffect(() => {
    if (token && adminUser) {
      initializeSuperAdminPushNotifications();
      registerForegroundMessageHandler();
    }
  }, [token]);

  if (!token || !adminUser) {
    return <Navigate to="/admin/login" replace />;
  }

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('superadmin_user');
    navigate('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Tenants Registry', path: '/admin/tenants', icon: Building2 },
    { label: 'Traffic Performance', path: '/admin/traffic', icon: Activity },
    { label: 'Company Details', path: '/admin/company-details', icon: Building2 },
    { label: 'Maintenance Notice', path: '/admin/maintenance', icon: Wrench },
    { label: 'Menu Management', path: '/admin/menus', icon: Layers },
    { label: 'Video Tutorials', path: '/admin/video-tutorials', icon: Video },
    { label: 'Broadcast Mail', path: '/admin/send-mail', icon: Send },
    { label: 'Support Mailbox', path: '/admin/support-inbox', icon: Mail },
    { label: 'SMTP Mail Settings', path: '/admin/smtp', icon: Mail },
    { label: 'Pricing Settings', path: '/admin/pricing', icon: Coins },
    { label: 'SuperAdmin Profile', path: '/admin/profile', icon: User }
  ];

  return (
    <div className="min-h-screen bg-[#070b13] text-[#f8fafc] font-sans antialiased flex w-full max-w-full overflow-x-hidden superadmin-root">
      {/* Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/5 blur-[120px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/5 blur-[150px] pointer-events-none z-0" />

      {/* Sidebar for Desktop */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-slate-800/80 bg-[#070b13]/80 backdrop-blur-xl fixed top-0 bottom-0 left-0 z-30 p-6 justify-between">
        <div className="space-y-8">
          {/* Logo */}
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-tight text-white font-headline">CapitalTrust</h1>
              <p className="text-[9px] uppercase tracking-widest text-indigo-300 font-bold">Platform Admin</p>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border border-indigo-500/30 text-white shadow-xs'
                      : 'text-slate-300 hover:text-white hover:bg-slate-900/60 border border-transparent font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Admin info */}
        <div className="space-y-4 pt-4 border-t border-slate-800/60">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 text-xs font-bold uppercase">
              {adminUser?.username?.substring(0, 2)}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{adminUser?.fullName}</p>
              <p className="text-[10px] font-medium text-slate-300 truncate">{adminUser?.email}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 bg-red-500/5 hover:bg-red-500/10 border border-red-500/10 hover:border-red-500/20 rounded-xl text-xs font-bold text-red-400 transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout Control</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area Wrapper */}
      <div className="flex-1 lg:pl-64 flex flex-col z-10 min-h-screen w-full max-w-full overflow-x-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden sticky top-0 bg-[#070b13]/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3 flex items-center justify-between z-30">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400">
              <Shield className="w-4 h-4" />
            </div>
            <span className="text-xs font-extrabold tracking-tight text-white font-headline">CapitalTrust</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 border border-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              {isSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </header>

        {/* Mobile Sidebar overlay */}
        {isSidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-[#070b13]/80 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
            
            {/* Drawer */}
            <div className="relative flex flex-col w-64 bg-[#070b13] border-r border-slate-800 p-6 justify-between animate-slide-in">
              <div className="space-y-8">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-extrabold tracking-tight text-white font-headline">CapitalTrust Control</span>
                </div>

                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all ${
                          isActive
                            ? 'bg-indigo-500/10 border border-indigo-505/20 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-900/45'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2.5 px-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-550/20 flex items-center justify-center text-indigo-400 text-xs font-bold uppercase">
                    {adminUser?.username?.substring(0, 2)}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white">{adminUser?.fullName}</p>
                    <p className="text-[9px] font-medium text-slate-500">{adminUser?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/5 border border-red-505/10 rounded-xl text-xs font-bold text-red-400"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Content body wrapper */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
