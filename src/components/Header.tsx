import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Search, Bell, Grid, Menu, Sun, Moon, X, CheckCheck, Trash2, Clock } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { Link } from 'react-router-dom';
import { RootState } from '../store';
import { setActiveRole } from '../authSlice';
import { useTheme } from './ThemeContext';
import { notificationStore, AppNotification } from '../notificationStore';
import SearchAutocomplete from './SearchAutocomplete';

interface HeaderProps {
  title: string;
  onSearch?: (query: string) => void;
  userRole: string;
  userName: string;
  onToggleSidebar: () => void;
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Header({
  title,
  onSearch,
  userRole,
  userName,
  onToggleSidebar
}: HeaderProps) {
  const { user, assignedRoles, activeRole } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const { theme, toggleTheme } = useTheme();
  const effectiveRoleType = activeRole?.roleType || userRole;

  // ── Search & Notification panel state ───────────────────────────────────────
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);

  // Keep in sync with the notification store
  useEffect(() => {
    return notificationStore.subscribe(setNotifications);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!panelOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        bellRef.current && !bellRef.current.contains(e.target as Node)
      ) {
        setPanelOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelOpen]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleBellClick = useCallback(() => {
    setPanelOpen(prev => !prev);
    if (!panelOpen) {
      // Mark all read a moment after the panel opens
      setTimeout(() => notificationStore.markAllRead(), 400);
    }
  }, [panelOpen]);

  return (
    <header className="fixed top-0 right-0 w-full lg:w-[calc(100%-256px)] h-14 z-40 bg-white/85 dark:bg-slate-950/85 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex justify-between items-center px-4 lg:px-8 shadow-sm transition-colors duration-200">
      <div className="flex items-center gap-2 lg:gap-4 flex-1 min-w-0">
        <button onClick={onToggleSidebar} className="lg:hidden p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg transition-colors flex-shrink-0">
          <Menu className="w-5 h-5" />
        </button>
        {/* Title */}
        <h2 className="text-xs sm:text-sm font-bold font-headline text-slate-900 dark:text-slate-100 lg:min-w-[180px] truncate">
          {title}
        </h2>
      </div>

      <div className="flex items-center gap-1 md:gap-2 lg:gap-4 flex-shrink-0">
        {/* Search Autocomplete with menus */}
        <SearchAutocomplete className="hidden md:block" />

        {/* Mobile Search Toggle Button */}
        <button
          onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
          className="md:hidden p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
          aria-label="Search menus and features"
          title="Search menus & features"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Mobile Search Bar Drawer */}
        {mobileSearchOpen && (
          <div className="fixed inset-x-0 top-14 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md p-3 border-b border-slate-200 dark:border-slate-800 z-50 md:hidden shadow-xl animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <SearchAutocomplete className="w-full" placeholder="Search menus, features..." />
              <button
                onClick={() => setMobileSearchOpen(false)}
                className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Notifications and controls */}
        <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
            title={theme === 'light' ? 'Switch to Dark Mode' : 'Switch to Light Mode'}
          >
            {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          </button>

          {/* ── Bell Button + Notification Panel ─────────────────────────── */}
          <div className="relative">
            <button
              ref={bellRef}
              id="header-notification-bell"
              onClick={handleBellClick}
              className="relative p-1.5 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-full hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
              {unreadCount === 0 && notifications.length > 0 && (
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-slate-300 dark:bg-slate-600 rounded-full" />
              )}
            </button>

            {/* Dropdown panel */}
            {panelOpen && (
              <div
                ref={panelRef}
                id="header-notification-panel"
                className="notif-panel"
              >
                {/* Panel header */}
                <div className="notif-panel__header">
                  <div className="notif-panel__header-left">
                    <Bell size={14} className="text-indigo-500" />
                    <span className="notif-panel__title">Notifications</span>
                    {notifications.length > 0 && (
                      <span className="notif-panel__count">{notifications.length}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {notifications.length > 0 && (
                      <>
                        <button
                          onClick={() => notificationStore.markAllRead()}
                          className="notif-panel__action-btn"
                          title="Mark all as read"
                        >
                          <CheckCheck size={13} />
                        </button>
                        <button
                          onClick={() => notificationStore.clear()}
                          className="notif-panel__action-btn"
                          title="Clear all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setPanelOpen(false)}
                      className="notif-panel__action-btn"
                      aria-label="Close"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </div>

                {/* Notification list */}
                <div className="notif-panel__list">
                  {notifications.length === 0 ? (
                    <div className="notif-panel__empty">
                      <div className="notif-panel__empty-icon">
                        <Bell size={22} />
                      </div>
                      <p className="notif-panel__empty-text">All caught up!</p>
                      <p className="notif-panel__empty-sub">Push notifications will appear here.</p>
                    </div>
                  ) : (
                    notifications.map(n => (
                      <div key={n.id} className={`notif-item${n.read ? '' : ' notif-item--unread'}`}>
                        {/* Unread dot */}
                        {!n.read && <span className="notif-item__dot" />}

                        {/* Avatar / icon */}
                        <div className="notif-item__icon">
                          <Bell size={13} />
                        </div>

                        {/* Body */}
                        {n.url ? (
                          <Link
                            to={n.url}
                            onClick={() => {
                              notificationStore.markRead(n.id);
                              setPanelOpen(false);
                            }}
                            className="notif-item__body text-left hover:underline cursor-pointer block"
                          >
                            <p className="notif-item__title">{n.title}</p>
                            {n.body && <p className="notif-item__text">{n.body}</p>}
                            <span className="notif-item__time">
                              <Clock size={10} />
                              {timeAgo(n.timestamp)}
                            </span>
                          </Link>
                        ) : (
                          <div className="notif-item__body">
                            <p className="notif-item__title">{n.title}</p>
                            {n.body && <p className="notif-item__text">{n.body}</p>}
                            <span className="notif-item__time">
                              <Clock size={10} />
                              {timeAgo(n.timestamp)}
                            </span>
                          </div>
                        )}

                        {/* Dismiss */}
                        <button
                          onClick={() => notificationStore.remove(n.id)}
                          className="notif-item__dismiss"
                          aria-label="Remove"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          {/* ─────────────────────────────────────────────────────────────── */}


          {/* User Profile Avatar block */}
          <div className="flex items-center gap-2 md:gap-3 pl-2 flex-shrink-0">
            <div className="text-right">
              <p className="hidden md:block text-xs font-bold text-slate-900 dark:text-slate-100">{userName}</p>
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
                  className="text-[10px] text-slate-600 dark:text-slate-300 font-bold bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-slate-950 cursor-pointer mt-0.5 flex-shrink-0"
                >
                  {assignedRoles.map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.roleName}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="hidden md:block text-[10px] text-slate-500 dark:text-slate-400 font-semibold capitalize">{activeRole?.roleName || userRole}</p>
              )}
            </div>
            <Link to="/profile" className="w-7 h-7 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex-shrink-0 hover:opacity-85 active:scale-95 transition-all">
              <img
                alt={userName}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                src={
                  user?.profileImage || (
                    effectiveRoleType === 'admin'
                      ? 'https://lh3.googleusercontent.com/aida-public/AB6AXuCGrNVNKLXvo4n_tKUGnxJ0gmHmAT-t_0RbGE-AmB6-7a6Yj7f1ytjTl-Fw-RYK3PJmN7skaXx3GiqjAjSbMRTlLB_1fpJU9dqN1LrktLOmevrlkqzwFyFrtw1F6Sp0sqxU5CjHs4YZsSGpJZTQVWZ4K88NVl-3Y88CKyOJ2h3X9fF24e_M8naGen0BdZKQ114jZTij0NDS7Yzz8CofOBpZmfPFyrdDfy3-duS9xZ4v-8QPHyrdcmfp'
                      : 'https://lh3.googleusercontent.com/aida-public/AB6AXuDgqVnHZ7SvmmKGwurMdekXzniIdX2Q41WpT1deju-XfmEnKKLBUT_Ali2KILugw2rxG9NtLKLtIj3NQgGHpSvpM5qaeGkQz_WS9cbj5Cj3VJlRGN3a9aasm0S4zGW8Ymhlm2H1OTsor-SqD9tQyQHQJl3qe-fPqgX2oSpPqbOCyu2y0902Q0hNvLqJ9Y76dxjiNJmAJqcsOue9n0cjvIpmGVJuZYBj923I5mOLLcTgb5kgOOO5GnBs'
                  )
                }
              />
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
