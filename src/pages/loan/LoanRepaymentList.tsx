import React, { useEffect, useState } from 'react';
import { Loan } from '../../models/Loan';
import PaymentRow from '../../components/PaymentRow';
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const LoanRepaymentList: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'group' | 'single'>('single');
  const [loans, setLoans] = useState<Loan[]>([]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<number>(parseInt(new Date().toISOString().slice(0, 7).replace('-', '')));

  // Fetch loans for the dropdown filter
  const fetchLoans = async () => {
    try {
      const res = await fetch('/api/loans');
      if (res.ok) {
        const data = await res.json();
        setLoans(data);
      }
    } catch (e) {
      console.error('Failed to load loans', e);
    }
  };

  useEffect(() => {
    fetchLoans();
  }, []);

  const getAdminSelectableMonths = () => {
    const list = [];
    const now = new Date();
    const currentMonthVal = parseInt(`${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`);
    for (let i = -12; i <= 0; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const val = parseInt(`${yyyy}${mm}`);
      if (val <= currentMonthVal) {
        const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        list.push({ val, label });
      }
    }
    return list;
  };

  // Fetch payments list and map them to local edit state
  const fetchPayments = async () => {
    setLoading(true);
    try {
      const endpoint =
        activeTab === 'group'
          ? selectedLoanId
            ? `/api/loan-payments?loanId=${encodeURIComponent(selectedLoanId)}&month=${selectedMonth}`
            : `/api/loan-payments?loanId=&month=${selectedMonth}`
          : `/api/loan-payments?type=single&month=${selectedMonth}`;

      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          const mapped = data.map((p: any) => {
            const defaultAmt = p.approved ? p.amountPaid : (p.dueAmount || 0);
            return {
              ...p,
              localAmountPaid: defaultAmt,
            };
          });
          setPayments(mapped);
        } else {
          setPayments([]);
        }
      }
    } catch (e) {
      console.error('Failed to load payments', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
  }, [activeTab, selectedLoanId, selectedMonth]);

  const handleAmountChange = (id: string, amount: number) => {
    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, localAmountPaid: amount } : p))
    );
  };

  const handleFinalSubmit = async () => {
    // Collect rows that are editable and have changes or new entries
    const paymentsToSubmit = payments.filter((p) => {
      if (p.canEdit === false) return false;
      if (p.approved) {
        return p.localAmountPaid !== p.amountPaid;
      } else {
        return p.localAmountPaid > 0;
      }
    });

    if (paymentsToSubmit.length === 0) {
      alert('No payment changes or new entries detected to post.');
      return;
    }

    const confirmSubmit = window.confirm(
      `Are you sure you want to post/update payments for ${paymentsToSubmit.length} member ledger records? This will update outstanding balances.`
    );
    if (!confirmSubmit) return;

    setSubmitting(true);
    try {
      const payload = paymentsToSubmit.map((p) => ({
        loanMemberId: p.loanMemberId,
        approved: true,
        amountPaid: p.localAmountPaid,
        requestId: null,
      }));

      const res = await fetch('/api/loan-payments/final-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payments: payload, month: selectedMonth }),
      });

      if (res.ok) {
        setToast('Payments successfully posted and balances recalculated.');
        await fetchPayments();
        setTimeout(() => setToast(''), 3000);
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || 'Failed to post repayments'}`);
      }
    } catch (e) {
      console.error(e);
      alert('An error occurred during payment posting.');
    } finally {
      setSubmitting(false);
    }
  };

  // Group loan selection reset on tab change
  const handleTabChange = (tab: 'group' | 'single') => {
    setActiveTab(tab);
    setPayments([]);
    if (tab === 'group') {
      setSelectedLoanId('');
    }
  };

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto animate-fade-in space-y-3 md:space-y-6 mt-16">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white px-5 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-slide-in">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}

      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl md:rounded-2xl p-3 md:p-6 shadow-sm flex flex-row items-center justify-between gap-3">
        <div>
          <h2 className="text-sm md:text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight">{t('loanPage.repaymentList')}</h2>
          <p className="hidden md:block text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('loanPage.repaymentListSub')}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="inline-flex p-0.5 bg-slate-100/80 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex-shrink-0">
          <button
            onClick={() => handleTabChange('single')}
            className={`px-2 py-1 md:px-4 md:py-2 text-[10px] md:text-xs font-semibold rounded-md md:rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'single'
              ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-slate-100 shadow-sm border border-slate-200/20 dark:border-slate-600'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            {t('loanPage.singleLoans')}
          </button>
          <button
            onClick={() => handleTabChange('group')}
            className={`px-2 py-1 md:px-4 md:py-2 text-[10px] md:text-xs font-semibold rounded-md md:rounded-lg transition-all duration-200 cursor-pointer ${activeTab === 'group'
              ? 'bg-white dark:bg-slate-700 text-slate-950 dark:text-slate-100 shadow-sm border border-slate-200/20 dark:border-slate-600'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
          >
            {t('loanPage.groupLoans')}
          </button>
        </div>
      </div>

      {/* Main Content Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-3 md:p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex flex-col sm:flex-row items-end sm:items-center gap-4">
          {activeTab === 'group' && (
            <div className="max-w-xs w-full space-y-1">
              <label className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500">
                Filter by Group Credit Pool
              </label>
              <select
                value={selectedLoanId}
                onChange={(e) => setSelectedLoanId(e.target.value)}
                className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 dark:focus:ring-slate-400 focus:border-transparent transition"
              >
                <option value="">-- Choose Loan Ledger --</option>
                {loans
                  .filter((l) => (l.loanType || l.LoanType) === 'Group')
                  .map((loan) => {
                    const id = loan.loanId || loan.Id || loan.id || '';
                    const loanNo = loan.loanNo || loan.LoanNo || id;
                    const amount = loan.amount ?? loan.Amount ?? 0;
                    return (
                      <option key={id} value={id}>
                        {loanNo} (Pool Limit: ₹{amount.toLocaleString()})
                      </option>
                    );
                  })}
              </select>
            </div>
          )}

          <div className="max-w-xs w-full space-y-1">
            <label className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500">
              Filter by Billing Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="w-full px-2 py-1.5 md:px-3 md:py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs md:text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-950 dark:focus:ring-slate-400 focus:border-transparent transition"
            >
              {getAdminSelectableMonths().map((m) => (
                <option key={m.val} value={m.val}>
                  {m.label} (Period: {m.val})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Ledger Grid */}
        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              <span>Syncing ledger balances...</span>
            </div>
          </div>
        ) : activeTab === 'group' && !selectedLoanId ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            Please select a group credit pool from the dropdown above to audit member dues.
          </div>
        ) : payments.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-slate-400">
            No outstanding repayments found for this period.
          </div>
        ) : (
          <>
            {/* Desktop View */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-700">
                    {activeTab === 'single' && (
                      <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                        Loan No
                      </th>
                    )}
                    <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Beneficiary User
                    </th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Interest Rate
                    </th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Outstanding Balance
                    </th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                      Current Due (Month)
                    </th>
                    <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center">
                      Amount
                    </th>
                    {activeTab === 'single' && (
                      <>
                        <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          Interest Split
                        </th>
                        <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-500">
                          Principal Split
                        </th>
                      </>
                    )}
                    <th className="px-4 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-500 text-center">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <PaymentRow
                      key={payment.id}
                      payment={payment}
                      activeTab={activeTab}
                      amountPaid={payment.localAmountPaid}
                      onAmountChange={(amount) => handleAmountChange(payment.id, amount)}
                      isMobile={false}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {payments.map((payment) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  activeTab={activeTab}
                  amountPaid={payment.localAmountPaid}
                  onAmountChange={(amount) => handleAmountChange(payment.id, amount)}
                  isMobile={true}
                />
              ))}
            </div>
          </>
        )}

        {/* Action Panel / Bottom Submit */}
        {payments.length > 0 && !(activeTab === 'group' && !selectedLoanId) && (
          <div className="p-3 md:p-3 bg-slate-50/50 dark:bg-slate-800/40 border-t border-slate-100 dark:border-slate-800 flex flex-row justify-between items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-slate-500 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span>
                Enter amounts and submit. Posted repayments immediately apply to principal/interest and update outstanding balances.
              </span>
            </div>
            <div className="sm:hidden flex items-center gap-1.5 text-slate-400 text-[9px] font-medium">
              <AlertCircle className="w-3 h-3 text-amber-500 flex-shrink-0" />
              <span>Entry not posted yet</span>
            </div>
            <button
              onClick={handleFinalSubmit}
              disabled={submitting}
              className="px-4 py-2 md:px-6 md:py-3 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer flex-shrink-0 text-white font-headline"
            >
              {submitting ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Posting...</span>
                </>
              ) : (
                <span>Post Repayments</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoanRepaymentList;
