import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, RefreshCw, CheckCircle, HelpCircle, AlertTriangle, Sun, Moon } from 'lucide-react';
import { useTheme } from '../../components/ThemeContext';

export default function WorkspacePayment() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [companyDetails, setCompanyDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Always call API to fetch company details for payment page
    const fetchCompanyDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/settings/company');
        if (res.ok) {
          const data = await res.json();
          if (data && data.paymentStatus === 'Paid') {
            navigate('/login', { replace: true });
            return;
          }
          setCompanyDetails(data);
        }
      } catch (err) {
        console.error("Failed to load company details for payment:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyDetails();
  }, [navigate]);

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

  const handlePayNow = async () => {
    setPaying(true);
    setError('');
    try {
      // 1. Load Razorpay script
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
      }

      // 2. Create order on server
      const orderRes = await fetch("/api/tenants/payment/order", {
        method: "POST"
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || "Failed to initialize payment transaction.");
      }

      // 3. Setup checkout configuration
      const options = {
        key: orderData.isMock ? "rzp_test_dummyKeyId1234" : orderData.keyId,
        amount: Math.round(orderData.amount * 100),
        currency: orderData.currency || "INR",
        name: "CapitalTrust",
        description: "Workspace Registration Fee",
        // In mock mode, don't pass the mock orderId to the real Razorpay window to avoid validation errors
        order_id: orderData.isMock ? undefined : orderData.orderId,
        handler: async function (response: any) {
          setPaying(true);
          try {
            const verifyRes = await fetch("/api/tenants/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature || "mock_signature",
                isMock: orderData.isMock
              })
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || "Failed to verify transaction signature.");
            }
            setPaymentSuccess(true);
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          } catch (err: any) {
            setError(err.message || "Payment verification failed.");
            setPaying(false);
          }
        },
        modal: {
          ondismiss: function () {
            setPaying(false);
          }
        },
        prefill: orderData.prefill,
        theme: {
          color: "#6366f1"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setError(err.message || "Failed to complete payment checkout.");
      setPaying(false);
    }
  };

  if (loading || !companyDetails) {
    return (
      <div className="min-h-screen bg-[#f7f9fb] dark:bg-[#0b0f19] flex items-center justify-center text-xs font-semibold text-slate-500">
        <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
        Loading workspace registration details...
      </div>
    );
  }

  const pricing = companyDetails.pricing || { price: 0, tax: 0, amc: 0 };
  const basePrice = Number(pricing.price || 0);
  const taxPercent = Number(pricing.tax || 0);
  const taxAmount = basePrice * (taxPercent / 100);
  const totalAmount = basePrice + taxAmount;

  return (
    <div className="w-full relative flex items-center justify-center min-h-screen py-8 sm:py-12 px-4 bg-[#f7f9fb] dark:bg-[#0b0f19] selection:bg-slate-900 dark:selection:bg-slate-100 dark:selection:text-slate-900 transition-colors duration-200">
      {/* Theme toggle — fixed top-right */}
      <button
        onClick={toggleTheme}
        className="fixed top-3 right-3 sm:top-4 sm:right-4 z-50 p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white shadow-md transition-all cursor-pointer"
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      >
        {theme === 'dark' ? <Sun className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> : <Moon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
      </button>

      {/* Decorative Blur Spheres background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -right-[5%] w-[40%] h-[40%] bg-emerald-100 dark:bg-emerald-950/10 opacity-50 blur-[130px] rounded-full" />
        <div className="absolute -bottom-[10%] -left-[5%] w-[35%] h-[35%] bg-blue-100 dark:bg-blue-950/10 opacity-60 blur-[110px] rounded-full" />
      </div>

      <main className="w-full max-w-[420px] sm:max-w-[460px] mx-auto z-10 animate-fade-in">
        <div className="mb-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <div className="w-9 h-9 bg-slate-950 dark:bg-white flex items-center justify-center rounded-xl shadow-md text-white dark:text-slate-950 font-bold text-lg">
              🏛️
            </div>
            <h1 className="font-headline font-bold text-2xl text-slate-900 dark:text-white tracking-tight">
              {companyDetails.companyName || 'CapitalTrust'}
            </h1>
          </div>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1.5">Secure Institutional Fund Management</p>
        </div>

        {/* Checkout Card */}
        <div className="glass-panel login-card rounded-2xl p-6 flex flex-col gap-4 shadow-xl">
          <div className="flex flex-col gap-4 text-center">
            <header className="space-y-1">
              <div className="w-12 h-12 bg-amber-500/10 dark:bg-amber-500/20 text-amber-500 rounded-full flex items-center justify-center mx-auto">
                <CreditCard className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white pt-2">Payment Required</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Your workspace registration is complete, but payment is pending. Please pay to activate workspace access.
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
                <p className="text-xs font-bold uppercase tracking-wider">Payment Confirmed!</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">Activating your workspace dashboard...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-left space-y-2.5">
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <span>Organization</span>
                    <span className="font-bold text-slate-900 dark:text-white">{companyDetails.companyName}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1.5">
                    <span>Billing Subdomain</span>
                    <span className="font-mono text-indigo-400 font-bold">{window.location.hostname.split('.')[0]}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-550 dark:text-slate-400">
                    <span>Base Registration Price</span>
                    <span className="font-mono text-slate-900 dark:text-white font-bold">₹{basePrice.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[11px] font-medium text-slate-550 dark:text-slate-400">
                    <span>VAT / Platform Tax ({taxPercent}%)</span>
                    <span className="font-mono text-slate-900 dark:text-white font-bold">₹{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 pt-2.5">
                    <span>Total Amount Due</span>
                    <span className="font-mono text-indigo-455 dark:text-indigo-400 font-extrabold">₹{totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {pricing.amc > 0 && (
                  <div className="flex gap-2 p-3 bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 dark:border-indigo-500/20 rounded-lg text-left items-start">
                    <HelpCircle className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
                      <strong>Note:</strong> Registration includes 1-year service licensing. Subsequent Annual Maintenance Charge (AMC) of <strong>₹{pricing.amc.toFixed(2)}</strong> will be due starting in exactly one year.
                    </p>
                  </div>
                )}

                <button
                  onClick={handlePayNow}
                  disabled={paying}
                  className="w-full bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-650 hover:to-cyan-650 text-white font-bold py-3.5 rounded-xl shadow-md uppercase tracking-wider text-xs active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {paying ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      <span>Pay Now & Activate</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <footer className="mt-6 flex flex-col items-center gap-3 opacity-80">
          {/* Terms note before paying */}
          <p className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-relaxed">
            By paying, you agree to our{' '}
            <button
              onClick={() => navigate('/terms-of-service')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Terms of Service
            </button>
            {' '}including payment terms, and our{' '}
            <button
              onClick={() => navigate('/privacy-policy')}
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
            >
              Privacy Policy
            </button>.
          </p>
          <p className="text-[9px] text-slate-500 dark:text-slate-600 tracking-widest leading-relaxed uppercase text-center font-bold">
            © {new Date().getFullYear()} {(companyDetails.companyName || 'CapitalTrust').toUpperCase()} GLOBAL MARKETS. ALL RIGHTS RESERVED.
          </p>
        </footer>
      </main>
    </div>
  );
}
