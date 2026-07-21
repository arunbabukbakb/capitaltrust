import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { ShieldAlert, CreditCard, ArrowRight } from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationToast from './NotificationToast';
import WhatsAppButton from './WhatsAppButton';

interface MainLayoutProps {
  user: any;
  onLogout: () => void;
  onNewTransaction: () => void;
}

export default function MainLayout({ user, onLogout, onNewTransaction }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { companySettings } = useSelector((state: RootState) => state.auth);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Evaluate AMC Overdue status
  let isAmcOverdue = false;
  const amcRecord = companySettings?.amcRecord;
  if (amcRecord && amcRecord.paidStatus === 'Pending' && amcRecord.dueDate) {
    const dueTime = new Date(amcRecord.dueDate).getTime();
    const nowTime = new Date().getTime();
    if (dueTime < nowTime) {
      isAmcOverdue = true;
    }
  }

  // If AMC is overdue, display full screen Suspended Notice
  if (isAmcOverdue && user?.role !== 'superadmin' && location.pathname !== '/amc-payment') {
    return (
      <div className="w-full min-h-screen relative flex items-center justify-center p-4 bg-[#f7f9fb] dark:bg-[#0b0f19] selection:bg-slate-900 dark:selection:bg-slate-100 transition-colors duration-200 font-sans">
        {/* Background Ambient Glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
          <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] bg-rose-500/10 dark:bg-rose-500/15 opacity-70 blur-[140px] rounded-full" />
        </div>

        <div className="w-full max-w-lg mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-fade-in relative z-10">
          {/* Shield Alert Badge */}
          <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-rose-200 dark:border-rose-800">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="inline-block px-3 py-1 bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 font-mono text-[10px] uppercase font-bold rounded-full border border-rose-200 dark:border-rose-900/50">
              Subscription Expired • Account Suspended
            </span>
            <h2 className="text-xl sm:text-2xl font-bold font-headline text-slate-900 dark:text-white">
              Workspace Access Suspended
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
              Your organization's Annual Maintenance Charge (AMC) subscription expired on{' '}
              <strong className="text-slate-900 dark:text-slate-200">
                {new Date(amcRecord.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
              </strong>
              . Platform access has been temporarily suspended until AMC renewal is completed.
            </p>
          </div>

          {/* Due Breakdown Box */}
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-left space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span>Organization</span>
              <span className="font-bold text-slate-900 dark:text-white">{companySettings?.companyName || 'Workspace'}</span>
            </div>
            <div className="flex justify-between items-center text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-2">
              <span>Expired Due Date</span>
              <span className="font-mono font-bold text-rose-600 dark:text-rose-400">
                {new Date(amcRecord.dueDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-900 dark:text-white pt-1">
              <span className="font-bold">AMC Amount Due</span>
              <span className="font-mono text-rose-600 dark:text-rose-400 font-extrabold text-base">
                ₹{(amcRecord.amcCharge || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              onClick={() => navigate('/amc-payment')}
              className="w-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg hover:shadow-rose-500/25 uppercase tracking-wider text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <CreditCard className="w-4 h-4" />
              <span>Pay AMC Now to Restore Access</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onLogout}
              className="text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer py-1"
            >
              Sign Out / Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f7f9fb] dark:bg-[#0b0f19] selection:bg-slate-900 dark:selection:bg-slate-100 dark:selection:text-slate-900 antialiased transition-colors duration-200">
      {!isOnline && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0f172a] text-white px-5 py-3 rounded-full text-xs font-bold shadow-2xl flex items-center gap-2.5 border border-slate-800 animate-bounce">
          <span className="w-2 h-2 bg-amber-500 rounded-full animate-ping" />
          <span>Offline Mode: Core functions are cached.</span>
        </div>
      )}
      {/* Navigation sidebar */}
      <Sidebar
        currentView={location.pathname}
        onNavigate={(path) => navigate(path)}
        userRole={user.role}
        userName={user.fullName}
        onLogout={onLogout}
        onNewTransaction={onNewTransaction}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Floating Header */}
      <Header
        title={(() => {
          switch (location.pathname) {
            case '/dashboard': return 'Member Dashboard';
            case '/fund-collection': return 'Fund Collection';
            case '/loan-repayment': return 'Credit Facilitator';
            case '/loan-list': return 'Loan Register Ledger';
            case '/loan-entry': return 'Underwrite credit facility';
            case '/loan-repayments': return 'Repayment Approvals';
            case '/settings': return 'Operational Terminal';
            case '/roles': return 'Role Management';
            case '/users': return 'User Management';
            case '/menus': return 'Menu Management';
            case '/permissions': return 'Permission Management';
            case '/collection-types': return 'Collection Type Master';
            case '/fund-collection-audit': return 'Collection Audit Summary';
            default: return 'CapitalTrust Portal';
          }
        })()
        }
        onSearch={() => { }}
        userRole={user.role}
        userName={user.fullName}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      {/* In-app push notification toasts */}
      <NotificationToast />

      {/* Primary Workspace Space */}
      <main className="lg:pl-72 lg:pr-8 px-4 sm:px-6 lg:px-0 mx-auto" style={{ minHeight: 'calc(100vh - 65px)' }}>
        <Outlet />
      </main>

      {/* Floating WhatsApp Contact Button */}
      <WhatsAppButton includeUrl={true} />
    </div>
  );
}
