import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  CheckCircle,
  Edit3,
  FileText,
  Plus,
  Trash2,
  User,
  Users,
  Check,
} from 'lucide-react';

function currency(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LoanList() {
  const navigate = useNavigate();
  const { user, menus } = useSelector((state: RootState) => state.auth);
  const [loans, setLoans] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const isAuthorized = user?.role === 'admin' || menus.some((m: any) => m.menuId === 'loan-repayments' || m.menuId === 'role-management');

  const totalOutstanding = loans.reduce((acc, curr) => acc + (curr.status !== 'CLOSED' && curr.status !== 'Closed' ? (curr.outstandingBalance ?? curr.amount ?? curr.principal ?? 0) : 0), 0);
  const overdueFacilitiesCount = loans.filter(l => l.status === "OVERDUE" || l.status === "Overdue").length;

  const fetchWorkspaceData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/loans');
      const loansData = res.ok ? await res.json() : [];
      setLoans(loansData);
    } catch (err) {
      console.error('Loan list fetch error', err);
      setError('Unable to load loans register.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  const handleEditLoan = (loan: any) => {
    if (!loan.loanId) {
      setError('Only loans created in the new loan register can be edited here.');
      return;
    }
    navigate(`/loan-entry?edit=${encodeURIComponent(loan.loanId)}`);
  };

  const handleDeleteLoan = async (loan: any) => {
    if (!loan.loanId) {
      setError('Only loans created in the new loan register can be deleted here.');
      return;
    }

    if (loan.repaymentCount > 0 || loan.canDelete === false) {
      setError('Cannot delete this loan because repayment has already started.');
      return;
    }

    if (!window.confirm(`Delete loan ${loan.loanNo || loan.id}?`)) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/loans/${encodeURIComponent(loan.loanId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to delete loan.');
      }

      setToast('Loan deleted successfully.');
      await fetchWorkspaceData();
      setTimeout(() => setToast(''), 3500);
    } catch (err: any) {
      setError(err.message || 'Unable to delete loan.');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveLoan = async (loan: any) => {
    if (!loan.loanId) {
      setError('Legacy loans cannot be approved.');
      return;
    }

    if (!window.confirm(`Are you sure you want to approve loan ${loan.loanNo || loan.id}?`)) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/loans/${encodeURIComponent(loan.loanId)}/approve`, {
        method: 'POST',
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to approve loan.');
      }

      setToast('Loan approved successfully.');
      await fetchWorkspaceData();
      setTimeout(() => setToast(''), 3500);
    } catch (err: any) {
      setError(err.message || 'Unable to approve loan.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in text-slate-900 mt-16 sm:mt-20 mb-5 px-3 sm:px-0">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-5 py-4 rounded-xl border border-slate-800 shadow-2xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400 animate-pulse" />
          <div>
            <p className="text-xs font-bold font-headline">{toast}</p>
            <p className="text-[10px] text-slate-400">Loan register has been compiled live.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center gap-3">
        <div>
          <h3 className="text-lg sm:text-2xl font-bold font-headline">Loan Register</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 hidden sm:block">
            Browse and manage all credit facilities underwritten by the institution.
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] sm:text-xs font-bold text-slate-600 shadow-sm flex-shrink-0">
          <FileText className="w-3.5 h-3.5 text-slate-500" />
          <span>{loans.length} Loans</span>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg px-4 py-3 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* RISKS AND METRICS COVENANT BAR */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-6">
        {/* Metric 1 */}
        <div className="bg-white p-2.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400 block truncate">Total Outstanding</span>
            <h4 className="text-xs sm:text-3xl font-extrabold font-headline mt-1 text-slate-950 text-tnum truncate">
              ₹{currency(totalOutstanding)}
            </h4>
          </div>
          <p className="text-[7px] sm:text-[10px] text-slate-400 font-semibold mt-1 hidden sm:block">
            Exposure over {loans.filter(l => l.status !== 'CLOSED' && l.status !== 'Closed').length} positions
          </p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-2.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400 block truncate">PAR 30 Risk</span>
            <div className="flex justify-between items-end mt-1">
              <h4 className="text-xs sm:text-3xl font-extrabold font-headline text-rose-600 text-tnum truncate">
                {((overdueFacilitiesCount / (loans.length || 1)) * 100).toFixed(1)}%
              </h4>
              <span className="hidden sm:inline-block bg-rose-50 text-rose-800 text-[9px] font-bold px-2 py-0.5 rounded border border-rose-100">
                Caution
              </span>
            </div>
          </div>
          <p className="text-[7px] sm:text-[9px] text-slate-400 font-medium mt-1 hidden sm:block">Weighted overdue covenanted balance</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-2.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400 block truncate">Capital Buffer</span>
            <h4 className="text-xs sm:text-3xl font-extrabold font-headline mt-1 text-emerald-600 text-tnum">
              1.82x
            </h4>
          </div>
          <p className="text-[7px] sm:text-[10px] text-slate-400 font-semibold mt-1 hidden sm:block">Complies with reserves mandates</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex justify-between items-center gap-3">
          <div>
            <h4 className="text-sm sm:text-base font-bold font-headline">Saved Loans Ledger</h4>
            <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 hidden sm:block">Edit details or delete loans before repayment starts.</p>
          </div>
          {isAuthorized && (
            <button
              type="button"
              onClick={() => navigate('/loan-entry')}
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Loan</span>
            </button>
          )}
        </div>

        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-700">
                <th className="p-4 pl-5 uppercase tracking-wider text-[10px]">Loan No</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Members</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Type</th>
                <th className="p-4 uppercase tracking-wider text-[10px] text-right">Amount</th>
                <th className="p-4 uppercase tracking-wider text-[10px] text-center">Interest</th>
                <th className="p-4 uppercase tracking-wider text-[10px] text-center">Status</th>
                <th className="p-4 uppercase tracking-wider text-[10px] text-center">Repayments</th>
                <th className="p-4 uppercase tracking-wider text-[10px] text-center">Approval</th>
                {isAuthorized && <th className="p-4 pr-5 uppercase tracking-wider text-[10px] text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loans.map((loan) => {
                const isManagedLoan = Boolean(loan.loanId);
                const repaymentStarted = Number(loan.repaymentCount || 0) > 0 || Number(loan.paidToDate || 0) > 0;
                return (
                  <tr key={loan.loanId || loan.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                    <td className="p-4 pl-5">
                      <p className="font-mono font-bold text-slate-950 text-tnum">{loan.loanNo || loan.id}</p>
                      {!isManagedLoan && <p className="text-[10px] text-slate-400 mt-0.5">Legacy seed</p>}
                    </td>
                    <td className="p-4 max-w-xs">
                      <p className="font-semibold text-slate-900 truncate">{loan.memberName || 'Unassigned'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{loan.memberId || '-'}</p>
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-100 text-slate-700 rounded-md font-bold">
                        {loan.loanType === 'Group' ? <Users className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                        {loan.loanType || loan.type || 'Loan'}
                      </span>
                    </td>
                    <td className="p-4 text-right font-bold text-slate-950 font-mono text-tnum">
                      ₹{currency(Number(loan.amount || loan.principal || 0))}
                    </td>
                    <td className="p-4 text-center">
                      <p className="font-bold text-slate-900">{loan.interestMode || 'Fixed'}</p>
                      <p className="text-[10px] text-slate-400">
                        {loan.interestMode === 'Variable' ? `${loan.slabs?.length || 0} slabs` : `${Number(loan.interestRate || 0).toFixed(2)}%`}
                      </p>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-block px-2.5 py-1 text-[9px] font-bold rounded-full ${loan.status === 'ACTIVE' || loan.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-800'
                          : loan.status === 'PENDING' || loan.status === 'Pending'
                            ? 'bg-blue-50 text-blue-800'
                            : loan.status === 'CANCELLED' || loan.status === 'Cancelled'
                              ? 'bg-rose-50 text-rose-800'
                              : 'bg-slate-100 text-slate-500'
                        }`}>
                        {loan.status}
                      </span>
                    </td>
                    <td className="p-4 text-center">
                      <p className="font-bold text-slate-900">{Number(loan.repaymentCount || 0)}</p>
                      {repaymentStarted && <p className="text-[10px] text-amber-600 font-semibold">Delete locked</p>}
                    </td>
                    <td className="p-4 text-center">
                      {loan.status === 'PENDING' || loan.status === 'Pending' ? (
                        isAuthorized ? (
                          <button
                            type="button"
                            onClick={() => handleApproveLoan(loan)}
                            disabled={loading}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold transition-all flex items-center gap-1 mx-auto shadow-sm active:scale-[0.98] cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        ) : (
                          <span className="inline-block px-2.5 py-1 text-[9px] font-bold rounded-full bg-slate-100 text-slate-500">
                            Pending Approval
                          </span>
                        )
                      ) : (
                        <span className="inline-block px-2.5 py-1 text-[9px] font-bold rounded-full bg-emerald-50 text-emerald-800">
                          Approved
                        </span>
                      )}
                    </td>
                    {isAuthorized && (
                      <td className="p-4 pr-5">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEditLoan(loan)}
                            disabled={!isManagedLoan || loading}
                            title={isManagedLoan ? 'Edit loan' : 'Legacy loans cannot be edited here'}
                            className="p-2 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteLoan(loan)}
                            disabled={!isManagedLoan || loading || repaymentStarted}
                            title={
                              !isManagedLoan
                                ? 'Legacy loans cannot be deleted here'
                                : repaymentStarted
                                  ? 'Repayment has started, delete is blocked'
                                  : 'Delete loan'
                            }
                            className="p-2 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-md disabled:opacity-35 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {loans.length === 0 && (
                <tr>
                  <td colSpan={isAuthorized ? 9 : 8} className="p-8 text-center text-slate-500">No loan entries yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List View */}
        <div className="block sm:hidden divide-y divide-slate-100">
          {loans.map((loan) => {
            const isManagedLoan = Boolean(loan.loanId);
            const repaymentStarted = Number(loan.repaymentCount || 0) > 0 || Number(loan.paidToDate || 0) > 0;
            return (
              <div key={loan.loanId || loan.id} className="p-3 flex justify-between items-center text-[10px] hover:bg-slate-50/50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                <div className="space-y-1 max-w-[65%]">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-bold text-slate-950 text-[10px] text-tnum">#{loan.loanNo || loan.id}</span>
                    <span className={`px-1.5 py-0.5 text-[8px] font-bold rounded-full ${
                      loan.status === 'ACTIVE' || loan.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-800'
                        : loan.status === 'PENDING' || loan.status === 'Pending'
                          ? 'bg-blue-50 text-blue-800'
                          : loan.status === 'CANCELLED' || loan.status === 'Cancelled'
                            ? 'bg-rose-50 text-rose-800'
                            : 'bg-slate-100 text-slate-500'
                    }`}>
                      {loan.status}
                    </span>
                  </div>
                  <p className="font-bold text-slate-900 truncate">{loan.memberName || 'Unassigned'}</p>
                  <p className="text-slate-500 font-medium">{loan.loanType || loan.type || 'Loan'} • {loan.interestMode === 'Variable' ? 'Variable' : `${Number(loan.interestRate || 0).toFixed(1)}%`}</p>
                  {!isManagedLoan && <p className="text-[8px] text-slate-400 italic">Legacy seed</p>}
                </div>

                <div className="text-right space-y-1.5 flex-shrink-0">
                  <p className="font-extrabold font-headline text-slate-950 font-mono text-tnum text-xs">
                    ₹{currency(Number(loan.amount || loan.principal || 0))}
                  </p>

                  {/* Actions and Approval */}
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Approve button for pending and authorized */}
                    {(loan.status === 'PENDING' || loan.status === 'Pending') && isAuthorized && (
                      <button
                        type="button"
                        onClick={() => handleApproveLoan(loan)}
                        disabled={loading}
                        className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[8px] font-bold transition-all flex items-center gap-0.5 shadow-sm active:scale-[0.98] cursor-pointer"
                      >
                        <Check className="w-2.5 h-2.5" />
                        <span>Approve</span>
                      </button>
                    )}

                    {/* Edit/Delete actions */}
                    {isAuthorized && isManagedLoan && (
                      <div className="flex items-center gap-1 border-l border-slate-200 pl-1.5">
                        <button
                          type="button"
                          onClick={() => handleEditLoan(loan)}
                          disabled={loading}
                          className="p-1 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded disabled:opacity-35"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteLoan(loan)}
                          disabled={loading || repaymentStarted}
                          className="p-1 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded disabled:opacity-35"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {loans.length === 0 && (
            <div className="p-8 text-center text-slate-500 text-[10px]">No loan entries yet.</div>
          )}
        </div>
      </div>
    </div>
  );
}
