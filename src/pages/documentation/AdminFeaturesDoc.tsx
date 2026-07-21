import React from 'react';
import { Shield, Key, Menu, Settings } from 'lucide-react';

export default function AdminFeaturesDoc() {
  return (
    <div className="space-y-4 sm:space-y-6 text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-600 dark:text-blue-300 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
          <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          System Administration
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-headline text-slate-900 dark:text-white">
          Admin & Security Features Guide
        </h1>
        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-relaxed">
          Detailed overview of Menu Management, Permission Profiles, Role Mapping Matrix, and Company Settings.
        </p>
      </div>

      {/* Menu Management */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Menu className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500 dark:text-blue-400" />
          Menu Management (`/menus`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Configure application navigation structures, parent-child menu hierarchies, icons, and route paths dynamically.
        </p>
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs sm:text-sm md:text-base">
          <h3 className="font-bold text-slate-900 dark:text-slate-200">Key Menu Features:</h3>
          <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400">
            <li><strong>Parent & Child Nesting</strong>: Group sub-pages under top-level menus (e.g. <em>Reports</em> parent menu containing <em>Transactions</em> child menu).</li>
            <li><strong>Sort Order & Icons</strong>: Customize menu display order and Lucide icons.</li>
            <li><strong>Menu Shrink / Auto Accordion</strong>: Automatically collapses inactive parent submenus when expanding another parent menu.</li>
          </ul>
        </div>
      </div>

      {/* Permission Management */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Key className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 dark:text-purple-400" />
          Permission Matrix (`/permissions`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Manage granular role-based permissions to restrict page access and actions based on user security profiles.
        </p>
        <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400">
          Toggle checkboxes on the permission matrix grid to grant or revoke specific menu items for custom roles. Changes take effect immediately upon saving!
        </div>
      </div>

      {/* Settings Page */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Settings className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400" />
          Company Settings (`/settings`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Manage institution logo, portal theme, company contact info, currency symbols, and default fiscal period settings.
        </p>
      </div>
    </div>
  );
}
