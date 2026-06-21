import React, { useState, useEffect } from 'react';
import { Search, Download, Printer, Shield, RefreshCw, FileText, CheckCircle } from 'lucide-react';

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
}

export default function CollectionAuditSummary() {
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
    <div className="space-y-4 sm:space-y-8 animate-fade-in text-slate-900 mt-16 sm:mt-20 mb-5 px-3 sm:px-0">
      
      {/* Title Header */}
      <div className="bg-white border border-slate-200/80 rounded-xl md:rounded-2xl p-3.5 sm:p-6 shadow-sm flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-base sm:text-2xl font-bold font-headline text-slate-900 tracking-tight flex items-center gap-1.5">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-slate-955" />
            Collection Audit Summary
          </h2>
          <p className="text-[10px] sm:text-sm text-slate-500 mt-0.5">
            Audit ledger reporting member-wise collection distributions filtered by collection type.
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => window.print()}
            className="w-full sm:w-auto px-3 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-[10px] sm:text-xs font-bold flex items-center justify-center gap-1.5 transition-all text-slate-700 bg-white cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* FILTER & SELECTOR CARD */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1 w-full md:max-w-xs">
          <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
            Collection Type Filter
          </label>
          {loadingTypes ? (
            <div className="h-9 flex items-center text-slate-400 text-xs">Loading categories...</div>
          ) : (
            <select
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs sm:text-sm font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-950/20 focus:border-slate-950 cursor-pointer bg-white"
            >
              {collectionTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.typeName} {!t.status ? '(Inactive)' : ''}
                </option>
              ))}
              {collectionTypes.length === 0 && (
                <option value="">-- No categories configured --</option>
              )}
            </select>
          )}
        </div>

        <div className="space-y-1 w-full md:max-w-xs">
          <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
            Search Contributor
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search member name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:border-slate-950"
            />
          </div>
        </div>
      </div>

      {/* SUMMARY AGGREGATES CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
        <div className="bg-slate-950 text-white rounded-xl p-4 sm:p-5 border border-slate-900 shadow-md">
          <span className="text-[8px] sm:text-[9px] text-slate-400 font-bold uppercase tracking-wider">Total Amount Deposited</span>
          <p className="text-lg sm:text-2xl font-extrabold font-headline mt-1 text-emerald-400 font-mono">
            ₹{Math.round(totalCollected).toLocaleString()}
          </p>
          <span className="text-[8px] text-slate-450 block mt-1">For selected category: {selectedTypeObj?.typeName || 'None'}</span>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between gap-2">
          <div>
            <span className="text-[8px] sm:text-[9px] text-slate-450 font-bold uppercase tracking-wider block">Contributor Coverage</span>
            <p className="text-sm sm:text-xl font-bold font-headline mt-1 text-slate-900">
              {paidMembersCount} of {filtered.length} members paid
            </p>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div 
              className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
              style={{ width: `${filtered.length > 0 ? (paidMembersCount / filtered.length) * 100 : 0}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 sm:p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-[8px] sm:text-[9px] text-slate-455 font-bold uppercase tracking-wider block">Average Contribution</span>
            <p className="text-sm sm:text-xl font-bold font-headline mt-1 text-slate-900 font-mono text-tnum">
              ₹{Math.round(paidMembersCount > 0 ? totalCollected / paidMembersCount : 0).toLocaleString()}
            </p>
          </div>
          <span className="text-[9px] text-slate-400 font-medium block mt-1">Based on active transactions only</span>
        </div>
      </div>

      {/* AUDIT LISTING SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
        <div className="p-3.5 sm:p-4 border-b border-slate-100 bg-slate-50/40">
          <h4 className="text-xs sm:text-sm font-bold font-headline">Audit Trail Ledger</h4>
          <p className="text-[10px] text-slate-500 mt-0.5">Verification sheet of member contributions. Unsubmitted entries appear as 0.</p>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
            <span>Compiling report statistics...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs italic">
            No contributor accounts found or matches search criteria.
          </div>
        ) : (
          <>
            {/* Desktop View Table */}
            <div className="hidden sm:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-505 font-bold border-b border-slate-100">
                    <th className="py-2.5 px-4 pl-6 uppercase tracking-wider text-[9px] sm:text-[10px]">Member</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px]">Member ID</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px]">Email Address</th>
                    <th className="py-2.5 px-4 uppercase tracking-wider text-[9px] sm:text-[10px] text-right">Collection Amount</th>
                    <th className="py-2.5 px-4 pr-6 uppercase tracking-wider text-[9px] sm:text-[10px] text-center">Payment Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filtered.map((record) => (
                    <tr key={record.userId} className="hover:bg-slate-50/30 transition">
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
                <div key={record.userId} className="p-3.5 flex justify-between items-center text-xs hover:bg-slate-50/30 transition">
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
