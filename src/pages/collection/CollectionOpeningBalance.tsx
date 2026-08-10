import React, { useState, useEffect, useMemo } from 'react';
import {
  Coins,
  Search,
  CheckCircle,
  AlertCircle,
  Save,
  RefreshCw,
  Calendar,
  FileText,
  Users,
  DollarSign
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface OpeningBalanceRecord {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  openingBalance: number;
  asOfDate?: string;
  notes?: string;
  localBalance: string;
  localNotes: string;
}

interface CollectionType {
  id: number;
  typeName: string;
  status: boolean;
  frequency?: string;
  amount?: number | null;
}

const today = new Date().toISOString().split('T')[0];

export default function CollectionOpeningBalance() {
  const { t } = useTranslation();
  const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [asOfDate, setAsOfDate] = useState<string>(today);
  const [records, setRecords] = useState<OpeningBalanceRecord[]>([]);

  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [saving, setSaving] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState('');
  const [error, setError] = useState('');

  // Fetch collection types
  const fetchCollectionTypes = async () => {
    setLoadingTypes(true);
    try {
      const res = await fetch('/api/collection-types');
      if (res.ok) {
        const data = await res.json();
        setCollectionTypes(data);
        const activeTypes = data.filter((item: CollectionType) => item.status);
        if (activeTypes.length > 0 && !selectedTypeId) {
          setSelectedTypeId(String(activeTypes[0].id));
        } else if (data.length > 0 && !selectedTypeId) {
          setSelectedTypeId(String(data[0].id));
        }
      }
    } catch (err) {
      console.error('Error loading collection types', err);
      setError('Unable to load collection types.');
    } finally {
      setLoadingTypes(false);
    }
  };

  // Fetch opening balance records for selected collection type
  const fetchOpeningBalances = async (typeId: string) => {
    if (!typeId) return;
    setLoadingData(true);
    setError('');
    try {
      const res = await fetch(`/api/fund-collections/opening-balance?collectionTypeId=${typeId}`);
      if (res.ok) {
        const data = await res.json();
        const mapped: OpeningBalanceRecord[] = data.map((item: any) => ({
          userId: item.userId,
          fullName: item.fullName,
          email: item.email,
          phoneNumber: item.phoneNumber,
          openingBalance: item.openingBalance || 0,
          asOfDate: item.asOfDate || today,
          notes: item.notes || '',
          localBalance: String(item.openingBalance || 0),
          localNotes: item.notes || ''
        }));
        setRecords(mapped);
        if (mapped.length > 0 && mapped[0].asOfDate) {
          setAsOfDate(mapped[0].asOfDate);
        }
      } else {
        setError('Failed to load member opening balances.');
      }
    } catch (err) {
      console.error('Error fetching opening balances', err);
      setError('Error fetching member opening balances.');
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    fetchCollectionTypes();
  }, []);

  useEffect(() => {
    if (selectedTypeId) {
      fetchOpeningBalances(selectedTypeId);
    }
  }, [selectedTypeId]);

  const handleAmountChange = (userId: string, val: string) => {
    setRecords((prev) =>
      prev.map((rec) => (rec.userId === userId ? { ...rec, localBalance: val } : rec))
    );
  };

  const handleNotesChange = (userId: string, val: string) => {
    setRecords((prev) =>
      prev.map((rec) => (rec.userId === userId ? { ...rec, localNotes: val } : rec))
    );
  };

  const handleSaveAll = async () => {
    if (!selectedTypeId) return;
    setSaving(true);
    setError('');
    setToast('');

    const balances = records.map((rec) => ({
      userId: rec.userId,
      amount: parseFloat(rec.localBalance) || 0,
      notes: rec.localNotes || ''
    }));

    try {
      const res = await fetch('/api/fund-collections/opening-balance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          collectionTypeId: Number(selectedTypeId),
          asOfDate,
          balances
        })
      });

      if (res.ok) {
        setToast('Member opening balances saved successfully!');
        setTimeout(() => setToast(''), 4000);
        fetchOpeningBalances(selectedTypeId);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to save opening balances.');
      }
    } catch (err) {
      console.error('Error saving opening balances', err);
      setError('An unexpected error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.email.toLowerCase().includes(q) ||
        (r.phoneNumber && r.phoneNumber.toLowerCase().includes(q))
    );
  }, [records, searchQuery]);

  const totalOpeningBalance = useMemo(() => {
    return records.reduce((sum, r) => sum + (parseFloat(r.localBalance) || 0), 0);
  }, [records]);

  const selectedTypeObj = collectionTypes.find((t) => String(t.id) === selectedTypeId);

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in text-slate-900 mt-16 sm:mt-20 mb-5 px-3">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 flex items-center gap-2 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg animate-bounce">
          <CheckCircle className="w-5 h-5" />
          <span className="text-sm font-semibold">{toast}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 p-4 rounded-xl">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-500" />
            Collection Opening Balance Entry
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Record initial accumulated balances for members per collection type.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          disabled={saving || !selectedTypeId || loadingData}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save Opening Balances'}
        </button>
      </div>

      {/* CONTROLS & STATS CARD */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Collection Type Selector */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-1.5">
            Collection Type
          </label>
          <select
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            disabled={loadingTypes}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          >
            {collectionTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.typeName} {!type.status ? '(Inactive)' : ''}
              </option>
            ))}
          </select>
        </div>

        {/* As Of Date Picker */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
          <label className="block text-xs uppercase font-bold tracking-wider text-slate-400 mb-1.5 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-amber-500" />
            As Of Date
          </label>
          <input
            type="date"
            value={asOfDate}
            onChange={(e) => setAsOfDate(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-medium text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
          />
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-100 block">
              Total Opening Balance
            </span>
            <span className="text-2xl font-extrabold">
              ₹{totalOpeningBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </span>
            <span className="text-[11px] text-amber-100 block mt-0.5">
              {selectedTypeObj ? selectedTypeObj.typeName : 'Collection'} • {records.length} Members
            </span>
          </div>
          <DollarSign className="w-10 h-10 text-white/30" />
        </div>
      </div>

      {/* TABLE & SEARCH SECTION */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Search & Refresh Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search member by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
            />
          </div>

          <button
            onClick={() => fetchOpeningBalances(selectedTypeId)}
            disabled={loadingData}
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingData ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Member Table */}
        {loadingData ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-amber-500 mb-2" />
            Loading member records...
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
            No members found for this collection type.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-xs uppercase text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 w-12 text-center">#</th>
                  <th className="py-3 px-4">Member Name</th>
                  <th className="py-3 px-4">Contact Info</th>
                  <th className="py-3 px-4 text-right w-44">Opening Balance (₹)</th>
                  <th className="py-3 px-4 w-64">Notes / Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {filteredRecords.map((record, index) => (
                  <tr
                    key={record.userId}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 text-center font-mono text-slate-400 text-xs">
                      {index + 1}
                    </td>

                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                      {record.fullName}
                    </td>

                    <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                      <div>{record.email}</div>
                      {record.phoneNumber && (
                        <div className="text-[11px] text-slate-400">{record.phoneNumber}</div>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="relative inline-block w-full max-w-[160px]">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-semibold">
                          ₹
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={record.localBalance}
                          onChange={(e) => handleAmountChange(record.userId, e.target.value)}
                          className="w-full pl-6 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-right text-slate-900 dark:text-slate-100 text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        />
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <input
                        type="text"
                        placeholder="Optional remarks..."
                        value={record.localNotes}
                        onChange={(e) => handleNotesChange(record.userId, e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Showing {filteredRecords.length} of {records.length} members
          </span>

          <button
            onClick={handleSaveAll}
            disabled={saving || !selectedTypeId || loadingData}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Opening Balances'}
          </button>
        </div>
      </div>
    </div>
  );
}
