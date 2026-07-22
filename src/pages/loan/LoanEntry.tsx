import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import {
  CheckCircle,
  Edit3,
  FileText,
  Layers,
  Percent,
  Plus,
  Save,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';

type LoanType = 'Single' | 'Group';
type InterestMode = 'Fixed' | 'Variable';
type LoanStatus = 'Pending' | 'Active' | 'Closed' | 'Cancelled';

interface PortalUser {
  id: string;
  fullName: string;
  email: string;
  status?: boolean | number;
}

interface MemberShare {
  userId: string;
  loanShareAmount: string;
}

interface InterestSlab {
  fromAmount: string;
  toAmount: string;
  interestRate: string;
}

const today = new Date().toISOString().split('T')[0];

function addMonths(dateString: string, months: number) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  date.setMonth(date.getMonth() + months);
  return date.toISOString().split('T')[0];
}

function currency(value: number) {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function LoanEntry() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit') || '';

  const { user, menus } = useSelector((state: RootState) => state.auth);
  const isGroupAllowed = user?.role === 'admin' || menus.some((m: any) => m.menuId === 'loan-repayments' || m.menuId === 'role-management');
  const isStaff = isGroupAllowed;

  const [users, setUsers] = useState<PortalUser[]>([]);
  const [loans, setLoans] = useState<any[]>([]);

  const [loanType, setLoanType] = useState<LoanType>('Single');
  const [amount, setAmount] = useState('100000');
  const [tenureMonths, setTenureMonths] = useState('12');
  const [startDate, setStartDate] = useState(today);
  const [interestMode, setInterestMode] = useState<InterestMode>('Fixed');
  const [interestRate, setInterestRate] = useState('12');
  const [isCompound, setIsCompound] = useState<boolean>(false);
  const [status, setStatus] = useState<LoanStatus>('Pending');
  const [members, setMembers] = useState<MemberShare[]>([]);
  const [slabs, setSlabs] = useState<InterestSlab[]>([
    { fromAmount: '0', toAmount: '50000', interestRate: '10' },
    { fromAmount: '50000', toAmount: '250000', interestRate: '12' },
  ]);

  const [editingLoanId, setEditingLoanId] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  const amountNum = Number(amount) || 0;
  const tenureNum = Number(tenureMonths) || 0;
  const endDate = useMemo(() => addMonths(startDate, tenureNum), [startDate, tenureNum]);

  const currentEditingLoan = useMemo(() => {
    if (!editingLoanId) return null;
    return loans.find((l) => l.loanId === editingLoanId) || null;
  }, [editingLoanId, loans]);

  const fetchWorkspaceData = async () => {
    try {
      const [usersRes, loansRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/loans'),
      ]);
      const usersData = usersRes.ok ? await usersRes.json() : [];
      const loansData = loansRes.ok ? await loansRes.json() : [];
      const usableUsers = usersData.filter((item: PortalUser) => item.status === true || item.status === 1);

      setUsers(usableUsers.length ? usableUsers : usersData);
      setLoans(loansData);

      const firstUserId = (usableUsers[0] || usersData[0])?.id || '';
      if (!members.length && firstUserId) {
        const defaultUserId = !isStaff ? user?.id : firstUserId;
        setMembers([{ userId: defaultUserId, loanShareAmount: amount }]);
      }
    } catch (err) {
      console.error('Loan workspace fetch error', err);
      setError('Unable to load users or loan register.');
    }
  };

  useEffect(() => {
    fetchWorkspaceData();
  }, []);

  useEffect(() => {
    if (editId && loans.length > 0) {
      const loan = loans.find((l) => l.loanId === editId);
      if (loan) {
        setEditingLoanId(loan.loanId);
        setLoanType(loan.loanType === 'Group' ? 'Group' : 'Single');
        setAmount(String(loan.amount || loan.principal || ''));
        setTenureMonths(String(loan.tenureMonths || loan.remainingTerm || ''));
        setStartDate(loan.startDate || loan.nextDueDate || today);
        setInterestMode(loan.interestMode === 'Variable' ? 'Variable' : 'Fixed');
        setInterestRate(String(loan.interestRate ?? ''));
        setIsCompound(Boolean(loan.isCompound || loan.IsCompound));
        setStatus((loan.status || 'Pending').charAt(0).toUpperCase() + (loan.status || 'Pending').slice(1).toLowerCase());
        setMembers((loan.members || []).map((member: any) => ({
          userId: member.userId,
          loanShareAmount: String(member.loanShareAmount),
        })));
        setSlabs((loan.slabs || []).length
          ? loan.slabs.map((slab: any) => ({
            fromAmount: String(slab.fromAmount),
            toAmount: String(slab.toAmount),
            interestRate: String(slab.interestRate),
          }))
          : [{ fromAmount: '0', toAmount: String(loan.amount || loan.principal || ''), interestRate: '0' }]);
        setError('');
      } else {
        setError(`Loan with ID ${editId} not found.`);
      }
    } else if (!editId && editingLoanId) {
      resetForm();
    }
  }, [editId, loans]);

  useEffect(() => {
    if (editingLoanId) return;
    if (!members.length) return;
    if (loanType === 'Single') {
      setMembers((current) => {
        const defaultId = !isStaff ? user?.id : current[0]?.userId || users[0]?.id || '';
        return [{ userId: defaultId, loanShareAmount: amount }];
      });
      return;
    }

    setMembers((current) => {
      const normalized = current.length > 1 ? current : [
        current[0] || { userId: users[0]?.id || '', loanShareAmount: '' },
        { userId: users.find((item) => item.id !== current[0]?.userId)?.id || '', loanShareAmount: '' },
      ];
      const equalShare = normalized.length ? (amountNum / normalized.length).toFixed(2) : amount;
      return normalized.map((member) => ({ ...member, loanShareAmount: equalShare }));
    });
  }, [loanType, amount, editingLoanId]);

  const selectedUserIds = members.map((member) => member.userId).filter(Boolean);
  const shareTotal = members.reduce((sum, member) => sum + (Number(member.loanShareAmount) || 0), 0);
  const shareDifference = amountNum - shareTotal;

  const effectiveRate = useMemo(() => {
    if (interestMode === 'Fixed') return Number(interestRate) || 0;
    const matchingSlab = slabs.find((slab) => {
      const from = Number(slab.fromAmount) || 0;
      const to = Number(slab.toAmount) || 0;
      return amountNum >= from && amountNum <= to;
    });
    return Number(matchingSlab?.interestRate) || Number(slabs[0]?.interestRate) || 0;
  }, [amountNum, interestMode, interestRate, slabs]);

  const estimatedInstallment = useMemo(() => {
    if (!tenureNum) return 0;
    const monthlyRate = effectiveRate / 12 / 100;
    if (monthlyRate === 0) {
      return amountNum / tenureNum;
    }
    const emi =
      (amountNum * monthlyRate * Math.pow(1 + monthlyRate, tenureNum)) /
      (Math.pow(1 + monthlyRate, tenureNum) - 1);
    return Number(emi.toFixed(2));
  }, [amountNum, effectiveRate, tenureNum]);

  const estimatedTotal = estimatedInstallment * tenureNum;
  const estimatedInterest = Math.max(0, estimatedTotal - amountNum);

  const updateMember = (index: number, key: keyof MemberShare, value: string) => {
    setMembers((current) => current.map((member, itemIndex) => (
      itemIndex === index ? { ...member, [key]: value } : member
    )));
  };

  const addMember = () => {
    const nextUser = users.find((item) => !selectedUserIds.includes(item.id));
    setMembers((current) => [...current, { userId: nextUser?.id || '', loanShareAmount: '0' }]);
  };

  const removeMember = (index: number) => {
    setMembers((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const updateSlab = (index: number, key: keyof InterestSlab, value: string) => {
    setSlabs((current) => current.map((slab, itemIndex) => (
      itemIndex === index ? { ...slab, [key]: value } : slab
    )));
  };

  const addSlab = () => {
    const previousToAmount = slabs[slabs.length - 1]?.toAmount || '0';
    setSlabs((current) => [...current, { fromAmount: previousToAmount, toAmount: '', interestRate: '' }]);
  };

  const removeSlab = (index: number) => {
    setSlabs((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const resetForm = () => {
    const firstUserId = users[0]?.id || '';
    setEditingLoanId('');
    setLoanType('Single');
    setAmount('100000');
    setTenureMonths('12');
    setStartDate(today);
    setInterestMode('Fixed');
    setInterestRate('12');
    setIsCompound(false);
    setStatus('Pending');
    setMembers(firstUserId ? [{ userId: firstUserId, loanShareAmount: '100000' }] : []);
    setSlabs([
      { fromAmount: '0', toAmount: '50000', interestRate: '10' },
      { fromAmount: '50000', toAmount: '250000', interestRate: '12' },
    ]);
    setError('');
  };



  const validateForm = () => {
    if (!amountNum || amountNum <= 0) return 'Loan amount must be greater than zero.';
    if (!tenureNum || tenureNum <= 0) return 'Tenure must be greater than zero.';
    if (!startDate || !endDate) return 'Start date is required.';
    if (loanType === 'Single' && members.length !== 1) return 'Single loans must have exactly one member.';
    if (loanType === 'Group' && !isGroupAllowed) return 'Group loans can only be created by Admin or Manager.';
    if (loanType === 'Group' && members.length < 2) return 'Group loans must have at least two members.';
    if (members.some((member) => !member.userId || Number(member.loanShareAmount) <= 0)) return 'Every member needs a user and share amount.';
    if (new Set(selectedUserIds).size !== selectedUserIds.length) return 'A member can only be selected once per loan.';
    if (Math.abs(shareDifference) > 0.01) return 'Member share amounts must equal the loan amount.';
    if (interestMode === 'Fixed' && Number(interestRate) < 0) return 'Fixed interest rate cannot be negative.';
    if (interestMode === 'Variable' && slabs.some((slab) => Number(slab.toAmount) <= Number(slab.fromAmount) || Number(slab.interestRate) < 0)) {
      return 'Variable slabs need valid amount ranges and rates.';
    }
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(editingLoanId ? `/api/loans/${encodeURIComponent(editingLoanId)}` : '/api/loans', {
        method: editingLoanId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          loanType,
          amount: amountNum,
          tenureMonths: tenureNum,
          startDate,
          endDate,
          interestMode,
          interestRate: interestMode === 'Fixed' ? Number(interestRate) : null,
          isCompound,
          status,
          members: members.map((member) => ({
            userId: member.userId,
            loanShareAmount: Number(member.loanShareAmount),
          })),
          slabs: interestMode === 'Variable'
            ? slabs.map((slab) => ({
              fromAmount: Number(slab.fromAmount),
              toAmount: Number(slab.toAmount),
              interestRate: Number(slab.interestRate),
            }))
            : [],
        }),
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || 'Failed to create loan.');
      }

      setToast(editingLoanId ? 'Loan updated successfully.' : 'Loan entry created successfully.');
      await fetchWorkspaceData();
      resetForm();
      setTimeout(() => {
        setToast('');
        navigate('/loan-list');
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Unable to create loan.');
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
            <p className="text-[10px] text-slate-350">Loan, member shares, and interest rules were saved.</p>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center gap-3">
        <div>
          <h3 className="text-lg sm:text-2xl font-bold font-headline">Loan Entry</h3>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5 hidden sm:block">
            Create single-member or group loans with fixed rates or amount-based variable slabs.
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-8">
        <form onSubmit={handleSubmit} className="lg:col-span-8 bg-white rounded-xl p-4 sm:p-6 border border-slate-200 shadow-sm space-y-4 sm:space-y-6">
          <section className="space-y-3 sm:space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm sm:text-base font-bold font-headline">{editingLoanId ? 'Edit Loan Details' : 'Loan Details'}</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">
                  {editingLoanId ? 'Update this loan record and save changes.' : 'Amount, tenure, dates, and status.'}
                </p>
              </div>
              <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
                {(['Single', 'Group'] as LoanType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    disabled={type === 'Group' && !isGroupAllowed}
                    onClick={() => setLoanType(type)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold transition ${loanType === type ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'} ${type === 'Group' && !isGroupAllowed ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'
                      }`}
                    title={type === 'Group' && !isGroupAllowed ? 'Group loans can only be created by Admin or Manager' : undefined}
                  >
                    {type === 'Single' ? <User className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                    <span>{type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-4">
              <div className="sm:col-span-3">
                <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">Amount</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-950 text-tnum"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">Tenure Months</label>
                <input
                  required
                  type="number"
                  min="1"
                  value={tenureMonths}
                  onChange={(e) => setTenureMonths(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-950 text-tnum"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">Start Date</label>
                <input
                  required
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-950 text-tnum"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">End Date</label>
                <input
                  readOnly
                  type="date"
                  value={endDate}
                  className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-500 text-tnum"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as LoanStatus)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-950"
                >
                  <option value="Pending">Pending</option>
                  <option value="Active">Active</option>
                  <option value="Closed">Closed</option>
                  <option value="Cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </section>

          <section className="space-y-3 sm:space-y-4 border-t border-slate-100 pt-4 sm:pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm sm:text-base font-bold font-headline">Members</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Single loans use one member. Group loans split the amount.</p>
              </div>
              {loanType === 'Group' && (
                <button
                  type="button"
                  onClick={addMember}
                  disabled={selectedUserIds.length >= users.length}
                  className="px-2 py-1.5 sm:px-3 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md sm:rounded-lg text-[10px] sm:text-xs font-bold flex items-center gap-1 disabled:opacity-40 cursor-pointer transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {members.map((member, index) => (
                <div key={`${member.userId}-${index}`} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50 border border-slate-200 rounded-lg p-3">
                  <div className="md:col-span-7">
                    <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">Member</label>
                    <select
                      value={member.userId}
                      onChange={(e) => updateMember(index, 'userId', e.target.value)}
                      disabled={!isStaff}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-950"
                    >
                      <option value="">Select member</option>
                      {users.map((item) => (
                        <option key={item.id} value={item.id} disabled={selectedUserIds.includes(item.id) && member.userId !== item.id}>
                          {item.fullName} ({item.id})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="md:col-span-4">
                    <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">Share Amount</label>
                    <input
                      required
                      type="number"
                      min="1"
                      value={member.loanShareAmount}
                      onChange={(e) => updateMember(index, 'loanShareAmount', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold text-slate-900 focus:outline-none focus:border-slate-950 text-tnum"
                    />
                  </div>
                  <div className="md:col-span-1 flex justify-end">
                    {loanType === 'Group' && members.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeMember(index)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className={`text-[10px] sm:text-xs font-bold ${Math.abs(shareDifference) <= 0.01 ? 'text-emerald-700' : 'text-rose-700'}`}>
              Share total: ₹{currency(shareTotal)} / ₹{currency(amountNum)}
            </div>
          </section>

          <section className="space-y-3 sm:space-y-4 border-t border-slate-100 pt-4 sm:pt-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h4 className="text-sm sm:text-base font-bold font-headline">Interest Mode</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Fixed uses one rate. Variable uses slabs by range.</p>
              </div>
              <div className="inline-flex bg-slate-100 rounded-lg p-0.5">
                {(['Fixed', 'Variable'] as InterestMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setInterestMode(mode)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] sm:text-xs font-bold transition ${interestMode === mode ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-900'
                      }`}
                  >
                    {mode === 'Fixed' ? <Percent className="w-3 h-3" /> : <Layers className="w-3 h-3" />}
                    <span>{mode}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Compound Interest Toggle Switch */}
            <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-xs font-bold text-slate-900">Compound Interest Method</span>
                <p className="text-[10px] text-slate-500 mt-0.5">Calculate interest on carryover balances monthly</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompound(!isCompound)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 border transition cursor-pointer ${
                  isCompound
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{isCompound ? 'Compound ON' : 'Simple Interest'}</span>
                <span className={`w-7 h-4 rounded-full p-0.5 transition-colors duration-200 ease-in-out flex items-center ${isCompound ? 'bg-indigo-900 justify-end' : 'bg-slate-300 justify-start'}`}>
                  <span className="w-3 h-3 rounded-full bg-white shadow-xs" />
                </span>
              </button>
            </div>

            {interestMode === 'Fixed' ? (
              <div className="max-w-sm">
                <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">Fixed Interest Rate %</label>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-900 focus:outline-none focus:border-slate-950 text-tnum"
                />
              </div>
            ) : (
              <div className="space-y-3">
                {slabs.map((slab, index) => (
                  <div key={index} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="sm:col-span-3">
                      <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">From Amount</label>
                      <input type="number" min="0" value={slab.fromAmount} onChange={(e) => updateSlab(index, 'fromAmount', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold text-tnum" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">To Amount</label>
                      <input type="number" min="1" value={slab.toAmount} onChange={(e) => updateSlab(index, 'toAmount', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold text-tnum" />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">Interest Rate %</label>
                      <input type="number" min="0" step="0.01" value={slab.interestRate} onChange={(e) => updateSlab(index, 'interestRate', e.target.value)} className="w-full px-3 py-2 bg-white border border-slate-200 rounded-md text-xs font-bold text-tnum" />
                    </div>
                    <div className="sm:col-span-3 flex justify-end gap-2">
                      {slabs.length > 1 && (
                        <button type="button" onClick={() => removeSlab(index)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md cursor-pointer">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      {index === slabs.length - 1 && (
                        <button type="button" onClick={addSlab} className="px-2 py-1.5 bg-white border border-slate-200 rounded-md text-[10px] sm:text-xs font-bold flex items-center gap-1 cursor-pointer">
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-col sm:flex-row gap-3">
            {editingLoanId && (
              <button
                type="button"
                onClick={() => navigate('/loan-list')}
                className="w-full sm:w-44 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-2.5 sm:py-3.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel Edit</span>
              </button>
            )}
            <button
              type="submit"
              disabled={loading || users.length === 0}
              className="w-full flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 sm:py-3.5 rounded-md sm:rounded-lg text-[10px] sm:text-xs uppercase tracking-wider shadow active:scale-[0.99] transition-all disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Saving Loan...' : editingLoanId ? 'Update Loan' : 'Create Loan'}</span>
            </button>
          </div>
        </form>

        <aside className="lg:col-span-4 space-y-4 sm:space-y-6">
          <div className="bg-gradient-to-r from-blue-950 to-indigo-950 text-white rounded-xl p-4 sm:p-6 border border-blue-900/50 shadow-xl space-y-4">
            <span className="text-[8px] sm:text-[10px] uppercase font-extrabold tracking-widest text-emerald-400">Loan Preview</span>
            <div>
              <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold block">Estimated Monthly Installment</span>
              <p className="text-xl sm:text-3xl font-extrabold font-headline text-white mt-1 text-tnum">
                ₹{currency(estimatedInstallment)}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-3">
              <div>
                <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold block">Interest Rate</span>
                <p className="text-xs sm:text-sm font-bold text-emerald-400 mt-1">{effectiveRate.toFixed(2)}%</p>
              </div>
              <div>
                <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold block">Total Interest</span>
                <p className="text-xs sm:text-sm font-bold text-white mt-1 text-tnum">₹{currency(estimatedInterest)}</p>
              </div>
              <div>
                <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold block">Loan Type</span>
                <p className="text-xs sm:text-sm font-bold text-white mt-1">{loanType}</p>
              </div>
              <div>
                <span className="text-[8px] sm:text-[10px] text-slate-400 uppercase font-bold block">End Date</span>
                <p className="text-xs sm:text-sm font-bold text-white mt-1 text-tnum">{endDate || '-'}</p>
              </div>
            </div>
          </div>

          {currentEditingLoan ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-3 sm:space-y-4">
              <div>
                <h4 className="text-xs sm:text-base font-bold font-headline">Current Loan Details</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Original record values in register.</p>
              </div>
              <div className="space-y-2.5 divide-y divide-slate-100 text-[10px] sm:text-xs">
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Loan No</span>
                  <span className="font-mono font-bold text-slate-900">{currentEditingLoan.loanNo || currentEditingLoan.id}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Original Amount</span>
                  <span className="font-bold text-slate-900 text-tnum">₹{currency(currentEditingLoan.amount || currentEditingLoan.principal)}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Interest Mode</span>
                  <span className="font-bold text-slate-900 text-tnum">{currentEditingLoan.interestMode} ({currentEditingLoan.interestMode === 'Variable' ? `${currentEditingLoan.slabs?.length || 0} slabs` : `${Number(currentEditingLoan.interestRate || 0).toFixed(2)}%`})</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-slate-900 uppercase">{currentEditingLoan.status}</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Repayments</span>
                  <span className="font-bold text-slate-900">{currentEditingLoan.repaymentCount || 0} made</span>
                </div>
                <div className="pt-2 flex justify-between">
                  <span className="text-slate-500">Outstanding Balance</span>
                  <span className="font-bold text-slate-900 text-tnum">₹{currency(currentEditingLoan.outstandingBalance || 0)}</span>
                </div>
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Members</span>
                  <div className="space-y-1 pl-2">
                    {currentEditingLoan.members?.map((member: any) => (
                      <div key={member.userId} className="flex justify-between text-[9px] sm:text-[11px]">
                        <span className="text-slate-600 truncate max-w-[150px]">{member.fullName || member.userId}</span>
                        <span className="font-semibold text-slate-900 text-tnum">₹{currency(member.loanShareAmount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-slate-200">
                <h4 className="text-xs sm:text-base font-bold font-headline">Recent Loans</h4>
                <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5">Last entries from the loan register.</p>
              </div>
              <div className="divide-y divide-slate-100">
                {loans.slice(0, 5).map((loan) => (
                  <div key={loan.id} className="p-3 sm:p-4 flex items-center justify-between gap-3 text-[10px] sm:text-xs">
                    <div className="min-w-0">
                      <p className="font-bold text-slate-950 truncate">{loan.loanNo || loan.id}</p>
                      <p className="text-[9px] sm:text-slate-500 truncate">{loan.memberName}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-slate-900 text-tnum">₹{currency(Number(loan.amount || loan.principal || 0))}</p>
                      <span className="text-[8px] sm:text-[9px] uppercase font-bold text-slate-400">{loan.status}</span>
                    </div>
                  </div>
                ))}
                {loans.length === 0 && (
                  <div className="p-5 text-xs text-slate-500">No loan entries yet.</div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
