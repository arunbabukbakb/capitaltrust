import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeft, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';

export default function TermsOfService() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { companySettings } = useSelector((state: RootState) => state.auth);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#090d16] text-slate-900 dark:text-[#e2e8f0] font-sans selection:bg-indigo-500 selection:text-white transition-colors duration-200">
      {/* Background Decorative Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[60%] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-cyan-500/10 blur-[150px]" />
      </div>

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
          <div className="flex items-center gap-2.5 sm:gap-3">
            <img
              src={companySettings?.companyLogo || '/favicon.png'}
              alt={companySettings?.companyName || 'CapitalTrust Logo'}
              className="h-8 sm:h-9 w-auto object-contain shrink-0"
            />
            <div>
              <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-indigo-600 via-slate-700 to-slate-500 dark:from-white dark:via-slate-100 dark:to-slate-400 bg-clip-text text-transparent font-headline tracking-tight">
                CapitalTrust
              </span>
              <span className="ml-1.5 px-1.5 py-0.5 text-[9px] sm:text-[10px] font-bold tracking-wider uppercase bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded border border-indigo-500/30">
                Portal
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* Header */}
        <div className="mb-8 pb-6 border-b border-slate-200 dark:border-slate-800/80">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-600 dark:text-emerald-300 text-xs font-semibold mb-4">
            <FileText className="w-3.5 h-3.5" />
            Legal Document
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold font-headline text-slate-900 dark:text-white mb-2">Terms of Service</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Effective Date: 1st July 2025 &nbsp;|&nbsp; Last Updated: 21st July 2026</p>
        </div>

        {/* Body sections */}
        <div className="space-y-8 text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">1. Acceptance of Terms</h2>
            <p>
              By registering an organization workspace, accessing the CapitalTrust Portal, or using any features of the Service, you ("the Organization Administrator") agree to be bound by these Terms of Service ("Terms") and all applicable laws and regulations. If you do not agree, do not access or use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">2. Description of Service</h2>
            <p>
              CapitalTrust is a cloud-hosted institutional fund management and microfinance operations portal that enables credit unions, cooperative societies, and micro-lending institutions to manage:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>Member accounts and user role management.</li>
              <li>Fund collection posting and collection audit tracking.</li>
              <li>Loan facility requests, approvals, disbursements, and EMI repayments.</li>
              <li>Operational expense recording and approval workflows.</li>
              <li>Central transaction audit ledger and financial reporting.</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">3. Subscription & License</h2>
            <p>
              Access to the Service is granted upon payment of the applicable fees. The license is non-transferable, non-exclusive, and limited to your registered organization's use of the platform. You may not sublicense, sell, or resell the Service to any third party.
            </p>
          </section>

          {/* ─── PAYMENT TERMS SECTION ─── */}
          <section className="space-y-4 p-5 sm:p-6 bg-indigo-50/70 dark:bg-gradient-to-br dark:from-indigo-900/30 dark:to-cyan-900/20 border border-indigo-200 dark:border-indigo-500/20 rounded-2xl">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              💳 4. Payment Terms
            </h2>

            <div className="space-y-3">
              <div className="p-4 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs dark:shadow-none">
                <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">4.1 One-Time Lifetime Subscription Fee</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Upon completing the organization registration process, a <strong className="text-slate-900 dark:text-white">one-time, non-refundable Lifetime Subscription Fee</strong> is payable before workspace access is activated. This fee covers platform setup, database provisioning, software licensing, and lifetime portal access for your registered organization.
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs dark:shadow-none">
                <h3 className="text-sm font-bold text-indigo-600 dark:text-indigo-400">4.2 Annual Maintenance Charge (AMC)</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  Following the first year of service, an <strong className="text-slate-900 dark:text-white">Annual Maintenance Charge (AMC)</strong> becomes payable on each anniversary of your registration date. The AMC covers continued server hosting, software updates, security patches, backup services, and technical support. Failure to pay the AMC within the grace period may result in temporary suspension of workspace access until renewal.
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs dark:shadow-none">
                <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400">4.3 Payment Processing</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  All payments are processed securely through <strong className="text-slate-900 dark:text-white">Razorpay</strong>, a PCI-DSS compliant payment gateway. CapitalTrust does not store raw card or bank account details. By proceeding with payment, you also agree to Razorpay's Terms of Service.
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs dark:shadow-none">
                <h3 className="text-sm font-bold text-rose-600 dark:text-rose-400">4.4 Refund Policy</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  The Lifetime Subscription Fee is <strong className="text-slate-900 dark:text-white">strictly non-refundable</strong> once payment is confirmed and workspace provisioning begins. If technical issues prevent workspace activation within 48 hours of confirmed payment, please contact support for resolution or a refund at the discretion of CapitalTrust management.
                </p>
              </div>

              <div className="p-4 bg-white dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1.5 shadow-xs dark:shadow-none">
                <h3 className="text-sm font-bold text-cyan-600 dark:text-cyan-400">4.5 Pricing Changes</h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                  CapitalTrust reserves the right to modify subscription fees and AMC rates with a minimum of <strong className="text-slate-900 dark:text-white">30 days' written notice</strong> to registered administrators via email before any price adjustment takes effect.
                </p>
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 dark:text-slate-400">
              <li>Use the platform for any illegal, fraudulent, or unauthorized purpose.</li>
              <li>Attempt to reverse-engineer, decompile, or extract the platform's source code or database structure.</li>
              <li>Share administrator credentials or workspace access with unauthorized external parties.</li>
              <li>Upload or store content that violates applicable laws (e.g., data protection, financial regulations).</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">6. Data Ownership</h2>
            <p>
              All data you enter into the platform — including member records, financial transactions, and organization data — remains <strong className="text-slate-900 dark:text-white">your exclusive property</strong>. CapitalTrust claims no ownership rights over your organizational data. Upon request, we will provide a data export prior to account termination.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">7. Service Availability</h2>
            <p>
              We target a service availability of <strong className="text-slate-900 dark:text-white">99.5% uptime</strong> on a monthly basis. Scheduled maintenance windows will be communicated in advance. We are not liable for any loss arising from temporary unavailability due to maintenance, infrastructure failures, or force majeure events.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate access to the Service if you violate these Terms, engage in fraudulent activity, or fail to complete AMC renewal within the stipulated grace period. You may request account deletion at any time by contacting support.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">9. Limitation of Liability</h2>
            <p>
              To the maximum extent permitted by applicable law, CapitalTrust shall not be liable for any indirect, incidental, special, or consequential damages, including loss of profits or data, arising from your use of or inability to use the Service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">10. Governing Law</h2>
            <p>
              These Terms shall be governed by and interpreted in accordance with the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in the applicable jurisdiction.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">11. Contact</h2>
            <p>
              For queries regarding these Terms: <span className="text-indigo-600 dark:text-indigo-400 font-semibold">{companySettings?.supportEmail || 'contact@trustcaps.in'}</span>
            </p>
          </section>

        </div>

        {/* Footer links */}
        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800/60 flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400">
          <button onClick={() => navigate('/')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Home</button>
          <button onClick={() => navigate('/privacy-policy')} className="hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer">Privacy Policy</button>
          <span>© {new Date().getFullYear()} CapitalTrust. All rights reserved.</span>
        </div>
      </main>
    </div>
  );
}
