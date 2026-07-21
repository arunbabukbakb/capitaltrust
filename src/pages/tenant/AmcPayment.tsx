import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { CreditCard, RefreshCw, CheckCircle, HelpCircle, ArrowLeft, Calendar, ShieldCheck, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';

export default function AmcPayment() {
  const navigate = useNavigate();
  const { companySettings } = useSelector((state: RootState) => state.auth);
  const { theme, toggleTheme } = useTheme();

  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');
  const [amcData, setAmcData] = useState<any>(null);

  useEffect(() => {
    // If companySettings has amcRecord, set it
    if (companySettings?.amcRecord) {
      setAmcData(companySettings.amcRecord);
    } else {
      // Fallback: fetch settings again to ensure we have latest AMC info
      fetch("/api/settings")
        .then(res => res.json())
        .then(data => {
          if (data?.amcRecord) {
            setAmcData(data.amcRecord);
          }
        })
        .catch(err => console.error("Failed to load AMC details", err));
    }
  }, [companySettings]);

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayAmc = async () => {
    setPaying(true);
    setError('');
    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
      }

      // 2. Create AMC order
      const orderRes = await fetch("/api/tenants/amc/order", {
        method: "POST"
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to initialize AMC payment transaction.");
      }

      // 3. Setup checkout configuration
      const options = {
        key: orderData.isMock ? "rzp_test_dummyKeyId1234" : orderData.keyId,
        amount: Math.round((orderData.amount || 0) * 100),
        currency: orderData.currency || "INR",
        name: companySettings?.companyName || "CapitalTrust",
        description: "Annual Maintenance Charge (AMC) Renewal",
        order_id: orderData.isMock ? undefined : orderData.orderId,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/tenants/amc/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || "mock_signature",
                isMock: orderData.isMock
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "AMC Payment verification failed.");
            }
            setPaymentSuccess(true);
            setTimeout(() => {
              window.location.href = "/dashboard";
            }, 2500);
          } catch (err: any) {
            setError(err.message || "Failed to complete AMC payment verification.");
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          }
        },
        prefill: {
          name: companySettings?.companyName || "",
          email: companySettings?.supportEmail || ""
        },
        theme: {
          color: "#4f46e5"
        }
      };

      if (orderData.isMock) {
        // Simulate immediate payment verification for mock testing environment
        setTimeout(() => {
          options.handler({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: `sig_mock_${Date.now()}`
          });
        }, 1200);
      } else {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while initiating AMC payment.");
      setPaying(false);
    }
  };

  const amcCharge = amcData?.amcCharge ?? companySettings?.pricing?.amc ?? 0;
  const dueDateRaw = amcData?.dueDate;
  let daysRemaining = 0;
  let dueDateFormatted = 'N/A';
  let nextDueDateFormatted = 'N/A';

  if (dueDateRaw) {
    const dueTime = new Date(dueDateRaw).getTime();
    const nowTime = new Date().getTime();
    daysRemaining = Math.ceil((dueTime - nowTime) / (1000 * 60 * 60 * 24));
    
    const dueDateObj = new Date(dueDateRaw);
    dueDateFormatted = dueDateObj.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Rule: If overdue (dueTime < nowTime), set next due date 1 year from paid date (today).
    // Otherwise, set next due date 1 year from previous due date.
    const isOverdue = dueTime < nowTime;
    const baseDate = isOverdue ? new Date() : dueDateObj;
    const nextDueDate = new Date(baseDate);
    nextDueDate.setFullYear(baseDate.getFullYear() + 1);

    nextDueDateFormatted = nextDueDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  return (
    <div className="w-full relative flex flex-col items-center justify-center min-h-screen py-8 sm:py-12 px-4 bg-[#f7f9fb] dark:bg-[#0b0f19] selection:bg-slate-900 dark:selection:bg-slate-100 dark:selection:text-slate-900 transition-colors duration-200 font-sans">
      {/* Theme toggle — fixed top-right */}
      <button
        onClick={toggleTheme}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-md transition-all cursor-pointer"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
      </button>

      {/* Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-indigo-100 dark:bg-indigo-950/10 opacity-50 blur-[130px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[35%] h-[35%] bg-amber-100 dark:bg-amber-950/10 opacity-60 blur-[110px] rounded-full" />
      </div>

      <main className="w-full max-w-[440px] sm:max-w-[480px] mx-auto z-10 animate-fade-in">
        {/* Navigation / Back Button */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
        </div>

        {/* Brand Header */}
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="w-9 h-9 bg-slate-950 dark:bg-white flex items-center justify-center rounded-xl shadow-md text-white dark:text-slate-950 font-bold text-lg">
              🏛️
            </div>
            <h1 className="font-headline font-bold text-2xl text-slate-900 dark:text-white tracking-tight">
              {companySettings?.companyName || 'CapitalTrust'}
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">Annual Maintenance Charge (AMC) Renewal</p>
        </div>

        {/* Payment Card */}
        <div className="glass-panel login-card rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col gap-4 text-center">
            <header className="space-y-1">
              <div className="w-12 h-12 bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-500 rounded-full flex items-center justify-center mx-auto">
                <Calendar className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white pt-2">AMC Renewal Charge</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Annual license maintenance fee for ongoing hosting, security updates, and technical support.
              </p>
            </header>

            {error && (
              <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 rounded-lg font-medium">
                {error}
              </div>
            )}

            {paymentSuccess ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-250 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 rounded-2xl flex flex-col items-center gap-2">
                <CheckCircle className="w-8 h-8 text-emerald-500 animate-bounce" />
                <p className="text-xs font-bold uppercase tracking-wider">AMC Payment Confirmed!</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Your organization workspace license has been extended for 1 year. Redirecting to dashboard...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Due Date Indicator Badge */}
                {dueDateRaw && (
                  <div className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                    daysRemaining < 0
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                      : daysRemaining <= 10
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300'
                      : 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      DueDate: {dueDateFormatted}
                    </span>
                    <span className="font-mono uppercase text-[10px] px-2 py-0.5 rounded-full bg-white/60 dark:bg-slate-900/60 border border-current">
                      {daysRemaining < 0 ? `Overdue by ${Math.abs(daysRemaining)} days` : `Due in ${daysRemaining} days`}
                    </span>
                  </div>
                )}

                {/* Calculation breakdown */}
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-left space-y-2.5">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <span>Organization</span>
                    <span className="font-bold text-slate-900 dark:text-white">{companySettings?.companyName || 'Workspace'}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <span>Billing Subdomain</span>
                    <span className="font-mono text-indigo-500 dark:text-indigo-400 font-bold">{window.location.hostname.split('.')[0]}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <span>Next Due Date (If Paid Now)</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{nextDueDateFormatted}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-2.5">
                    <span>AMC Amount Payable</span>
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-extrabold text-base">₹{amcCharge.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex gap-2 p-3 bg-slate-100 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-left items-start">
                  <ShieldCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                    Completing this payment extends your platform software updates, automated cloud database backups, and institutional technical support for 365 calendar days.
                  </p>
                </div>

                <button
                  onClick={handlePayAmc}
                  disabled={paying}
                  className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white font-bold py-3.5 rounded-xl shadow-md uppercase tracking-wider text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing AMC Renewal...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay AMC ₹{amcCharge.toFixed(2)} Now</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Legal Footer */}
        <footer className="mt-6 flex flex-col items-center gap-3 opacity-80">
          <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            By paying, you agree to our{' '}
            <button
              onClick={() => navigate('/terms-of-service')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Terms of Service
            </button>
            {' '}and{' '}
            <button
              onClick={() => navigate('/privacy-policy')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Privacy Policy
            </button>.
          </p>
          <p className="text-[9px] text-slate-500 dark:text-slate-600 tracking-widest leading-relaxed uppercase text-center font-bold">
            © {new Date().getFullYear()} {(companySettings?.companyName || 'CapitalTrust').toUpperCase()} GLOBAL MARKETS. ALL RIGHTS RESERVED.
          </p>
        </footer>
      </main>
    </div>
  );
}
