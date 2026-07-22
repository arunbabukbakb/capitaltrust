import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Shield, CheckCircle, AlertCircle, Save, X, RefreshCw } from 'lucide-react';

interface CollectionType {
  id: number;
  typeName: string;
  status: boolean;
  frequency: 'weekly' | 'monthly' | 'yearly' | 'dynamic';
  amount: number | null;
}

export default function CollectionTypeMaster() {
  const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [typeName, setTypeName] = useState('');
  const [status, setStatus] = useState(true);
  const [frequency, setFrequency] = useState<'weekly' | 'monthly' | 'yearly' | 'dynamic'>('monthly');
  const [amount, setAmount] = useState('');
  const [showForm, setShowForm] = useState(false);

  const fetchCollectionTypes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/collection-types');
      if (res.ok) {
        const data = await res.json();
        setCollectionTypes(data);
      } else {
        setError('Failed to fetch collection types.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching collection types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionTypes();
  }, []);

  const handleEdit = (type: CollectionType) => {
    setEditingId(type.id);
    setTypeName(type.typeName);
    setStatus(type.status);
    setFrequency(type.frequency || 'monthly');
    setAmount(type.amount !== null && type.amount !== undefined ? String(type.amount) : '');
    setShowForm(true);
    setError('');
  };

  const handleToggleStatus = async (type: CollectionType) => {
    setError('');
    try {
      const updatedStatus = !type.status;
      const res = await fetch(`/api/collection-types/${type.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeName: type.typeName,
          status: updatedStatus,
          frequency: type.frequency || 'monthly',
          amount: type.amount
        })
      });

      if (res.ok) {
        setToast(`Status updated successfully for "${type.typeName}"`);
        await fetchCollectionTypes();
        setTimeout(() => setToast(''), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to toggle status.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error toggling status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!typeName.trim()) {
      setError('Type Name is required.');
      return;
    }

    let parsedAmount: number | null = null;
    if (amount !== '') {
      const num = parseFloat(amount);
      if (isNaN(num) || num < 0) {
        setError('Please enter a valid amount or leave it blank.');
        return;
      }
      parsedAmount = num;
    }

    setSubmitting(true);
    setError('');
    try {
      const url = editingId ? `/api/collection-types/${editingId}` : '/api/collection-types';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          typeName: typeName.trim(),
          status,
          frequency,
          amount: parsedAmount
        })
      });

      if (res.ok) {
        setToast(editingId ? 'Collection type updated successfully' : 'Collection type created successfully');
        resetForm();
        await fetchCollectionTypes();
        setTimeout(() => setToast(''), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to save collection type.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error saving collection type.');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setTypeName('');
    setStatus(true);
    setFrequency('monthly');
    setAmount('');
    setShowForm(false);
    setError('');
  };

  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in text-slate-900 mt-16 sm:mt-20 mb-5 px-3 sm:px-0">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-5 py-4 rounded-xl border border-slate-800 shadow-2xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs font-bold font-headline">{toast}</p>
          </div>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-white dark:bg-slate-900 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/85 dark:border-slate-800 shadow-sm">
        <div>
          <h3 className="text-base sm:text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-slate-950 dark:text-slate-100" />
            Collection Type Master
          </h3>
          <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Configure master collection types, default frequencies, and contribution amounts.
          </p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="w-full sm:w-auto px-3.5 py-2 bg-slate-950 hover:bg-slate-900 dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 text-white rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer shadow"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Collection Type</span>
        </button>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-4 sm:p-6 space-y-4">
            <div className="flex justify-between items-center pb-2.5 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-xs sm:text-sm font-bold font-headline text-slate-900 dark:text-slate-100">
                {editingId ? 'Edit Collection Type' : 'Create Collection Type'}
              </h4>
              <button
                onClick={resetForm}
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-805 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-250 dark:border-rose-900/50 text-rose-800 dark:text-rose-400 rounded-lg px-4 py-3 text-xs font-semibold flex items-center gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-455 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">
                  Type Name
                </label>
                <input
                  required
                  type="text"
                  placeholder="e.g. Monthly Dues"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-950 dark:focus:border-slate-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">
                    Frequency
                  </label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-950 dark:focus:border-slate-100 cursor-pointer"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                    <option value="dynamic">Dynamic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[8px] sm:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1 sm:mb-1.5">
                    Amount (₹) <span className="normal-case text-[9px] text-slate-400">(Optional)</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 500.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-slate-950 dark:focus:border-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-850">
                <input
                  id="status"
                  type="checkbox"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded border-slate-300 dark:border-slate-700 text-slate-950 dark:text-slate-100 focus:ring-slate-950 cursor-pointer"
                />
                <div>
                  <label htmlFor="status" className="text-xs font-bold text-slate-900 dark:text-slate-100 block select-none cursor-pointer">
                    Active Status
                  </label>
                  <label htmlFor="status" className="text-[10px] text-slate-505 dark:text-slate-400 select-none cursor-pointer block mt-0.5 font-medium">
                    If inactive, this type will be hidden from new entry dropdown lists.
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 bg-slate-950 hover:bg-slate-900 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-950 rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>Save</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 items-start">
        {/* List Table Column */}
        <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40">
            <h4 className="text-xs sm:text-sm font-bold font-headline">Configured Collection Types</h4>
            <p className="text-[10px] text-slate-500 mt-0.5">Manage existing categories, frequencies, amounts, and toggle status parameters.</p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <span>Fetching master list...</span>
            </div>
          ) : collectionTypes.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs italic">
              No collection types configured. Create one above to start.
            </div>
          ) : (
            <>
              {/* Desktop View Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-700">
                      <th className="py-3 px-4 pl-6 uppercase tracking-wider text-[9px] sm:text-[10px]">ID</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[9px] sm:text-[10px]">Collection Type Name</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[9px] sm:text-[10px]">Frequency</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Default Amount</th>
                      <th className="py-3 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-center">Status</th>
                      <th className="py-3 px-4 pr-6 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {collectionTypes.map((type) => (
                      <tr key={type.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                        <td className="py-3 px-4 pl-6 font-semibold font-mono text-slate-500">
                          #{type.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-905">
                          {type.typeName}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 rounded text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase tracking-wider">
                            {type.frequency || 'monthly'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          {type.amount !== null && type.amount !== undefined ? (
                            `₹${Number(type.amount).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-400 font-normal italic text-[11px]">Dynamic</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleToggleStatus(type)}
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border cursor-pointer transition ${
                              type.status 
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-100 hover:bg-emerald-100' 
                                : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200'
                            }`}
                          >
                            {type.status ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                        <td className="py-3 px-4 pr-6 text-right">
                          <button
                            onClick={() => handleEdit(type)}
                            className="p-1 px-2 border border-slate-200 hover:bg-slate-50 rounded-md text-[10px] font-bold text-slate-700 hover:text-slate-950 inline-flex items-center gap-1 transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile View Card List */}
              <div className="block sm:hidden divide-y divide-slate-100">
                {collectionTypes.map((type) => (
                  <div key={type.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50/30 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] font-bold text-slate-400">#{type.id}</span>
                        <span className="font-bold text-slate-900">{type.typeName}</span>
                      </div>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
                          {type.frequency || 'monthly'}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-slate-700">
                          {type.amount !== null && type.amount !== undefined ? (
                            `₹${Number(type.amount).toLocaleString('en-IN')}`
                          ) : (
                            <span className="text-slate-400 font-normal italic text-[9px]">Dynamic</span>
                          )}
                        </span>
                        <button
                          onClick={() => handleToggleStatus(type)}
                          className={`px-1.5 py-0.5 rounded text-[8px] font-bold border transition ${
                            type.status 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                              : 'bg-slate-105 text-slate-400 border-slate-200'
                          }`}
                        >
                          {type.status ? 'ACTIVE' : 'INACTIVE'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <button
                        onClick={() => handleEdit(type)}
                        className="p-1 px-2 border border-slate-200 hover:bg-slate-50 rounded-md text-[9px] font-bold text-slate-700 flex items-center gap-1 transition cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

