import React, { useState, useEffect } from 'react';
import { Search, Download, Printer, Shield, RefreshCw, FileText, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuditRecord {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  openingBalance?: number;
  collectedAmount?: number;
  amount: number;
  date?: string;
}

interface CollectionType {
  id: number;
  typeName: string;
  status: boolean;
  frequency?: string;
  amount?: number | null;
}

export default function CollectionAuditSummary() {
  const { t } = useTranslation();
  const [collectionTypes, setCollectionTypes] = useState<CollectionType[]>([]);
  const [selectedTypeId, setSelectedTypeId] = useState<string>('');
  const [auditRecords, setAuditRecords] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch all collection types (active and inactive) for selection
  const fetchCollectionTypes = async () => {
    setLoadingTypes(true);
    try {
      const res = await fetch('/api/collection-types');
      if (res.ok) {
        const data = await res.json();
        setCollectionTypes(data);
        if (data.length > 0) {
          setSelectedTypeId(String(data[0].id));
        }
      }
    } catch (err) {
      console.error("Fetch collection types error", err);
    } finally {
      setLoadingTypes(false);
    }
  };

  const fetchAuditData = async () => {
    if (!selectedTypeId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/fund-collections/audit?collectionTypeId=${selectedTypeId}`);
      if (res.ok) {
        const data = await res.json();
        setAuditRecords(data);
      }
    } catch (err) {
      console.error("Fetch audit data error", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollectionTypes();
  }, []);

  useEffect(() => {
    fetchAuditData();
  }, [selectedTypeId]);

  const selectedTypeObj = collectionTypes.find(t => String(t.id) === selectedTypeId);

  const filtered = auditRecords.filter(r => 
    r.userId.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalCollected = filtered.reduce((sum, r) => sum + (r.amount || 0), 0);
  const paidMembersCount = filtered.filter(r => r.amount > 0).length;

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in text-slate-900 mt-16 sm:mt-20 mb-5 px-3">
      
      {/* Title Header */}
      <div className="hidden sm:flex justify-between items-center pb-1">
        <h2 className="text-lg font-bold font-headline text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-1.5">
          <FileText className="w-5 h-5 text-slate-950 dark:text-slate-100" />
          {t('collectionPage.auditTitle')}
        </h2>
      </div>

      {/* FILTER & SELECTOR CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-sm grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
            {t('collectionPage.collectionType')}
          </label>
          {loadingTypes ? (
            <div className="h-8 flex items-center text-slate-400 text-xs font-semibold">Loading...</div>
          ) : (
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              disabled={loadingTypes}
              className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 font-bold text-xs focus:ring-2 focus:ring-slate-900 focus:outline-none"
            >
              {collectionTypes.map((typeItem) => (
                <option key={typeItem.id} value={typeItem.id}>
                  {typeItem.typeName} {typeItem.amount !== null && typeItem.amount !== undefined ? `(₹${Number(typeItem.amount).toLocaleString('en-IN')})` : ''} {!typeItem.status ? `(${t('collectionPage.inactive')})` : ''}
                </option>
              ))}
              {collectionTypes.length === 0 && (
                <option value="">-- No categories configured --</option>
              )}
            </select>
          )}
        </div>

        <div className="space-y-1">
          <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
            {t('collectionPage.searchMembers')}
          </label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
            <input
              type="text"
              placeholder={t('collectionPage.auditSearchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* SUMMARY BANNER */}
      <div className="bg-slate-950 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Total Accumulated Fund ({selectedTypeObj?.typeName || 'Selected Type'})
          </span>
          <span className="text-2xl font-black font-mono">
            ₹{Math.round(totalCollected).toLocaleString()}
          </span>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Active Contributors: <span className="text-white font-bold">{paidMembersCount}</span> / {filtered.length}
        </div>
      </div>

      {/* AUDIT LISTING SECTION */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/40">
          <h4 className="text-xs sm:text-sm font-bold font-headline text-slate-900 dark:text-slate-100">{t('collectionPage.auditTitle')}</h4>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{t('collectionPage.pastHistorySub')}</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <span>{t('collectionPage.loadingAudit')}</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            {t('collectionPage.noAuditRecords')}
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 font-bold border-b border-slate-100 dark:border-slate-700">
                    <th className="py-2.5 px-4 pl-6 uppercase tracking-wider text-[9px] sm:text-[10px]">{t('collectionPage.memberDetails')}</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px]">{t('collectionPage.memberId')}</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Opening Bal. (₹)</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Collected (₹)</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Net Total (₹)</th>
                    <th className="py-2.5 px-4 pr-6 uppercase tracking-wider text-[9px] sm:text-[10px] text-center">{t('collectionPage.collectionDate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.map((record) => (
                    <tr key={record.userId} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                      <td className="py-2.5 px-4 pl-6 font-bold text-slate-900 dark:text-slate-100">
                        {record.fullName}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-500 text-tnum">
                        {record.userId}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-600 dark:text-slate-400">
                        ₹{Math.round(record.openingBalance || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono font-semibold text-slate-700 dark:text-slate-300">
                        ₹{Math.round(record.collectedAmount || 0).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono text-slate-950 dark:text-slate-100 text-tnum">
                        ₹{Math.round(record.amount).toLocaleString()}
                      </td>
                      <td className="py-2.5 px-4 pr-6 text-center text-slate-400 font-mono font-semibold">
                        {record.amount > 0 && record.date ? (
                          <span className="text-emerald-700 font-bold text-[9px] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded">
                            {record.date}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View Card List */}
            <div className="block sm:hidden divide-y divide-slate-100">
              {filtered.map((record) => (
                <div key={record.userId} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50/30 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                  <div className="space-y-1">
                    <div className="font-bold text-slate-900">{record.fullName}</div>
                    <div className="text-[9px] text-slate-450 font-semibold font-mono">
                      {record.userId} • {record.email}
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <div className="font-bold font-mono text-slate-950">
                      ₹{Math.round(record.amount).toLocaleString()}
                    </div>
                    {record.amount > 0 && record.date ? (
                      <span className="inline-block px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-800 text-[8px] font-bold border border-emerald-100 font-mono whitespace-nowrap">
                        {record.date}
                      </span>
                    ) : (
                      <span className="inline-block px-1.5 py-0.2 rounded bg-slate-100 text-slate-400 text-[8px] font-bold border border-slate-150 whitespace-nowrap">
                        Unpaid
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
