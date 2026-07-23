import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import {
  Search,
  X,
  LayoutDashboard,
  Coins,
  Calculator,
  Users,
  Shield,
  ShieldCheck,
  FileText,
  Receipt,
  FileSpreadsheet,
  Settings,
  HelpCircle,
  Lock,
  CreditCard,
  User,
  Menu,
  ChevronRight,
  Sparkles,
  Command,
  ArrowRight
} from 'lucide-react';
import * as Icons from 'lucide-react';

export interface SearchMenuItem {
  id: string;
  name: string;
  path: string;
  category: string;
  icon: any;
  keywords?: string[];
  menuId?: string;
}

// System predefined main menu dictionary
const DEFAULT_SYSTEM_MENUS: SearchMenuItem[] = [
  {
    id: 'dashboard',
    name: 'Member Dashboard',
    path: '/dashboard',
    category: 'Core',
    icon: LayoutDashboard,
    keywords: ['home', 'overview', 'summary', 'analytics', 'stats', 'dashboard', 'members'],
    menuId: 'dashboard'
  },
  {
    id: 'fund-collection',
    name: 'Fund Collection',
    path: '/fund-collection',
    category: 'Liquidity Pools',
    icon: Coins,
    keywords: ['fund', 'collection', 'deposit', 'collect', 'liquidity', 'money', 'payment'],
    menuId: 'fund-collection'
  },
  {
    id: 'fund-collection-audit',
    name: 'Collection Audit Summary',
    path: '/fund-collection-audit',
    category: 'Liquidity Pools',
    icon: FileText,
    keywords: ['collection summary', 'audit log', 'history', 'report', 'collection audit'],
    menuId: 'fund-collection-audit'
  },
  {
    id: 'collection-types',
    name: 'Collection Type Master',
    path: '/collection-types',
    category: 'Liquidity Pools',
    icon: Shield,
    keywords: ['collection types', 'master', 'categories', 'type master'],
    menuId: 'collection-types'
  },
  {
    id: 'loan-repayment',
    name: 'My Loans (Credit Facilitator)',
    path: '/loan-repayment',
    category: 'Credit Facilities',
    icon: Calculator,
    keywords: ['my loans', 'loan repayment', 'credit facilitator', 'borrow', 'debt', 'facility'],
    menuId: 'loan-repayment'
  },
  {
    id: 'loan-list',
    name: 'Loan Register Ledger',
    path: '/loan-list',
    category: 'Credit Facilities',
    icon: FileText,
    keywords: ['loan list', 'loan register', 'ledger', 'active loans', 'borrowing list'],
    menuId: 'loan-list'
  },
  {
    id: 'loan-entry',
    name: 'Underwrite Credit Facility (Loan Request)',
    path: '/loan-entry',
    category: 'Credit Facilities',
    icon: Users,
    keywords: ['loan request', 'loan entry', 'apply loan', 'underwrite', 'new loan', 'credit facility'],
    menuId: 'loan-entry'
  },
  {
    id: 'loan-repayments',
    name: 'Repayment Approvals',
    path: '/loan-repayments',
    category: 'Credit Facilities',
    icon: ShieldCheck,
    keywords: ['repayment approvals', 'loan repayments', 'approve repayment', 'payment validation'],
    menuId: 'loan-repayments'
  },
  {
    id: 'expenses',
    name: 'Expense Management',
    path: '/expenses',
    category: 'Finance',
    icon: Receipt,
    keywords: ['expenses', 'spending', 'outflow', 'expense management', 'bills', 'costs'],
    menuId: 'expenses'
  },
  {
    id: 'transactions',
    name: 'Transactions Statement',
    path: '/reports/transactions',
    category: 'Reports & Statements',
    icon: FileSpreadsheet,
    keywords: ['transactions', 'report', 'statement', 'ledger', 'accounting', 'history'],
    menuId: 'transactions'
  },
  {
    id: 'users',
    name: 'User Management',
    path: '/users',
    category: 'Administration',
    icon: Users,
    keywords: ['users', 'user management', 'members', 'staff', 'employees', 'accounts', 'directory'],
    menuId: 'user-management'
  },
  {
    id: 'roles',
    name: 'Role Management',
    path: '/roles',
    category: 'Administration',
    icon: Shield,
    keywords: ['roles', 'role management', 'access levels', 'role permissions', 'secuirty'],
    menuId: 'role-management'
  },
  {
    id: 'menus',
    name: 'Menu Management',
    path: '/menus',
    category: 'System Configuration',
    icon: Menu,
    keywords: ['menus', 'menu management', 'navigation setup', 'sidebars', 'menu tree'],
    menuId: 'menus'
  },
  {
    id: 'permissions',
    name: 'Permission Management',
    path: '/permissions',
    category: 'System Configuration',
    icon: Lock,
    keywords: ['permissions', 'permission management', 'rights', 'access control', 'rules'],
    menuId: 'permissions'
  },
  {
    id: 'settings',
    name: 'Operational Terminal (Settings)',
    path: '/settings',
    category: 'System Configuration',
    icon: Settings,
    keywords: ['settings', 'operational terminal', 'configuration', 'company settings', 'branding'],
    menuId: 'settings'
  },
  {
    id: 'profile',
    name: 'My Account Profile',
    path: '/profile',
    category: 'User Account',
    icon: User,
    keywords: ['profile', 'account', 'my profile', 'user details', 'edit profile', 'avatar', 'password'],
    menuId: 'profile'
  },
  {
    id: 'workspace-payment',
    name: 'Workspace Subscription',
    path: '/workspace-payment',
    category: 'Billing',
    icon: CreditCard,
    keywords: ['workspace payment', 'subscription', 'billing', 'upgrade', 'plan', 'payment'],
    menuId: 'workspace-payment'
  },
  {
    id: 'amc-payment',
    name: 'AMC Renewal & Billing',
    path: '/amc-payment',
    category: 'Billing',
    icon: CreditCard,
    keywords: ['amc payment', 'annual maintenance charge', 'renew', 'invoice', 'billing'],
    menuId: 'amc-payment'
  },
  {
    id: 'docs',
    name: 'Documentation & User Guide',
    path: '/docs',
    category: 'Help & Knowledgebase',
    icon: HelpCircle,
    keywords: ['documentation', 'docs', 'user guide', 'help', 'manual', 'tutorial', 'getting started'],
    menuId: 'docs'
  }
];

interface SearchAutocompleteProps {
  placeholder?: string;
  className?: string;
}

export default function SearchAutocomplete({
  placeholder = "Search menus, features, loans...",
  className = ""
}: SearchAutocompleteProps) {
  const navigate = useNavigate();
  const { user, menus: dbMenus, activeRole } = useSelector((state: RootState) => state.auth);

  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Build full accessible list of menus based on DB menus and predefined list
  const availableMenus = useMemo(() => {
    const activeRoleType = activeRole?.roleType || user?.role;
    const isAdmin = activeRoleType === 'admin' || user?.role === 'superadmin';

    const menuList: SearchMenuItem[] = [...DEFAULT_SYSTEM_MENUS];

    // Merge DB dynamic user menus if present
    if (Array.isArray(dbMenus) && dbMenus.length > 0) {
      dbMenus.forEach((dbItem: any) => {
        if (!dbItem.path) return;
        const exists = menuList.some(m => m.path === dbItem.path);
        if (!exists) {
          let IconComponent = HelpCircle;
          if (dbItem.icon && dbItem.icon in Icons) {
            IconComponent = (Icons as any)[dbItem.icon];
          }
          menuList.push({
            id: dbItem.menuId || `db-${dbItem.id}`,
            name: dbItem.name,
            path: dbItem.path,
            category: 'System Menu',
            icon: IconComponent,
            keywords: [dbItem.name.toLowerCase()],
            menuId: dbItem.menuId
          });
        }
      });
    }

    // Filter by permissions if non-admin and DB menus exist
    if (!isAdmin && Array.isArray(dbMenus) && dbMenus.length > 0) {
      return menuList.filter(item => {
        if (!item.menuId) return true;
        if (item.path === '/profile' || item.path === '/docs' || item.path === '/dashboard') return true;
        return dbMenus.some((m: any) => m.menuId === item.menuId || m.path === item.path);
      });
    }

    return menuList;
  }, [dbMenus, user, activeRole]);

  // Filter items matching query
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // Top recommended default menus when search input is empty
      return availableMenus.slice(0, 6);
    }

    return availableMenus.filter(item => {
      const matchName = item.name.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchPath = item.path.toLowerCase().includes(q);
      const matchKeyword = item.keywords?.some(kw => kw.toLowerCase().includes(q));
      return matchName || matchCategory || matchPath || matchKeyword;
    });
  }, [query, availableMenus]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults]);

  // Outside click listener
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K to focus search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle navigate to item
  const handleSelect = (item: SearchMenuItem) => {
    setIsOpen(false);
    setQuery('');
    inputRef.current?.blur();
    navigate(item.path);
  };

  // Keyboard navigation inside input
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, filteredResults.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredResults.length) % Math.max(1, filteredResults.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        handleSelect(filteredResults[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      inputRef.current?.blur();
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Search Input Box */}
      <div className="relative flex items-center">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-4 h-4 pointer-events-none transition-colors" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder={placeholder}
          className="pl-9 pr-14 py-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 rounded-full text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 dark:focus:ring-indigo-500/40 focus:border-indigo-500 dark:focus:border-indigo-500 w-56 sm:w-64 md:w-72 lg:w-80 transition-all shadow-inner"
        />
        {/* Clear Button or Ctrl+K Hint */}
        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {query ? (
            <button
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold text-slate-400 dark:text-slate-500 bg-slate-200/70 dark:bg-slate-800 rounded border border-slate-300/60 dark:border-slate-700/60">
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          )}
        </div>
      </div>

      {/* Autocomplete Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-80 sm:w-96 max-w-[90vw] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header Tag */}
          <div className="px-4 py-2.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
              {query ? (
                <>
                  <Search className="w-3 h-3 text-indigo-500" />
                  <span>Matching Menus ({filteredResults.length})</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Quick Menu Navigation</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              {query ? 'Filter by name or route' : 'Popular destinations'}
            </span>
          </div>

          {/* Results List */}
          <div className="max-h-72 overflow-y-auto custom-scrollbar p-1.5 space-y-0.5">
            {filteredResults.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2">
                <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Search className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  No menus found matching "<span className="text-indigo-500">{query}</span>"
                </p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Try searching for "Dashboard", "Loans", "Collection", "Expenses", or "Users"
                </p>
              </div>
            ) : (
              filteredResults.map((item, index) => {
                const ItemIcon = item.icon || HelpCircle;
                const isSelected = index === selectedIndex;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-950 dark:text-indigo-100 border border-indigo-100 dark:border-indigo-900/50'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Icon */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                        }`}
                      >
                        <ItemIcon className="w-4 h-4" />
                      </div>

                      {/* Title & Category */}
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate leading-tight">
                          {item.name}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-medium px-1.5 py-0.2 rounded ${
                              isSelected
                                ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                            }`}
                          >
                            {item.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate">
                            {item.path}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Arrow / Selection Indicator */}
                    <div className="flex items-center gap-1 flex-shrink-0 text-slate-400">
                      {isSelected ? (
                        <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-100/60 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full">
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </div>
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Keyboard Footer Controls */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/70 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↑</kbd>
                <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↓</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">↵</kbd>
                select
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px]">ESC</kbd>
              close
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
