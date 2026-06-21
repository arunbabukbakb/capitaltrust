import React from 'react';
import { Search, Bell, Grid, UserCheck, Menu } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setActiveRole } from '../authSlice';

interface HeaderProps {
  title: string;
  onSearch: (query: string) => void;
  userRole: string;
  userName: string;
  onToggleSidebar: () => void;
}

export default function Header({
  title,
  onSearch,
  userRole,
  userName,
  onToggleSidebar
}: HeaderProps) {
  const { assignedRoles, activeRole } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const effectiveRoleType = activeRole?.roleType || userRole;

  return (
    <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-256px)] h-14 z-40 bg-white/85 backdrop-blur-md border-b border-slate-200 flex justify-between items-center px-4 lg:px-8 shadow-sm">
      <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        {/* Title */}
        <h2 className="text-xs sm:text-sm font-bold font-headline text-slate-900 lg:min-w-[180px] truncate">
          {title}
        </h2>

        {/* Secondary Links tab layout */}
        <div className="hidden md:flex gap-5 items-center ml-4">
          <span className="text-slate-900 border-b-2 border-slate-900 pb-0.5 text-xs font-bold cursor-pointer">
            Overview
          </span>
          <span className="text-slate-500 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer">
            History
          </span>
          <span className="text-slate-500 hover:text-slate-900 text-xs font-semibold transition-colors cursor-pointer">
            Analytics
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-2 lg:gap-4 flex-shrink-0">
        {/* Search tool */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            onChange={(e) => onSearch(e.target.value)}
            className="pl-9 pr-4 py-1 bg-slate-100 border-none rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-950 w-56 transition-all"
            placeholder="Search files, loans, members..."
            type="text"
          />
        </div>

        {/* Notifications and controls */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          <button className="relative p-1.5 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-rose-500 rounded-full" />
          </button>
          
          <button className="hidden sm:block p-1.5 text-slate-500 hover:text-slate-900 rounded-full hover:bg-slate-100 transition-colors">
            <Grid className="w-4 h-4" />
          </button>

          {/* User Profile Avatar block */}
          <div className="flex items-center gap-2 md:gap-3 pl-2 flex-shrink-0">
            <div className="text-right">
              <p className="hidden md:block text-xs font-bold text-slate-900">{userName}</p>
              {assignedRoles && assignedRoles.length > 1 ? (
                <select
                  value={activeRole?.id || ''}
                  onChange={(e) => {
                    const roleId = Number(e.target.value);
                    const selectedRole = assignedRoles.find((r: any) => r.id === roleId);
                    if (selectedRole) {
                      dispatch(setActiveRole(selectedRole));
                    }
                  }}
                  className="text-[10px] text-slate-600 font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-950 cursor-pointer mt-0.5 flex-shrink-0"
                >
                  {assignedRoles.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="hidden md:block text-[10px] text-slate-500 font-semibold capitalize">{activeRole?.roleName || userRole}</p>
              )}
            </div>
            <div className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 bg-slate-100 flex-shrink-0">
              <img
                alt={userName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                src={
                  effectiveRoleType === 'admin'
                    ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGrNVNKLXvo4n_tKUGnxJ0gmHmAT-t_0RbGE-AmB6-7a6Yj7f1ytjTl-Fw-RYK3PJmN7skaXx3GiqjAjSbMRTlLB_1fpJU9dqN1LrktLOmevrlkqzwFyFrtw1F6Sp0sqxU5CjHs4YZsSGpJZTQVWZ4K88NVl-3Y88CKyOJ2h3X9fF24e_M8naGen0BdZKQ114jZTij0NDS7Yzz8CofOBpZmfPFyrdDfy3-duS9xZ4v-8QPHyrdcmfp'
                    : 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgqVnHZ7SvmmKGwurMdekXzniIdX2Q41WpT1deju-XfmEnKKLBUT_Ali2KILugw2rxG9NtLKLtIj3NQgGHpSvpM5qaeGkQz_WS9cbj5Cj3VJlRGN3a9aasm0S4zGW8Ymhlm2H1OTsor-SqD9tQyQHQJl3qe-fPqgX2oSpPqbOCyu2y0902Q0hNvLqJ9Y76dxjiNJmAJqcsOue9n0cjvIpmGVJuZYBj923I5mOLLcTgb5kgOOO5GnBs'
                }
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
