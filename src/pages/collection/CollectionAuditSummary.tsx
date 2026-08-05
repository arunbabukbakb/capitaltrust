import React, { useState, useEffect } from 'react';
import { Search, Download, Printer, Shield, RefreshCw, FileText, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AuditRecord {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
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
              className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950/20 focus:border-slate-950 cursor-pointer bg-white"
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

      {/* SUMMARY AGGREGATES CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
        <div className="col-span-2 md:col-span-1 bg-slate-950 text-white rounded-xl p-3 sm:p-5 border border-slate-900 shadow-md flex items-center justify-between gap-4">
          <div>
            <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Amount Deposited</span>
            <p className="text-lg sm:text-2xl font-extrabold font-headline mt-1 text-emerald-400 font-mono">
              ₹{Math.round(totalCollected).toLocaleString()}
            </p>
            <span className="text-[8px] text-slate-400 block mt-1">For category: {selectedTypeObj?.typeName || 'None'}</span>
          </div>
          <button
            onClick={() => window.print()}
            className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:scale-[0.98] border-0 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all cursor-pointer shadow-md shadow-blue-500/10 font-headline uppercase tracking-wider flex-shrink-0"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between gap-2">
          <div>
            <span className="text-[8px] sm:text-[9px] text-slate-455 md:text-slate-450 font-bold uppercase tracking-wider block">Contributor Coverage</span>
            <p className="text-xs sm:text-lg font-bold font-headline mt-0.5 text-slate-900 leading-tight">
              {paidMembersCount} of {filtered.length} paid
            </p>
          </div>
          <div className="w-full bg-slate-100 h-1 sm:h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${filtered.length > 0 ? (paidMembersCount / filtered.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-3 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8px] sm:text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Average Contribution</span>
            <p className="text-xs sm:text-lg font-bold font-headline mt-0.5 text-slate-900 font-mono text-tnum leading-tight">
              ₹{Math.round(paidMembersCount > 0 ? totalCollected / paidMembersCount : 0).toLocaleString()}
            </p>
          </div>
          <span className="text-[8px] sm:text-[9px] text-slate-400 font-medium block mt-0.5 truncate">Active transactions only</span>
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
                  <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-505 font-bold border-b border-slate-100 dark:border-slate-700">
                    <th className="py-2.5 px-4 pl-6 uppercase tracking-wider text-[9px] sm:text-[10px]">{t('collectionPage.memberDetails')}</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px]">{t('collectionPage.memberId')}</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px]">{t('collectionPage.contact')}</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">{t('collectionPage.totalContributed')}</th>
                    <th className="py-2.5 px-4 pr-6 uppercase tracking-wider text-[9px] sm:text-[10px] text-center">{t('collectionPage.collectionDate')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.map((record) => (
                    <tr key={record.userId} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition">
                      <td className="py-2.5 px-4 pl-6 font-bold text-slate-900">
                        {record.fullName}
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-500 text-tnum">
                        {record.userId}
                      </td>
                      <td className="py-2.5 px-4 text-slate-505 font-semibold">{record.email}</td>
                      <td className="py-2.5 px-4 text-right font-bold font-mono text-slate-950 text-tnum">
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
