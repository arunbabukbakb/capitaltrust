import React, { useState, useEffect } from 'react';
import {
  Coins,
  Search,
  CheckCircle,
  AlertCircle,
  Save,
  RefreshCw,
  PlusCircle,
  Calendar,
  Edit3,
  X
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MemberRecord {
  userId: string;
  fullName: string;
  email: string;
  amount: number;
  localAmount: string; // editable input value
}

interface CollectionType {
  id: number;
  typeName: string;
  status: boolean;
  frequency?: string;
  amount?: number | null;
}

interface CollectionGroup {
  id: number;
  collectionTypeId: number;
  typeName: string;
  date: string;
  totalAmount: number;
}

const today = new Date().toISOString().split('T')[0];

export default function FundCollection() {
  const { t } = useTranslation();
  // Collections History
  const [history, setHistory] = useState<CollectionGroup[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Collection Types dropdown
  const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');

  // Editor State
  const [members, setMembers] = useState<MemberRecord[]>([]);
  const [collectionDate, setCollectionDate] = useState(today);
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Filters & UI States
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Fetch all collection types (active and inactive)
  const fetchCollectionTypes = async () => {
    setLoadingTypes(true);
    try {
      const res = await fetch('/api/collection-types');
      if (res.ok) {
        const data = await res.json();
        setCollectionTypes(data);

        // Default to the first active type if none selected
        const activeTypes = data.filter((t: CollectionType) => t.status);
        if (activeTypes.length > 0 && !selectedTypeId) {
          setSelectedTypeId(String(activeTypes[0].id));
        } else if (data.length > 0 && !selectedTypeId) {
          setSelectedTypeId(String(data[0].id));
        }
      }
    } catch (err) {
      console.error("Fetch types error", err);
      setError('Failed to fetch collection types.');
    } finally {
      setLoadingTypes(false);
    }
  };

  // Fetch past collection groups
  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const res = await fetch('/api/fund-collections');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Fetch history error", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch active users/members for a brand-new collection
  const fetchNewFormMembers = async () => {
    setLoadingMembers(true);
    setError('');
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const usersData = await res.json();
        // Map users into blank member allocation inputs
        const activeMembers = usersData
          .filter((u: any) => u.status === 1 || u.status === true)
          .map((u: any) => ({
            userId: u.id,
            fullName: u.fullName,
            email: u.email,
            amount: 0,
            localAmount: ''
          }));
        setMembers(activeMembers);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load active member list.');
    } finally {
      setLoadingMembers(false);
    }
  };

  // Load a past collection session for editing
  const handleEditCollection = async (groupId: number) => {
    setIsModalOpen(true);
    setLoadingMembers(true);
    setError('');
    setEditingGroupId(groupId);
    try {
      const res = await fetch(`/api/fund-collections/${groupId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedTypeId(String(data.collectionTypeId));
        setCollectionDate(data.date);

        const mapped = data.members.map((m: any) => ({
          userId: m.userId,
          fullName: m.fullName,
          email: m.email,
          amount: m.amount || 0,
          localAmount: m.amount > 0 ? String(m.amount) : ''
        }));
        setMembers(mapped);
      } else {
        setError('Failed to retrieve collection session details.');
        setEditingGroupId(null);
      }
    } catch (err) {
      console.error(err);
      setError('Network error retrieving collection.');
      setEditingGroupId(null);
    } finally {
      setLoadingMembers(false);
    }
  };

  // Initialize a new empty collection session
  const handleInitNewCollection = () => {
    setEditingGroupId(null);
    setCollectionDate(today);
    // Maintain current selectedTypeId
    fetchNewFormMembers();
    setError('');
  };

  useEffect(() => {
    fetchCollectionTypes();
    fetchHistory();
    fetchNewFormMembers();
  }, []);

  const handleAmountChange = (userId: string, val: string) => {
    setMembers(prev =>
      prev.map(m => m.userId === userId ? { ...m, localAmount: val } : m)
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTypeId) {
      setError("Please select a collection type.");
      return;
    }
    if (!collectionDate) {
      setError("Please select a collection date.");
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        id: editingGroupId,
        collectionTypeId: Number(selectedTypeId),
        date: collectionDate,
        payments: members
          .map(m => ({
            userId: m.userId,
            amount: parseFloat(m.localAmount) || 0
          }))
          .filter(p => p.amount > 0)
      };

      const res = await fetch('/api/fund-collections/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setToast(editingGroupId ? t('collectionPage.updatedSuccess') : t('collectionPage.postedSuccess'));
        handleInitNewCollection();
        fetchHistory();
        setIsModalOpen(false);
        setTimeout(() => setToast(''), 3000);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to submit collections.');
      }
    } catch (err) {
      console.error(err);
      setError('Network wire error saving collections.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredMembers = members.filter(m =>
    m.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 sm:space-y-8 animate-fade-in text-slate-900 mt-16 sm:mt-20 mb-5 px-3">

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-5 py-4 rounded-xl border border-slate-800 shadow-2xl flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-emerald-400" />
          <div>
            <p className="text-xs font-bold font-headline">{toast}</p>
          </div>
        </div>
      )}

      {/* Header Panel */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <Coins className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            {t('collectionPage.fundTitle')}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('collectionPage.fundSubtitle')}
          </p>
        </div>
        <button
          onClick={() => {
            handleInitNewCollection();
            setIsModalOpen(true);
          }}
          className="px-4 py-2 md:px-5 md:py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-lg md:rounded-xl text-[10px] md:text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-blue-500/10 cursor-pointer flex-shrink-0 font-headline"
        >
          <PlusCircle className="w-4 h-4" />
          <span>{t('collectionPage.recordCollection')}</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-250 text-rose-800 rounded-lg px-4 py-3 text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Full-Width Column: History of Past Collections */}
        <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40">
            <h4 className="text-xs sm:text-sm font-bold font-headline text-slate-900 dark:text-slate-100">{t('collectionPage.pastHistoryTitle')}</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{t('collectionPage.pastHistorySub')}</p>
          </div>

          {loadingHistory ? (
            <div className="py-12 text-center text-xs text-slate-400">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <span>{t('collectionPage.loadingList')}</span>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-slate-450 text-xs italic">
              {t('collectionPage.noEvents')}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-700">
                    <th className="py-2.5 px-4 pl-5 uppercase tracking-wider text-[9px] sm:text-[10px]">{t('collectionPage.typeDate')}</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">{t('collectionPage.totalAmount')}</th>
                    <th className="py-2.5 px-4 pr-5 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">{t('collectionPage.action')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                      <td className="py-3 px-4 pl-5">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{h.typeName}</div>
                        <div className="text-[9px] text-slate-400 font-semibold font-mono mt-0.5 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {h.date}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold font-mono text-slate-900 dark:text-slate-100">
                        ₹{Math.round(h.totalAmount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 pr-5 text-right">
                        <button
                          type="button"
                          onClick={() => handleEditCollection(h.id)}
                          className="p-1 px-2 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-[9px] font-bold text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{t('collectionPage.edit')}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* New/Edit Collection Form in Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40 flex justify-between items-center">
              <div>
                <h4 className="text-xs sm:text-sm font-bold font-headline text-slate-900 dark:text-slate-100">
                  {editingGroupId ? t('collectionPage.editGroupTitle', { id: editingGroupId }) : t('collectionPage.newCollectionTitle')}
                </h4>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {editingGroupId ? t('collectionPage.editGroupSub') : t('collectionPage.newCollectionSub')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Dropdown & Date row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-400">
                    {t('collectionPage.collectionType')}
                  </label>
                  {loadingTypes ? (
                    <div className="h-9 flex items-center text-slate-400 text-xs">{t('collectionPage.loadingTypes')}</div>
                  ) : (
                    <select
                      value={selectedTypeId}
                      onChange={(e) => setSelectedTypeId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                    >
                      {collectionTypes.map((typeItem) => (
                        <option key={typeItem.id} value={typeItem.id} disabled={!typeItem.status && String(typeItem.id) !== selectedTypeId}>
                          {typeItem.typeName} {typeItem.amount !== null && typeItem.amount !== undefined ? `(₹${Number(typeItem.amount).toLocaleString('en-IN')})` : ''} {!typeItem.status ? `(${t('collectionPage.inactive')})` : ''}
                        </option>
                      ))}
                      {collectionTypes.length === 0 && (
                        <option value="">-- {t('collectionPage.noTypesCreated')} --</option>
                      )}
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-450 dark:text-slate-400">
                    {t('collectionPage.collectionDate')}
                  </label>
                  <input
                    required
                    type="date"
                    value={collectionDate}
                    onChange={(e) => setCollectionDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Member search filter */}
              <div className="space-y-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
                  {t('collectionPage.filterMembers')}
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder={t('collectionPage.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
                  />
                </div>
              </div>

              {/* Members inputs list */}
              {loadingMembers ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  <span>{t('collectionPage.syncingMembers')}</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs italic">
                  {t('collectionPage.noActiveMembers')}
                </div>
              ) : (
                <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-150 dark:border-slate-700 sticky top-0 z-10">
                        <th className="py-2 px-3 pl-4 uppercase tracking-wider text-[9px]">{t('collectionPage.member')}</th>
                        <th className="py-2 px-3 uppercase tracking-wider text-[9px]">{t('collectionPage.memberId')}</th>
                        <th className="py-2 px-3 uppercase tracking-wider text-[9px] text-center w-36">{t('collectionPage.amountRs')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900">
                      {filteredMembers.map((member) => (
                        <tr key={member.userId} className="hover:bg-slate-50/20 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                          <td className="py-2 px-3 pl-4 font-bold text-slate-900 dark:text-slate-100 truncate max-w-[150px]">
                            {member.fullName}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-slate-400 text-[10px]">
                            {member.userId}
                          </td>
                          <td className="py-2 px-3">
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-[10px]">₹</span>
                              <input
                                type="number"
                                placeholder="0"
                                value={member.localAmount}
                                onChange={(e) => handleAmountChange(member.userId, e.target.value)}
                                className="w-full pl-6 pr-2 py-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[11px] font-bold focus:outline-none text-tnum text-slate-800 dark:text-slate-200 font-mono"
                              />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Bottom Actions */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="flex items-center gap-1.5 text-slate-450 dark:text-slate-400 text-[10px] font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                  <span>{t('collectionPage.positiveNotice')}</span>
                </div>
                <div className="flex w-full sm:w-auto gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 sm:flex-none px-3 py-1.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                  >
                    {t('collectionPage.cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || filteredMembers.length === 0}
                    className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/10"
                  >
                    {submitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>{editingGroupId ? t('collectionPage.updateSession') : t('collectionPage.postSession')}</span>
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
