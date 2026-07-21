import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { Expense, ExpensePaymentMode, ExpenseStatus } from '../../types';
import {
  Receipt,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  CreditCard,
  Building2,
  Smartphone,
  X,
  AlertCircle,
  ShieldCheck,
  RefreshCw,
  Pencil,
  AlertTriangle
} from 'lucide-react';

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info' | 'success';
  onConfirm: () => void | Promise<void>;
}

export default function ExpensesPage() {
  const { user, activeRole } = useSelector((state: RootState) => state.auth);
  const activeRoleType = activeRole?.roleType || user?.role;
  const isAdminOrManager = activeRoleType === 'admin' || activeRoleType === 'manager';

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | ExpenseStatus>('ALL');
  const [selectedPaymentMode, setSelectedPaymentMode] = useState<'ALL' | ExpensePaymentMode>('ALL');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Confirmation Dialog Modal State
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState | null>(null);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    expenseDate: getTodayString(),
    amount: '',
    paymentMode: 'Cash' as ExpensePaymentMode,
    referenceNo: '',
    description: ''
  });

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/expenses');
      if (!res.ok) {
        throw new Error('Failed to load expenses register');
      }
      const data = await res.json();
      setExpenses(data);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      setError(err.message || 'Error fetching expenses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormData({
      expenseDate: getTodayString(),
      amount: '',
      paymentMode: 'Cash',
      referenceNo: '',
      description: ''
    });
    setFormError(null);
    setShowAddModal(true);
  };

  const handleCloseModal = () => {
    setShowAddModal(false);
    setEditingExpense(null);
    setFormError(null);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      expenseDate: expense.ExpenseDate,
      amount: String(expense.Amount),
      paymentMode: expense.PaymentMode,
      referenceNo: expense.ReferenceNo || '',
      description: expense.Description
    });
    setFormError(null);
    setShowAddModal(true);
  };

  // Form submission handler (Creates or Updates expense)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Non-nullable description check
    if (!formData.description || formData.description.trim() === '') {
      setFormError('Description is non-nullable and must be provided.');
      return;
    }

    const numAmount = parseFloat(formData.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setFormError('Amount must be a positive number greater than 0.');
      return;
    }

    if (!formData.expenseDate) {
      setFormError('Expense Date is required.');
      return;
    }

    setSubmitting(true);
    try {
      const isEditing = !!editingExpense;
      const url = isEditing ? `/api/expenses/${editingExpense.Id}` : '/api/expenses';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseDate: formData.expenseDate,
          amount: numAmount,
          paymentMode: formData.paymentMode,
          referenceNo: formData.referenceNo.trim() || null,
          description: formData.description.trim()
        })
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || `Failed to ${isEditing ? 'update' : 'submit'} expense`);
      }

      // Reset form & close modal
      setFormData({
        expenseDate: getTodayString(),
        amount: '',
        paymentMode: 'Cash',
        referenceNo: '',
        description: ''
      });
      setEditingExpense(null);
      setShowAddModal(false);
      fetchExpenses();
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while processing expense.');
    } finally {
      setSubmitting(false);
    }
  };

  const showAlert = (title: string, message: string) => {
    setConfirmDialog({
      isOpen: true,
      title,
      message,
      confirmText: 'OK',
      cancelText: '',
      variant: 'danger',
      onConfirm: () => setConfirmDialog(null)
    });
  };

  const executeApprove = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}/approve`, {
        method: 'PUT'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to approve expense');
      }
      fetchExpenses();
    } catch (err: any) {
      showAlert('Approval Error', err.message || 'Error approving expense');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApprove = (expense: Expense) => {
    const isCancelled = expense.Status === 'Cancelled';
    setConfirmDialog({
      isOpen: true,
      title: isCancelled ? 'Re-Approve Expense Entry' : 'Approve Expense Entry',
      message: isCancelled
        ? `Are you sure you want to re-approve expense ${expense.Id} (${expense.Description})? Status will change to Approved.`
        : `Are you sure you want to approve expense ${expense.Id} (${expense.Description})?`,
      confirmText: isCancelled ? 'Yes, Re-Approve' : 'Yes, Approve Expense',
      cancelText: 'Cancel',
      variant: 'success',
      onConfirm: () => executeApprove(expense.Id)
    });
  };

  const executeCancel = async (id: string) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/expenses/${id}/cancel`, {
        method: 'PUT'
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to cancel expense');
      }
      fetchExpenses();
    } catch (err: any) {
      showAlert('Cancellation Error', err.message || 'Error cancelling expense');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleCancel = (expense: Expense) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Cancel Expense Entry',
      message: `Are you sure you want to cancel expense ${expense.Id} (${expense.Description})? Status will change to Cancelled.`,
      confirmText: 'Yes, Cancel Expense',
      cancelText: 'Keep Expense',
      variant: 'danger',
      onConfirm: () => executeCancel(expense.Id)
    });
  };

  // Filtered expense list
  const filteredExpenses = expenses.filter((item) => {
    const matchesQuery =
      searchQuery === '' ||
      item.Id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.Description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.ReferenceNo && item.ReferenceNo.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.createdByName && item.createdByName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesStatus = selectedStatus === 'ALL' || item.Status === selectedStatus;
    const matchesMode = selectedPaymentMode === 'ALL' || item.PaymentMode === selectedPaymentMode;

    return matchesQuery && matchesStatus && matchesMode;
  });

  // KPI Computations
  const totalApprovedAmount = expenses
    .filter((e) => e.Status === 'Approved')
    .reduce((sum, e) => sum + Number(e.Amount || 0), 0);

  const totalDraftCount = expenses.filter((e) => e.Status === 'Draft').length;
  const totalDraftAmount = expenses
    .filter((e) => e.Status === 'Draft')
    .reduce((sum, e) => sum + Number(e.Amount || 0), 0);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="space-y-3 sm:space-y-4 animate-fade-in mt-12 sm:mt-20 pt-3 sm:pt-0 pb-6 px-2.5 sm:px-0">
      {/* Header section (Card container on desktop, plain layout with top margin on mobile) */}
      <div className="flex items-center justify-between gap-3 sm:bg-white sm:dark:bg-slate-900 sm:p-4 sm:rounded-2xl sm:border sm:border-slate-200/80 sm:dark:border-slate-800 sm:shadow-xs mt-3 sm:mt-0">
        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg">
              <Receipt className="w-5 h-5" />
            </span>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white font-headline">
              Expense Management
            </h1>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Record, audit, and approve operational organization expenses across tenant workflows.
          </p>
        </div>

        <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
          <button
            onClick={fetchExpenses}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 rounded-lg sm:rounded-xl shadow-xs transition-all cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold text-xs rounded-lg sm:rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (3-column compact summary) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-slate-500 dark:text-slate-400">Total Entries</p>
            <h3 className="text-sm sm:text-lg font-bold text-slate-900 dark:text-white mt-0.5">
              {expenses.length}
            </h3>
          </div>
          <div className="p-1.5 sm:p-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg sm:rounded-xl text-slate-600 dark:text-slate-300 hidden sm:block">
            <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-emerald-600 dark:text-emerald-400">Approved</p>
            <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white mt-0.5 truncate">
              {formatCurrency(totalApprovedAmount)}
            </h3>
          </div>
          <div className="p-1.5 sm:p-2.5 bg-emerald-50 dark:bg-emerald-950/50 rounded-lg sm:rounded-xl text-emerald-600 dark:text-emerald-400 hidden sm:block">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-[10px] sm:text-xs font-medium text-amber-600 dark:text-amber-400">Draft / Pending</p>
            <h3 className="text-xs sm:text-base font-bold text-slate-900 dark:text-white mt-0.5">
              {totalDraftCount} <span className="text-[10px] sm:text-xs font-normal text-slate-400">({formatCurrency(totalDraftAmount)})</span>
            </h3>
          </div>
          <div className="p-1.5 sm:p-2.5 bg-amber-50 dark:bg-amber-950/50 rounded-lg sm:rounded-xl text-amber-600 dark:text-amber-400 hidden sm:block">
            <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search ID, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs w-1/2 sm:w-auto">
            <Filter className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Status</option>
              <option value="Approved">Approved</option>
              <option value="Draft">Draft</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs w-1/2 sm:w-auto">
            <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
            <select
              value={selectedPaymentMode}
              onChange={(e) => setSelectedPaymentMode(e.target.value as any)}
              className="bg-transparent text-xs font-semibold text-slate-900 dark:text-white focus:outline-none cursor-pointer w-full"
            >
              <option value="ALL">All Modes</option>
              <option value="Cash">Cash</option>
              <option value="Bank">Bank</option>
              <option value="UPI">UPI</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses Register View */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs font-semibold text-slate-400">
            Loading expense register...
          </div>
        ) : error ? (
          <div className="p-6 text-center text-xs text-rose-500 font-medium">
            {error}
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              No expense entries found matching your criteria.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Native App Cards View */}
            <div className="block sm:hidden divide-y divide-slate-100 dark:divide-slate-800">
              {filteredExpenses.map((expense) => {
                const isDraft = expense.Status === 'Draft';
                const isApproved = expense.Status === 'Approved';
                const isCancelled = expense.Status === 'Cancelled';
                const canEdit = isAdminOrManager || (expense.CreatedBy === user?.id && isDraft);
                const canApprove = isAdminOrManager && (isDraft || isCancelled);
                const canCancel = isAdminOrManager && !isCancelled;

                return (
                  <div key={expense.Id} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 dark:text-white">{expense.Id}</span>
                        <span className="text-[10px] text-slate-400">{expense.ExpenseDate}</span>
                      </div>
                      <div>
                        {isApproved && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Approved
                          </span>
                        )}
                        {isDraft && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                            <Clock className="w-2.5 h-2.5" /> Draft
                          </span>
                        )}
                        {isCancelled && (
                          <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                            <XCircle className="w-2.5 h-2.5" /> Cancelled
                          </span>
                        )}
                      </div>
                    </div>

                    <p className="text-xs font-medium text-slate-900 dark:text-white leading-tight">
                      {expense.Description}
                    </p>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">{formatCurrency(Number(expense.Amount))}</span>
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {expense.PaymentMode}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{expense.createdByName || expense.CreatedBy}</span>
                    </div>

                    {(canEdit || canApprove || canCancel) && (
                      <div className="flex items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        {canEdit && (
                          <button
                            onClick={() => handleOpenEditModal(expense)}
                            disabled={actionLoadingId === expense.Id}
                            className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-semibold rounded-md text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" /> Edit
                          </button>
                        )}
                        {canApprove && (
                          <button
                            onClick={() => handleApprove(expense)}
                            disabled={actionLoadingId === expense.Id}
                            className="px-2.5 py-1 bg-emerald-500 text-white font-semibold rounded-md text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3 h-3" /> {isCancelled ? 'Re-Approve' : 'Approve'}
                          </button>
                        )}
                        {canCancel && (
                          <button
                            onClick={() => handleCancel(expense)}
                            disabled={actionLoadingId === expense.Id}
                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold rounded-md text-[10px] flex items-center gap-1 cursor-pointer"
                          >
                            <XCircle className="w-3 h-3" /> Cancel
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Data Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Expense ID</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Description</th>
                    <th className="py-3.5 px-4">Payment Mode</th>
                    <th className="py-3.5 px-4">Reference No</th>
                    <th className="py-3.5 px-4">Amount</th>
                    <th className="py-3.5 px-4">Created By</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredExpenses.map((expense) => {
                    const isDraft = expense.Status === 'Draft';
                    const isApproved = expense.Status === 'Approved';
                    const isCancelled = expense.Status === 'Cancelled';

                    return (
                      <tr key={expense.Id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {expense.Id}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 dark:text-slate-400">
                          {expense.ExpenseDate}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate font-medium text-slate-900 dark:text-white" title={expense.Description}>
                          {expense.Description}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {expense.PaymentMode === 'Cash' && <Receipt className="w-3 h-3 text-emerald-500" />}
                            {expense.PaymentMode === 'Bank' && <Building2 className="w-3 h-3 text-blue-500" />}
                            {expense.PaymentMode === 'UPI' && <Smartphone className="w-3 h-3 text-purple-500" />}
                            {expense.PaymentMode}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-500 dark:text-slate-400">
                          {expense.ReferenceNo || <span className="text-slate-300 dark:text-slate-600">-</span>}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          {formatCurrency(Number(expense.Amount))}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 dark:text-slate-400">
                          {expense.createdByName || expense.CreatedBy}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isApproved && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {isDraft && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50">
                              <Clock className="w-3 h-3" /> Draft
                            </span>
                          )}
                          {isCancelled && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                              <XCircle className="w-3 h-3" /> Cancelled
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          {(() => {
                            const canEdit = isAdminOrManager || (expense.CreatedBy === user?.id && isDraft);
                            const canApprove = isAdminOrManager && (isDraft || isCancelled);
                            const canCancel = isAdminOrManager && !isCancelled;
                            const hasAnyAction = canEdit || canApprove || canCancel;

                            if (!hasAnyAction) {
                              return <span className="text-[11px] text-slate-400 italic">No action</span>;
                            }

                            return (
                              <div className="flex items-center justify-end gap-2">
                                {canEdit && (
                                  <button
                                    onClick={() => handleOpenEditModal(expense)}
                                    disabled={actionLoadingId === expense.Id}
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 dark:text-indigo-300 font-semibold rounded-lg text-[11px] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                    title="Edit Expense Entry"
                                  >
                                    <Pencil className="w-3.5 h-3.5" /> Edit
                                  </button>
                                )}
                                {canApprove && (
                                  <button
                                    onClick={() => handleApprove(expense)}
                                    disabled={actionLoadingId === expense.Id}
                                    className="px-2.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-lg text-[11px] shadow-xs transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> {isCancelled ? 'Re-Approve' : 'Approve'}
                                  </button>
                                )}
                                {canCancel && (
                                  <button
                                    onClick={() => handleCancel(expense)}
                                    disabled={actionLoadingId === expense.Id}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 dark:bg-slate-800 dark:hover:bg-rose-950/50 dark:text-slate-300 dark:hover:text-rose-400 font-semibold rounded-lg text-[11px] transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Cancel
                                  </button>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-white animate-scale-up">
            <header className="flex justify-between items-center px-4 py-3.5 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg sm:rounded-xl">
                  <Receipt className="w-4 h-4 sm:w-5 sm:h-5" />
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-bold font-headline leading-tight">
                    {editingExpense ? `Edit Expense (${editingExpense.Id})` : 'Record New Expense'}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-400">
                    {editingExpense ? 'Update expense details' : 'Log operational expenditure details'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-1 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </header>

            <form onSubmit={handleSubmit} className="p-3.5 sm:p-6 space-y-3 sm:space-y-4 overflow-y-auto">
              {/* Approval status banner */}
              <div className={`p-2.5 sm:p-3.5 rounded-xl border text-[11px] sm:text-xs flex items-start gap-2 ${isAdminOrManager
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300'
                }`}>
                {isAdminOrManager ? (
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-bold">
                    {isAdminOrManager ? 'Direct Approval Mode' : 'Pending Approval Workflow'}
                  </span>
                  <p className="text-[10px] sm:text-[11px] mt-0.5 opacity-90 leading-tight">
                    {isAdminOrManager
                      ? 'As Admin/Manager, entry will be saved with Approved status.'
                      : 'As a Member, entry will be saved in Draft status until approved.'}
                  </p>
                </div>
              </div>

              {formError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 rounded-lg sm:rounded-xl text-[11px] sm:text-xs flex items-center gap-2">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                {/* Expense Date */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Date <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Amount (₹) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="e.g. 2500"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 sm:gap-4">
                {/* Payment Mode */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Payment Mode <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.paymentMode}
                    onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value as ExpensePaymentMode })}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank">Bank</option>
                    <option value="UPI">UPI</option>
                  </select>
                </div>

                {/* Reference No */}
                <div>
                  <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ref No <span className="text-slate-400 font-normal">(Opt)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="UTR / Chq No"
                    value={formData.referenceNo}
                    onChange={(e) => setFormData({ ...formData, referenceNo: e.target.value })}
                    className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Description (Non-nullable) */}
              <div>
                <label className="block text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Enter detailed description of expense purpose..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-lg sm:rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-1.5 sm:px-5 sm:py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg sm:rounded-xl shadow-md shadow-indigo-500/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {submitting ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Submit Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirmation Dialogue Modal */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-md w-full p-6 animate-scale-up text-slate-900 dark:text-white space-y-4">
            <div className="flex items-start gap-4">
              <div className={`p-3 rounded-2xl shrink-0 ${confirmDialog.variant === 'danger'
                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400'
                : confirmDialog.variant === 'warning'
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400'
                  : confirmDialog.variant === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                    : 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                }`}>
                {confirmDialog.variant === 'danger' && <AlertTriangle className="w-6 h-6" />}
                {confirmDialog.variant === 'warning' && <AlertCircle className="w-6 h-6" />}
                {confirmDialog.variant === 'success' && <CheckCircle2 className="w-6 h-6" />}
                {(!confirmDialog.variant || confirmDialog.variant === 'info') && <ShieldCheck className="w-6 h-6" />}
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold font-headline">{confirmDialog.title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  {confirmDialog.message}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              {confirmDialog.cancelText !== '' && (
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  {confirmDialog.cancelText || 'Cancel'}
                </button>
              )}
              <button
                type="button"
                onClick={async () => {
                  const callback = confirmDialog.onConfirm;
                  setConfirmDialog(null);
                  await callback();
                }}
                className={`px-5 py-2 text-white font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer ${confirmDialog.variant === 'danger'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-500/20'
                  : confirmDialog.variant === 'success'
                    ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20'
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20'
                  }`}
              >
                {confirmDialog.confirmText || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
