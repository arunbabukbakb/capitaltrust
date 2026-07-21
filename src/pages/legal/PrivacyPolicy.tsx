import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, ArrowLeft, Coins, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';

export default function PrivacyPolicy() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-[#e2e8f0] font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Background Decorative Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[150px] pointer-events-none" />

      {/* Navigation */}
      <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800/60">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded-lg bg-slate-200/80 dark:bg-slate-800/60 hover:bg-slate-300 dark:hover:bg-slate-700/60 border border-slate-300 dark:border-slate-700/60 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-all cursor-pointer"
            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-tr from-indigo-500 to-cyan-500 rounded-lg">
              <Coins className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-white font-headline">CapitalTrust</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-600 dark:text-indigo-300 text-xs font-semibold mb-4">
            <Shield className="w-3.5 h-3.5" />
            Legal Document
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-headline text-slate-900 dark:text-white mb-2">Privacy Policy</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Effective Date: 1st July 2025 &nbsp;|&nbsp; Last Updated: 21st July 2026</p>
        </div>

        {/* Body sections */}
        <div className="space-y-8 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">


          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">1. Introduction</h2>
            <p>
              CapitalTrust ("<strong>we</strong>", "<strong>our</strong>", or "<strong>the Platform</strong>") is committed to protecting the privacy and confidentiality of your personal and organizational data. This Privacy Policy explains how we collect, use, store, and share information when you access or use the CapitalTrust Portal (the "Service").
            </p>
            <p>
              By registering an organization workspace or accessing any part of the Service, you confirm that you have read, understood, and agreed to the terms of this Privacy Policy.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">2. Information We Collect</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
              <li><strong className="text-slate-800 dark:text-slate-200">Organization Registration Data:</strong> Company name, custom subdomain, administrator email, username, and password.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Payment Information:</strong> Transaction IDs, payment status, and billing amounts processed via Razorpay. We do not directly store raw card numbers or banking credentials.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Usage Data:</strong> System access logs, IP addresses, browser user-agent, login timestamps, and feature usage patterns for operational security and monitoring.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Member & Financial Data:</strong> Loan records, fund collection entries, repayment schedules, and expense reports entered by your organization's workspace administrators and staff.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-2 text-slate-600 dark:text-slate-400">
              <li>To provision and manage your dedicated organizational workspace database.</li>
              <li>To process payments, issue receipts, and verify subscription activation status.</li>
              <li>To authenticate users, manage role-based access controls, and prevent unauthorized access.</li>
              <li>To send transactional notifications, system alerts, and account-related communication.</li>
              <li>To improve platform reliability, troubleshoot technical issues, and maintain audit logs.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">4. Data Isolation & Multi-Tenancy</h2>
            <p>
              Each registered organization operates in an isolated database schema. Your organizational data — including member profiles, loan records, collection entries, and expense logs — is <strong className="text-slate-900 dark:text-white">strictly scoped to your own tenant</strong> and is never shared with or accessible by other organizations on the platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">5. Third-Party Services</h2>
            <p>We engage the following trusted third parties:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
              <li><strong className="text-slate-800 dark:text-slate-200">Razorpay:</strong> Secure payment processing. Subject to <a href="https://razorpay.com/privacy/" target="_blank" className="text-indigo-600 dark:text-indigo-400 hover:underline">Razorpay's Privacy Policy</a>.</li>
              <li><strong className="text-slate-800 dark:text-slate-200">Firebase Cloud Messaging:</strong> Push notification delivery. Subject to Google's Privacy Policy.</li>
            </ul>
            <p>We do not sell, rent, or trade your personal information to any third parties for marketing purposes.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">6. Data Retention</h2>
            <p>
              Your organizational data is retained for the duration of your active subscription. Upon request, we will delete or anonymize your data within 30 business days of subscription termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">7. Security Measures</h2>
            <p>
              We implement industry-standard security practices including AES encryption at rest, HTTPS/TLS in transit, JWT-based session management with expiry controls, and role-based access control (RBAC). However, no digital transmission is 100% secure; we encourage you to maintain strong password hygiene.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">8. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>Request access to or a copy of your stored data.</li>
              <li>Request correction of inaccurate personal information.</li>
              <li>Request deletion of your account and associated data.</li>
              <li>Withdraw consent where processing is based on consent.</li>
            </ul>
            <p>To exercise these rights, contact us at <span className="text-indigo-600 dark:text-indigo-400">support@capitaltrust.app</span></p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">9. Changes to This Policy</h2>
            <p>
              We may update this Privacy Policy periodically. We will notify registered administrators via email of material changes. Continued use of the Service after notice constitutes acceptance.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">10. Contact</h2>
            <p>
              For privacy-related queries: <span className="text-indigo-600 dark:text-indigo-400">privacy@capitaltrust.app</span>
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/60 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <button onClick={() => navigate('/')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Home</button>
          <button onClick={() => navigate('/terms-of-service')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Terms of Service</button>
          <span>© {new Date().getFullYear()} CapitalTrust. All rights reserved.</span>
        </div>
      </main>
    </div>
  );
}
