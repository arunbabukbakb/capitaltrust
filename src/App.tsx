import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store';
import { logOut, setCredentials, setMenus, setCompanySettings } from './authSlice';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import FundCollection from './pages/FundCollection';
import LoanRepayment from './pages/LoanRepayment';
import LoanEntry from './pages/LoanEntry';
import LoanList from './pages/LoanList';
import Register from './pages/Register';
import Login from './pages/Login';
import RolesPage from './pages/RolesPage';
import UsersPage from './pages/UsersPage';
import LoanRepaymentList from './pages/LoanRepaymentList';
import PrivateRoute from './components/PrivateRoute';
import CollectionTypeMaster from './pages/CollectionTypeMaster';
import CollectionAuditSummary from './pages/CollectionAuditSummary';
import MenusPage from './pages/MenusPage';
import PermissionsPage from './pages/PermissionsPage';
import SettingsPage from './pages/SettingsPage';
import ProfilePage from './pages/ProfilePage';
import { 
  PlusCircle, 
  Settings as SettingsIcon, 
  ShieldCheck, 
  HelpCircle, 
  X,
  CreditCard,
  Coins
} from 'lucide-react';

export default function App() {
  const { user, menus, activeRole } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchUserMenus = async () => {
      try {
        const query = activeRole ? `?roleId=${activeRole.id}` : '';
        const res = await fetch(`/api/menus/user-menu${query}`);
        if (!res.ok) throw new Error('Failed to fetch user menus');
        const data = await res.json();
        dispatch(setMenus(data));
      } catch (err) {
        console.error("Error loading user menus", err);
      }
    };
    fetchUserMenus();
  }, [user, activeRole, dispatch]);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const res = await fetch('/api/settings/company');
        if (!res.ok) throw new Error('Failed to fetch company settings');
        const data = await res.json();
        dispatch(setCompanySettings(data));
      } catch (err) {
        console.error("Error loading company settings", err);
      }
    };
    fetchCompanySettings();
  }, [dispatch]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout failed', error);
    } finally {
      dispatch(logOut());
      navigate('/login');
    }
  };

  const hasPermission = (menuId: string) => {
    if (!user) return false;
    const activeRoleType = activeRole?.roleType || user.role;
    if (activeRoleType === 'admin') return true;
    return menus.some((m: any) => m.menuId === menuId);
  };

  // Wait until menus are fetched before rendering protected routes to avoid false redirects
  const activeRoleType = activeRole?.roleType || user?.role;
  if (user && activeRoleType !== 'admin' && menus.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center text-xs font-semibold text-slate-500">
        Loading secure routing layout...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f9fb] selection:bg-slate-900 selection:text-white antialiased">
      <Routes>
        {/* Public Routes without Sidebar/Header */}
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" /> :
            <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-4 selection:bg-slate-900 selection:text-white">
              <Login onNavigateToRegister={() => navigate('/register')} />
            </div>
        } />
        <Route path="/register" element={
          user ? <Navigate to="/dashboard" /> :
            <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center p-4 selection:bg-slate-900 selection:text-white">
              <Register onNavigateToLogin={() => navigate('/login')} />
            </div>
        } />

        {/* Private Routes wrapping under MainLayout */}
        <Route element={<PrivateRoute user={user} />}>
          <Route element={<MainLayout user={user} onLogout={handleLogout} onNewTransaction={() => setShowTransactionModal(true)} />}>
            <Route path="/dashboard" element={<Dashboard onNavigate={(path) => navigate(path)} user={user} />} />
            <Route path="/fund-collection" element={hasPermission('fund-collection') ? <FundCollection /> : <Navigate to="/dashboard" replace />} />
            <Route path="/loan-repayment" element={hasPermission('loan-repayment') ? <LoanRepayment /> : <Navigate to="/dashboard" replace />} />
            <Route path="/loan-entry" element={hasPermission('loan-entry') ? <LoanEntry /> : <Navigate to="/dashboard" replace />} />
            <Route path="/loan-list" element={hasPermission('loan-list') ? <LoanList /> : <Navigate to="/dashboard" replace />} />
            <Route path="/roles" element={hasPermission('role-management') ? <RolesPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/users" element={hasPermission('user-management') ? <UsersPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/menus" element={hasPermission('menu-management') ? <MenusPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/permissions" element={hasPermission('permission-management') ? <PermissionsPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/loan-repayments" element={hasPermission('loan-repayments') ? <LoanRepaymentList /> : <Navigate to="/dashboard" replace />} />
            <Route path="/collection-types" element={hasPermission('collection-types') ? <CollectionTypeMaster /> : <Navigate to="/dashboard" replace />} />
            <Route path="/fund-collection-audit" element={hasPermission('fund-collection-audit') ? <CollectionAuditSummary /> : <Navigate to="/dashboard" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>

      {/* FLOATING ACTION MODAL FOR SIMULATING IMMEDIATE BALANCES UPDATE */}
      {showTransactionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-up text-slate-900">
            <header className="flex justify-between items-center mb-6">
              <h4 className="text-lg font-bold font-headline">Simulate Asset Event</h4>
              <button 
                onClick={() => setShowTransactionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </header>

            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Instantly trigger transactions to see dashboard graphs and tables update in real time:
              </p>

              <button 
                onClick={() => {
                  navigate('/loan-repayment');
                  setShowTransactionModal(false);
                }}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-all cursor-pointer"
              >
                <div className="flex gap-3 items-center">
                  <span className="p-2 bg-indigo-50 text-indigo-700 rounded-lg">
                    <CreditCard className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-900">Make Credit Installment</h5>
                    <p className="text-[10px] text-slate-400">Apply cash directly into outstanding principal</p>
                  </div>
                </div>
                <X className="w-4 h-4 text-slate-400 transform rotate-45" />
              </button>

              <button 
                onClick={() => {
                  navigate('/fund-collection');
                  setShowTransactionModal(false);
                }}
                className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 text-left transition-all cursor-pointer"
              >
                <div className="flex gap-3 items-center">
                  <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                    <Coins className="w-4 h-4" />
                  </span>
                  <div>
                    <h5 className="text-xs font-bold text-slate-950">Add Liquidity Contribution</h5>
                    <p className="text-[10px] text-slate-400">Increase aggregate pool volume reserves</p>
                  </div>
                </div>
                <X className="w-4 h-4 text-slate-400 transform rotate-45" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
