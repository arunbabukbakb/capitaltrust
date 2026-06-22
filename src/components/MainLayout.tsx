import React, { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

interface MainLayoutProps {
  user: any;
  onLogout: () => void;
  onNewTransaction: () => void;
}

export default function MainLayout({ user, onLogout, onNewTransaction }: MainLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
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

  return (
    <div className="min-h-screen bg-[#f7f9fb] dark:bg-[#0b0f19] selection:bg-slate-900 dark:selection:bg-slate-100 dark:selection:text-slate-900 antialiased transition-colors duration-200">
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

      {/* Primary Workspace Space */}
      <main className="lg:pl-72 lg:pr-8 min-h-screen mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
