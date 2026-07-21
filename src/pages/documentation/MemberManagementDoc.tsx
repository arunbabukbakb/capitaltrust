import React from 'react';
import { Users, Shield, UserCheck, Key, CheckCircle2 } from 'lucide-react';

export default function MemberManagementDoc() {
  return (
    <div className="space-y-4 sm:space-y-6 text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-600 dark:text-cyan-300 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          User Management Module
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-headline text-slate-900 dark:text-white">
          Member & Staff Management Guide
        </h1>
        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-relaxed">
          Detailed guide on managing client accounts, internal staff users, security roles, and profile attributes.
        </p>
      </div>

      {/* Users Section */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500 dark:text-cyan-400" />
          Users Directory (`/users`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          The Users page serves as the central directory for all registered members, branch officers, and admin accounts within your organization.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm md:text-base">
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-200">1. Adding New Users</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Click <strong>Add User</strong> to register new staff or client members. Required details include Full Name, Email, Mobile Number, and Assigned Role.
            </p>
          </div>
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
            <h3 className="font-bold text-slate-900 dark:text-slate-200">2. Role Assignment</h3>
            <p className="text-slate-600 dark:text-slate-400">
              Assign roles such as <em>Admin</em>, <em>Manager</em>, <em>Field Officer</em>, or <em>Member</em> to grant specific page accesses.
            </p>
          </div>
        </div>
      </div>

      {/* Roles & Security Profiles */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400" />
          Roles Management (`/roles`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Create customized security profiles to fit your institution's organizational hierarchy.
        </p>
        <div className="space-y-2 text-xs sm:text-sm md:text-base">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-1" />
            <span>Define role titles (e.g. Senior Manager, Loan Officer, Auditor).</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-1" />
            <span>Set role descriptions and tie them to granular menu access permissions.</span>
          </div>
        </div>
      </div>

      {/* User Profile */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-3 sm:space-y-4">
        <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
          <Key className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 dark:text-purple-400" />
          User Profile & Credentials (`/profile`)
        </h2>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
          Every logged-in user can manage their personal profile info, upload avatars, and safely update their login password.
        </p>
      </div>
    </div>
  );
}
