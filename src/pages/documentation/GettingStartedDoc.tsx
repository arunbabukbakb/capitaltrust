import React from 'react';
import { Rocket, Sparkles, CheckCircle2, Play, CreditCard, ShieldCheck } from 'lucide-react';

export default function GettingStartedDoc() {
  return (
    <div className="space-y-4 sm:space-y-6 text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-300 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
          <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Onboarding Guide
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-headline text-slate-900 dark:text-white">
          How to Start with CapitalTrust
        </h1>
        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-relaxed">
          A step-by-step onboarding manual covering live demo testing, organization registration, subscription payments, and initial login.
        </p>
      </div>

      {/* Step 1: Demo Checking */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs sm:text-base flex items-center justify-center border border-indigo-500/30">
            1
          </span>
          <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
            <Play className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500 dark:text-indigo-400" />
            Testing the Live Demo Site
          </h2>
        </div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed pl-9 sm:pl-12">
          Before creating your official workspace, you can explore pre-configured sample data, active loans, fund collections, and audit logs using our automated Live Demo portal.
        </p>
        <div className="pl-9 sm:pl-12 space-y-2 text-xs sm:text-sm md:text-base">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-1" />
            <span>Click <strong>Live Demo</strong> on the top navigation bar or <strong>Launch Demo Site</strong> on the landing page hero.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-1" />
            <span>The system automatically opens the demo environment using default credentials.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-1" />
            <span>Test real-time dashboard charts, EMI repayment entries, and approved loan issuance.</span>
          </div>
        </div>
      </div>

      {/* Step 2: Register Organization */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 font-extrabold text-xs sm:text-base flex items-center justify-center border border-cyan-500/30">
            2
          </span>
          <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500 dark:text-cyan-400" />
            Registering Your Organization
          </h2>
        </div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed pl-9 sm:pl-12">
          Set up a dedicated workspace for your credit union, microfinance institution, or cooperative.
        </p>
        <div className="pl-9 sm:pl-12 space-y-2 text-xs sm:text-sm md:text-base">
          <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 font-mono text-[11px] sm:text-xs md:text-sm">
            <p className="text-slate-800 dark:text-slate-300 font-bold">Registration Fields Required:</p>
            <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-1">
              <li><strong>Organization Name</strong>: Full legal title of your institution.</li>
              <li><strong>Custom Subdomain</strong>: E.g., <code>mybranch</code>.</li>
              <li><strong>Administrator Name, Email, Username & Password</strong>: Used to log into your primary workspace admin account.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Step 3: Payment */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-extrabold text-xs sm:text-base flex items-center justify-center border border-emerald-500/30">
            3
          </span>
          <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
            <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 dark:text-emerald-400" />
            Workspace Payment & Subscription Activation
          </h2>
        </div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed pl-9 sm:pl-12">
          Upon submitting the registration form, you will be directed to the secure payment portal (`/payment`).
        </p>
        <div className="pl-9 sm:pl-12 space-y-3 text-xs sm:text-sm md:text-base">
          <div className="p-3.5 sm:p-4 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-xs sm:text-sm md:text-base">Payment & Pricing Structure:</h3>
            <ul className="list-disc pl-4 space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>
                <strong className="text-emerald-600 dark:text-emerald-400">One-Time Lifetime Subscription Fee</strong>: A single one-time setup and licensing payment granting lifetime portal access for your organization workspace.
              </li>
              <li>
                <strong className="text-indigo-600 dark:text-indigo-400">Annual Maintenance Fee (AMC)</strong>: A nominal yearly maintenance charge covering server hosting, software upgrades, security patches, and ongoing support.
              </li>
            </ul>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-1" />
            <span>Complete secure payment online via Razorpay gateway.</span>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0 mt-1" />
            <span>Once payment status is confirmed, your workspace database space is instantly activated!</span>
          </div>
        </div>
      </div>

      {/* Step 4: Login */}
      <div className="bg-slate-100/60 dark:bg-slate-900/40 p-3.5 sm:p-5 md:p-6 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80 space-y-2.5 sm:space-y-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <span className="w-7 h-7 sm:w-9 sm:h-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 font-extrabold text-xs sm:text-base flex items-center justify-center border border-purple-500/30">
            4
          </span>
          <h2 className="text-base sm:text-xl md:text-2xl font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-purple-500 dark:text-purple-400" />
            Logging In & Accessing Dashboard
          </h2>
        </div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 leading-relaxed pl-9 sm:pl-12">
          Navigate to your custom portal URL or standard login page (`/login`).
        </p>
        <div className="pl-9 sm:pl-12 space-y-2 text-xs sm:text-sm md:text-base">
          <div className="p-3.5 sm:p-4 bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900/50 rounded-xl text-indigo-800 dark:text-indigo-300">
            <strong>Pro Tip:</strong> Enter your registered administrator username and password. Upon authentication, the system automatically redirects you to the main <strong>Dashboard</strong> with full role-based management privileges.
          </div>
        </div>
      </div>
    </div>
  );
}
