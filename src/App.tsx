import React, { useState, useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from './store';
import { logOut, setCredentials, setMenus, setCompanySettings } from './authSlice';
import MainLayout from './components/MainLayout';
import Dashboard from './pages/Dashboard';
import FundCollection from './pages/collection/FundCollection';
import LoanRepayment from './pages/loan/MyLoans';
import LoanEntry from './pages/loan/LoanEntry';
import LoanRequest from './pages/loan/LoanRequest';
import { getSubdomain } from './main';
import LandingPage from './pages/LandingPage';
import TenantRegistration from './pages/tenant/TenantRegistration';
import LoanList from './pages/loan/LoanList';
import Register from './pages/auth/Register';
import Login from './pages/auth/Login';
import ResetPassword from './pages/auth/ResetPassword';
import RolesPage from './pages/user/RolesPage';
import UsersPage from './pages/user/UsersPage';
import LoanRepaymentList from './pages/loan/LoanRepaymentList';
import PrivateRoute from './components/PrivateRoute';
import CollectionTypeMaster from './pages/collection/CollectionTypeMaster';
import CollectionAuditSummary from './pages/collection/CollectionAuditSummary';
import MenusPage from './pages/user/MenusPage';
import PermissionsPage from './pages/user/PermissionsPage';
import SettingsPage from './pages/tenant/SettingsPage';
import ContactPage from './pages/tenant/ContactPage';
import ProfilePage from './pages/user/ProfilePage';
import AdminLogin from './pages/superadmin/AdminLogin';
import SuperAdminDashboard from './pages/superadmin/SuperAdminDashboard';
import TenantManagement from './pages/superadmin/TenantManagement';
import TrafficDashboard from './pages/superadmin/TrafficDashboard';
import { useTrafficTracker } from './hooks/useTrafficTracker';
import SmtpSettings from './pages/superadmin/SmtpSettings';
import SendMailPage from './pages/superadmin/SendMailPage';
import SupportInboxPage from './pages/superadmin/SupportInboxPage';
import SuperAdminLayout from './components/SuperAdminLayout';
import AdminProfile from './pages/superadmin/AdminProfile';
import AdminPricing from './pages/superadmin/AdminPricing';
import AdminCompanyDetails from './pages/superadmin/AdminCompanyDetails';
import AdminMaintenanceNotice from './pages/superadmin/AdminMaintenanceNotice';
import MaintenanceNoticePage from './pages/MaintenanceNoticePage';
import WorkspacePayment from './pages/tenant/WorkspacePayment';
import AmcPayment from './pages/tenant/AmcPayment';
import ExpensesPage from './pages/expense/ExpensesPage';
import TransactionsPage from './pages/reports/TransactionsPage';
import MemberLedger from './pages/reports/MemberLedger';
import DueReport from './pages/reports/DueReport';
import DocLayout from './pages/documentation/DocLayout';
import GettingStartedDoc from './pages/documentation/GettingStartedDoc';
import MemberManagementDoc from './pages/documentation/MemberManagementDoc';
import CollectionDoc from './pages/documentation/CollectionDoc';
import LoanDoc from './pages/documentation/LoanDoc';
import ExpenseDoc from './pages/documentation/ExpenseDoc';
import AdminFeaturesDoc from './pages/documentation/AdminFeaturesDoc';
import ReportDoc from './pages/documentation/ReportDoc';
import PrivacyPolicy from './pages/legal/PrivacyPolicy';
import TermsOfService from './pages/legal/TermsOfService';
import {
  PlusCircle,
  Settings as SettingsIcon,
  ShieldCheck,
  HelpCircle,
  X,
  CreditCard,
  Coins,
  AlertTriangle
} from 'lucide-react';
import { initializePushNotifications, registerForegroundMessageHandler } from './firebase';

export default function App() {
  useTrafficTracker();
  const { user, menus, activeRole, companySettings } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);


  useEffect(() => {
    if (!user) return;

    // Do not call user-menu API when user is on login/register auth pages
    const isAuthRoute = ['/login', '/register', '/admin/login', '/forgot-password', '/reset-password'].includes(location.pathname);
    if (isAuthRoute) return;

    const fetchUserMenus = async () => {
      try {
        const query = activeRole ? `?roleId=${activeRole.id}` : '';
        const res = await fetch(`/api/menus/user-menu${query}`);
        if (res.status === 401) {
          // Token expired or invalid — clear stale session credentials
          dispatch(logOut());
          return;
        }
        if (!res.ok) throw new Error('Failed to fetch user menus');
        const data = await res.json();
        dispatch(setMenus(data));
      } catch (err) {
        console.error("Error loading user menus", err);
      }
    };
    fetchUserMenus();
  }, [user, activeRole, location.pathname, dispatch]);

  // Initialize Firebase push notifications when a user session is active
  useEffect(() => {
    if (!user) return;

    const isAuthRoute = ['/login', '/register', '/admin/login', '/forgot-password', '/reset-password'].includes(location.pathname);
    if (isAuthRoute) return;

    initializePushNotifications().catch(err =>
      console.warn('[FCM] Push notification init error:', err)
    );
    registerForegroundMessageHandler();
  }, [user, location.pathname]);

  useEffect(() => {
    const fetchCompanySettings = async () => {
      try {
        const res = await fetch('/api/settings/company');
        if (res.status === 404) {
          const data = await res.json().catch(() => ({}));
          if (data.error === 'tenant_not_found') {
            setTenantError('not_found');
            return;
          }
        }
        if (res.status === 403) {
          const data = await res.json().catch(() => ({}));
          if (data.error === 'tenant_deactivated') {
            setTenantError('deactivated');
            return;
          }
        }
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

  const subdomain = getSubdomain();

  const getMainDomainUrl = (path: string = '/register-tenant') => {
    const envUrl =
      (import.meta as any).env?.VITE_APP_URL ||
      (typeof process !== 'undefined' && process.env?.VITE_APP_URL);
    if (envUrl) {
      try {
        const url = new URL(envUrl);
        url.pathname = path;
        return url.toString();
      } catch (e) { }
    }

    const protocol = window.location.protocol;
    const portStr = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${window.location.hostname}${portStr}${path}`;
  };

  if (tenantError === 'not_found' && subdomain) {
    return (
      <div className="min-h-screen bg-[#090d16] text-[#e2e8f0] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6 relative z-10">
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400">
            <ShieldCheck className="w-10 h-10 text-indigo-400 animate-pulse" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-headline">Workspace Not Registered</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The organization space <span className="text-indigo-300 font-mono font-bold">"{subdomain}"</span> has not been registered with CapitalTrust.
            </p>
          </div>

          <div className="space-y-3">
            <a
              href={getMainDomainUrl()}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition-all transform hover:-translate-y-0.5 cursor-pointer no-underline"
            >
              Register this Organization
            </a>
            <a
              href={`http://${window.location.hostname.split('.').slice(1).join('.') || 'localhost'}${window.location.port ? `:${window.location.port}` : ''}`}
              className="block w-full text-center text-xs text-slate-400 hover:text-white transition-colors py-2 cursor-pointer no-underline"
            >
              Back to CapitalTrust Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (tenantError === 'deactivated' && subdomain) {
    return (
      <div className="min-h-screen bg-[#090d16] text-[#e2e8f0] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans select-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-red-500/10 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-orange-500/10 blur-[150px] pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/40 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6 relative z-10">
          <div className="mx-auto w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-400 animate-bounce">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold text-white font-headline">Workspace Suspended</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              The organization space <span className="text-rose-455 font-mono font-bold">"{subdomain}"</span> has been suspended. Please contact system administrators for resolution.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <a
              href={`http://${window.location.hostname.split('.').slice(1).join('.') || 'localhost'}${window.location.port ? `:${window.location.port}` : ''}`}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-slate-800 to-slate-950 hover:from-slate-700 hover:to-slate-900 border border-slate-700 text-white text-xs font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer no-underline"
            >
              Back to CapitalTrust Home
            </a>
          </div>
        </div>
      </div>
    );
  }

  const isSuperAdminRoute = location.pathname.startsWith('/admin');

  // If maintenance mode is enabled by SuperAdmin, redirect non-admin routes to MaintenanceNoticePage
  if (companySettings?.ismaintanance && !isSuperAdminRoute) {
    return <MaintenanceNoticePage companySettings={companySettings} />;
  }

  if (!subdomain) {
    return (
      <div className="bg-[#090d16] text-[#e2e8f0] selection:bg-indigo-500 selection:text-white antialiased">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/register-tenant" element={<TenantRegistration />} />

          {/* Customer Documentation Module Routes */}
          <Route path="/document" element={<DocLayout />}>
            <Route index element={<Navigate to="/document/getting-started" replace />} />
            <Route path="getting-started" element={<GettingStartedDoc />} />
            <Route path="member-management" element={<MemberManagementDoc />} />
            <Route path="collection" element={<CollectionDoc />} />
            <Route path="loan" element={<LoanDoc />} />
            <Route path="expense" element={<ExpenseDoc />} />
            <Route path="admin-features" element={<AdminFeaturesDoc />} />
            <Route path="report" element={<ReportDoc />} />
          </Route>

          <Route path="/admin/login" element={<AdminLogin />} />
          <Route element={<SuperAdminLayout />}>
            <Route path="/admin/dashboard" element={<SuperAdminDashboard />} />
            <Route path="/admin/tenants" element={<TenantManagement />} />
            <Route path="/admin/traffic" element={<TrafficDashboard />} />
            <Route path="/admin/company-details" element={<AdminCompanyDetails />} />
            <Route path="/admin/maintenance" element={<AdminMaintenanceNotice />} />
            <Route path="/admin/send-mail" element={<SendMailPage />} />
            <Route path="/admin/smtp" element={<SmtpSettings />} />
            <Route path="/admin/support-inbox" element={<SupportInboxPage />} />
            <Route path="/admin/pricing" element={<AdminPricing />} />
            <Route path="/admin/profile" element={<AdminProfile />} />
            <Route path="/admin/menus" element={<MenusPage />} />
          </Route>
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

          {/* Legal Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    );
  }

  // Wait until menus are fetched before rendering protected routes to avoid false redirects
  const activeRoleType = activeRole?.roleType || user?.role;
  if (user && activeRoleType !== 'admin' && menus.length === 0) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] flex items-center justify-center text-xs font-semibold text-slate-500">
        Loading secure routing layout...
      </div>
    );
  }

  const isAllowedUnpaidRoute =
    location.pathname === '/payment' ||
    location.pathname === '/amc-payment' ||
    location.pathname === '/privacy-policy' ||
    location.pathname === '/terms-of-service' ||
    location.pathname.startsWith('/document');

  if (companySettings?.paymentStatus === 'Pending' && !isSuperAdminRoute && !isAllowedUnpaidRoute) {
    return <Navigate to="/payment" replace />;
  }
  if (companySettings?.paymentStatus === 'Paid' && location.pathname === '/payment') {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="bg-[#f7f9fb] selection:bg-slate-900 selection:text-white antialiased">
      <Routes>
        <Route path="/" element={user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />} />
        <Route path="/payment" element={<WorkspacePayment />} />
        <Route path="/amc-payment" element={<AmcPayment />} />
        <Route path="/login" element={
          user ? <Navigate to="/dashboard" /> :
            <div className="min-h-screen bg-[#f7f9fb] dark:bg-[#0b0f19] flex items-center justify-center p-4 selection:bg-slate-900 dark:selection:bg-slate-100 dark:selection:text-slate-900 transition-colors duration-200">
              <Login onNavigateToRegister={() => navigate('/register')} />
            </div>
        } />
        <Route path="/register" element={
          user ? <Navigate to="/dashboard" /> :
            <div className="min-h-screen bg-[#f7f9fb] dark:bg-[#0b0f19] flex items-center justify-center p-4 selection:bg-slate-900 dark:selection:bg-slate-100 dark:selection:text-slate-900 transition-colors duration-200">
              <Register onNavigateToLogin={() => navigate('/login')} />
            </div>
        } />
        <Route path="/reset-password" element={
          <div className="min-h-screen bg-[#f7f9fb] dark:bg-[#0b0f19] flex items-center justify-center p-4 selection:bg-slate-900 dark:selection:bg-slate-100 dark:selection:text-slate-900 transition-colors duration-200">
            <ResetPassword />
          </div>
        } />

        {/* Customer Documentation Module Routes */}
        <Route path="/document" element={<DocLayout />}>
          <Route index element={<Navigate to="/document/getting-started" replace />} />
          <Route path="getting-started" element={<GettingStartedDoc />} />
          <Route path="member-management" element={<MemberManagementDoc />} />
          <Route path="collection" element={<CollectionDoc />} />
          <Route path="loan" element={<LoanDoc />} />
          <Route path="expense" element={<ExpenseDoc />} />
          <Route path="admin-features" element={<AdminFeaturesDoc />} />
          <Route path="report" element={<ReportDoc />} />
        </Route>

        {/* Legal Pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        <Route path="/terms-of-service" element={<TermsOfService />} />

        {/* Private Routes wrapping under MainLayout */}
        <Route element={<PrivateRoute user={user} />}>
          <Route element={<MainLayout user={user} onLogout={handleLogout} onNewTransaction={() => setShowTransactionModal(true)} />}>
            <Route path="/dashboard" element={<Dashboard onNavigate={(path) => navigate(path)} user={user} />} />
            <Route path="/fund-collection" element={hasPermission('fund-collection') ? <FundCollection /> : <Navigate to="/dashboard" replace />} />
            <Route path="/loan-repayment" element={hasPermission('loan-repayment') ? <LoanRepayment /> : <Navigate to="/dashboard" replace />} />
            <Route path="/loan-entry" element={hasPermission('loan-entry') ? <LoanEntry /> : <Navigate to="/dashboard" replace />} />
            <Route path="/loan-request" element={<LoanRequest />} />
            <Route path="/loan-list" element={hasPermission('loan-list') ? <LoanList /> : <Navigate to="/dashboard" replace />} />
            <Route path="/roles" element={hasPermission('role-management') ? <RolesPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/users" element={hasPermission('user-management') ? <UsersPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/permissions" element={hasPermission('permission-management') ? <PermissionsPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/loan-repayments" element={hasPermission('loan-repayments') ? <LoanRepaymentList /> : <Navigate to="/dashboard" replace />} />
            <Route path="/collection-types" element={hasPermission('collection-types') ? <CollectionTypeMaster /> : <Navigate to="/dashboard" replace />} />
            <Route path="/fund-collection-audit" element={hasPermission('fund-collection-audit') ? <CollectionAuditSummary /> : <Navigate to="/dashboard" replace />} />
            <Route path="/expenses" element={hasPermission('expenses') ? <ExpensesPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/reports/transactions" element={hasPermission('transactions') ? <TransactionsPage /> : <Navigate to="/dashboard" replace />} />
            <Route path="/reports/member-ledger" element={hasPermission('member-ledger') ? <MemberLedger /> : <Navigate to="/dashboard" replace />} />
            <Route path="/reports/due-report" element={hasPermission('due-report') ? <DueReport /> : <Navigate to="/dashboard" replace />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/contact" element={(user?.role === 'admin' || user?.role === 'manager' || activeRole?.roleType === 'admin' || activeRole?.roleType === 'manager') ? <ContactPage /> : <Navigate to="/dashboard" replace />} />
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
