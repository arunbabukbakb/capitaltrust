import React, { useState, useEffect } from 'react';
import {
  Settings,
  HelpCircle,
  LogOut,
  PlusCircle,
  X,
  ChevronDown,
  Download,
  Mail
} from 'lucide-react';
import { navConfig } from './navConfig';
import * as Icons from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface MenuRow {
  id: number;
  menuId: string;
  name: string;
  icon?: string;
  path?: string;
  parentId?: string;
  menuOrder: number;
}

function buildMenuTree(rows: MenuRow[]): any[] {
  const itemMap: { [key: string]: any } = {};

  // First pass: create all NavItem objects
  rows.forEach(row => {
    let IconComponent = Icons.HelpCircle;
    if (row.icon && row.icon in Icons) {
      IconComponent = (Icons as any)[row.icon];
    }

    itemMap[row.menuId] = {
      id: row.menuId,
      name: row.name,
      icon: IconComponent,
      path: row.path || undefined,
      children: []
    };
  });

  const tree: any[] = [];

  // Second pass: wire up children
  rows.forEach(row => {
    const item = itemMap[row.menuId];
    if (row.parentId && itemMap[row.parentId]) {
      itemMap[row.parentId].children.push(item);
    } else {
      tree.push(item);
    }
  });

  // Clean empty children
  const cleanTree = (items: any[]): any[] => {
    return items.map(item => {
      const copy = { ...item };
      if (copy.children && copy.children.length === 0) {
        delete copy.children;
      } else if (copy.children) {
        copy.children = cleanTree(copy.children);
      }
      return copy;
    });
  };

  return cleanTree(tree);
}

interface SidebarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  userRole: string;
  userName: string;
  onLogout: () => void;
  onNewTransaction: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  currentView,
  onNavigate,
  userRole,
  userName,
  onLogout,
  onNewTransaction,
  isOpen,
  onClose
}: SidebarProps) {
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const { menus: rawMenus, activeRole, companySettings } = useSelector((state: RootState) => state.auth);
  const menus = buildMenuTree(rawMenus);
  const effectiveRoleType = activeRole?.roleType || userRole;
  const loadingMenus = rawMenus.length === 0 && effectiveRoleType !== 'admin';

  useEffect(() => {
    if (menus.length > 0) {
      const activeParent = menus.find((item: any) => item.children?.some((child: any) => child.path === currentView));
      if (activeParent) {
        setOpenMenus(prev => prev.includes(activeParent.id) ? prev : [...prev, activeParent.id]);
      }
    }
  }, [menus, currentView]);

  const [deferredPrompt, setDeferredPrompt] = useState<any>((window as any).deferredPrompt || null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleInstallable = () => {
      setDeferredPrompt((window as any).deferredPrompt);
    };
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    };
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('pwa-installable', handleInstallable);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      (window as any).deferredPrompt = null;
    }
  };

  const toggleMenu = (id: string) => {
    setOpenMenus(prev =>
      prev.includes(id) ? prev.filter(menuId => menuId !== id) : [...prev, id]
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden transition-opacity"
          onClick={onClose}
        />
      )}

      <aside className={`h-full w-64 fixed left-0 top-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col py-8 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-colors duration-200`}>
        {/* Brand Identity Header */}
        <div className="px-6 mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-xl font-bold font-headline tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {companySettings?.companyLogo ? (
                <img
                  src={companySettings.companyLogo}
                  alt={companySettings.companyName || 'Logo'}
                  className="max-h-8 max-w-[120px] object-contain flex-shrink-0"
                />
              ) : (
                <span className="p-1 px-1.5 bg-slate-900 text-white rounded text-base">🏛️</span>
              )}
              <span className="truncate">{companySettings?.companyName || 'CapitalTrust'}</span>
            </h1>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
              Fund Management
            </p>
          </div>
          <button onClick={onClose} className="lg:hidden p-1.5 -mr-2 text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable middle section */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {/* Role Tag */}
          <div className="px-6 mb-6 flex flex-col gap-2">
            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${effectiveRoleType === 'admin'
              ? 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50'
              : effectiveRoleType === 'manager'
                ? 'bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 border border-blue-100 dark:border-blue-900/50'
                : 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${effectiveRoleType === 'admin'
                ? 'bg-rose-500'
                : effectiveRoleType === 'manager'
                  ? 'bg-blue-500'
                  : 'bg-emerald-500'
                }`} />
              <span>Role: {
                activeRole?.roleName || (
                  effectiveRoleType === 'admin'
                    ? 'Fund Administrator'
                    : effectiveRoleType === 'manager'
                      ? 'Fund Manager'
                      : 'Institutional Member'
                )
              }</span>
            </div>

            <div className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 ${isOnline
              ? 'bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
              }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500 animate-ping'}`} />
              <span>Status: {isOnline ? 'Connected' : 'Working Offline'}</span>
            </div>
          </div>

          {/* Navigation Space */}
          <nav className="space-y-1">
            {loadingMenus ? (
              <div className="px-6 py-3 text-xs text-slate-400 dark:text-slate-500">Loading menu...</div>
            ) : (
              menus.map((item) => {
                const Icon = item.icon;
                const isParentActive = item.children?.some((child: any) => child.path === currentView);
                const isMenuOpen = openMenus.includes(item.id);

                if (item.children && item.children.length > 0) {
                  return (
                    <div key={item.id}>
                      <button
                        onClick={() => toggleMenu(item.id)}
                        className={`w-full flex justify-between items-center gap-4 px-6 py-3 text-sm font-medium transition-all duration-200 border-r-4 cursor-pointer ${isParentActive
                          ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-600 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 border-transparent'
                          }`}
                      >
                        <div className="flex items-center gap-4">
                          <Icon className="w-5 h-5" />
                          <span>{item.name}</span>
                        </div>
                        <ChevronDown className={`w-4 h-4 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                      </button>
                      {isMenuOpen && (
                        <div className="pl-10 py-1 space-y-1 bg-slate-50/50 dark:bg-slate-900/30">
                          {item.children.map((child: any) => (
                            <button
                              key={child.id}
                              onClick={() => { onNavigate(child.path!); onClose(); }}
                              className={`w-full text-left flex items-center gap-3 px-4 py-2 text-xs rounded-md cursor-pointer ${currentView === child.path
                                ? 'font-bold text-emerald-800 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-950/30'
                                : 'font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                                }`}
                            >
                              <span>{child.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }

                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.path!); onClose(); }}
                    className={`w-full flex items-center gap-4 px-6 py-3 text-sm font-medium transition-all duration-200 border-r-4 cursor-pointer ${currentView === item.path
                      ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border-emerald-600 font-bold'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900 border-transparent'
                      }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </button>
                );
              })
            )}
          </nav>

          {/* Custom Bottom Actions */}
          <div className="px-6 py-4 mt-6 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                onNavigate('/fund-collection');
                onClose();
              }}
              className="w-full py-3 bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-950 rounded-lg font-medium text-xs tracking-wider uppercase hover:bg-slate-900 dark:hover:bg-white transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Transaction</span>
            </button>

            <div className="mt-6 space-y-2">
              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center gap-4 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4 text-emerald-600 animate-bounce" />
                  <span>Install App</span>
                </button>
              )}
              <button
                onClick={() => {
                  onNavigate('/settings');
                  onClose();
                }}
                className="w-full flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              {(effectiveRoleType === 'admin' || effectiveRoleType === 'manager') && (
                <button
                  onClick={() => {
                    onNavigate('/contact');
                    onClose();
                  }}
                  className="w-full flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4" />
                  <span>Contact Support</span>
                </button>
              )}
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Log out ({userName.split(' ')[0]})</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
