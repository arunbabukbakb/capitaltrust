import React, { useState, useEffect } from 'react';
import {
  Send,
  Mail,
  Users,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Check,
  Building2,
  FileText,
  Eye,
  Zap
} from 'lucide-react';

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  adminEmail: string;
  isActive: number;
}

export default function SendMailPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);
  const [sendToAll, setSendToAll] = useState(true);
  const [selectedTenantIds, setSelectedTenantIds] = useState<string[]>([]);
  const [tenantSearch, setTenantSearch] = useState('');

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchActiveTenants();
  }, []);

  const fetchActiveTenants = async () => {
    setLoadingTenants(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/tenants');
      if (!res.ok) throw new Error('Failed to fetch tenant list.');
      const data: Tenant[] = await res.json();
      // Filter active tenants with email
      const active = data.filter(t => t.isActive === 1 && t.adminEmail);
      setTenants(active);
    } catch (err: any) {
      setError(err.message || 'Error fetching tenant list.');
    } finally {
      setLoadingTenants(false);
    }
  };

  const toggleSelectTenant = (id: string) => {
    setSelectedTenantIds(prev =>
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const filteredIds = filteredTenants.map(t => t.id);
    const allSelected = filteredIds.every(id => selectedTenantIds.includes(id));
    if (allSelected) {
      setSelectedTenantIds(prev => prev.filter(id => !filteredIds.includes(id)));
    } else {
      setSelectedTenantIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const handleSendMail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!subject.trim()) {
      setError('Please provide an email subject.');
      return;
    }

    if (!message.trim()) {
      setError('Please compose a message body.');
      return;
    }

    if (!sendToAll && selectedTenantIds.length === 0) {
      setError('Please select at least one tenant organization.');
      return;
    }

    const recipientCount = sendToAll ? tenants.length : selectedTenantIds.length;
    if (!window.confirm(`Are you sure you want to send this broadcast email to ${recipientCount} organization(s)?`)) {
      return;
    }

    setSending(true);

    try {
      const res = await fetch('/api/super-admin/send-mail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sendToAll,
          tenantIds: sendToAll ? undefined : selectedTenantIds,
          subject: subject.trim(),
          message: message.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send broadcast email.');
      }

      setSuccessMsg(data.message || 'Email successfully dispatched!');
      setSubject('');
      setMessage('');
      if (!sendToAll) setSelectedTenantIds([]);
    } catch (err: any) {
      setError(err.message || 'Error dispatching broadcast mail.');
    } finally {
      setSending(false);
    }
  };

  const applyTemplatePreset = (presetType: string) => {
    if (presetType === 'maintenance') {
      setSubject('📢 Scheduled System Maintenance Notice');
      setMessage(
        'Dear Tenant Admin,\n\nPlease be advised that scheduled server maintenance will take place on Saturday from 02:00 AM to 04:00 AM IST. During this window, portal services may be briefly interrupted.\n\nThank you for your cooperation.'
      );
    } else if (presetType === 'upgrade') {
      setSubject('✨ Platform Feature Update & Enhancements');
      setMessage(
        'Dear Tenant Admin,\n\nWe are excited to announce new platform feature updates, performance improvements, and enhanced security metrics now live in your workspace portal.\n\nLog in to your workspace dashboard to check out the latest enhancements.'
      );
    } else if (presetType === 'notice') {
      setSubject('⚠️ Important Account Notice');
      setMessage(
        'Dear Tenant Admin,\n\nThis is an official notice regarding your workspace account settings and subscription status. Please review your administrative profile for recent updates.\n\nIf you have any questions, reach out to CapitalTrust Support.'
      );
    }
  };

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.adminEmail.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  return (
    <div className="p-3 sm:p-8 space-y-4 sm:space-y-6 max-w-5xl mx-auto animate-fade-in text-slate-200 font-sans w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-lg sm:text-2xl font-extrabold font-headline text-white flex items-center gap-2">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            <span>Broadcast Email Console</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
            Dispatch announcements, system notices, and broadcast messages to tenant organizations via active SMTP server.
          </p>
        </div>

        <button
          onClick={fetchActiveTenants}
          disabled={loadingTenants}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50 self-end sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingTenants ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 sm:p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSendMail} className="space-y-4 sm:space-y-6">
        {/* Step 1: Audience Selection */}
        <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
          <h2 className="text-sm sm:text-base font-bold text-white font-headline flex items-center gap-2 border-b border-slate-800 pb-3">
            <Users className="w-4 h-4 text-indigo-400" />
            1. Select Audience
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Option A: All Active Tenants */}
            <div
              onClick={() => setSendToAll(true)}
              className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                sendToAll
                  ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                  : 'bg-[#070b13] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="sendAudience"
                checked={sendToAll}
                onChange={() => setSendToAll(true)}
                className="mt-0.5 accent-indigo-500 cursor-pointer"
              />
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                  <span>🌐 All Active Tenants</span>
                  <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                    {tenants.length} Workspaces
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sends common mail to all currently active tenant admin email addresses (`sendToAll = true`).
                </p>
              </div>
            </div>

            {/* Option B: Select Specific Tenants */}
            <div
              onClick={() => setSendToAll(false)}
              className={`p-4 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                !sendToAll
                  ? 'bg-indigo-950/40 border-indigo-500/60 ring-1 ring-indigo-500/30'
                  : 'bg-[#070b13] border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <input
                type="radio"
                name="sendAudience"
                checked={!sendToAll}
                onChange={() => setSendToAll(false)}
                className="mt-0.5 accent-indigo-500 cursor-pointer"
              />
              <div>
                <h4 className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
                  <span>🎯 Select Specific Tenants</span>
                  <span className="text-[10px] font-mono bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                    {selectedTenantIds.length} Selected
                  </span>
                </h4>
                <p className="text-[11px] text-slate-400 mt-1">
                  Pick specific tenant organizations from the checkbox selection list below.
                </p>
              </div>
            </div>
          </div>

          {/* Tenant Multi-Select Box (Shown when sendToAll is false) */}
          {!sendToAll && (
            <div className="mt-4 space-y-3 bg-[#070b13] border border-slate-800 rounded-xl p-3 sm:p-4 animate-fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search tenant organization or email..."
                    value={tenantSearch}
                    onChange={e => setTenantSearch(e.target.value)}
                    className="w-full bg-[#0d1322] border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleSelectAllFiltered}
                  className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg transition shrink-0 cursor-pointer"
                >
                  {filteredTenants.every(t => selectedTenantIds.includes(t.id)) ? 'Deselect All' : 'Select All Filtered'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                {filteredTenants.length === 0 ? (
                  <p className="col-span-full text-center py-4 text-slate-500 text-xs">
                    No active tenants found matching search.
                  </p>
                ) : (
                  filteredTenants.map(t => {
                    const isChecked = selectedTenantIds.includes(t.id);
                    return (
                      <div
                        key={t.id}
                        onClick={() => toggleSelectTenant(t.id)}
                        className={`p-2.5 rounded-lg border cursor-pointer transition flex items-center gap-2.5 ${
                          isChecked
                            ? 'bg-indigo-500/15 border-indigo-500/40 text-white'
                            : 'bg-[#0d1322] border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="accent-indigo-500 cursor-pointer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate">{t.name}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">{t.adminEmail}</p>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Email Content */}
        <div className="bg-[#0d1322] border border-slate-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <h2 className="text-sm sm:text-base font-bold text-white font-headline flex items-center gap-2">
              <FileText className="w-4 h-4 text-indigo-400" />
              2. Compose Broadcast Email
            </h2>

            {/* Template Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              <span className="text-[10px] font-bold text-slate-500 mr-1 shrink-0">Presets:</span>
              <button
                type="button"
                onClick={() => applyTemplatePreset('maintenance')}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-semibold whitespace-nowrap cursor-pointer"
              >
                Maintenance
              </button>
              <button
                type="button"
                onClick={() => applyTemplatePreset('upgrade')}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-semibold whitespace-nowrap cursor-pointer"
              >
                Feature Update
              </button>
              <button
                type="button"
                onClick={() => applyTemplatePreset('notice')}
                className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-[10px] font-semibold whitespace-nowrap cursor-pointer"
              >
                Official Notice
              </button>
            </div>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Email Subject</label>
              <input
                type="text"
                required
                placeholder="e.g. 📢 Important Notice: Scheduled Server Maintenance"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-slate-400 font-semibold text-[11px]">Message Content</label>
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>{showPreview ? 'Hide Preview' : 'Show Live Preview'}</span>
                </button>
              </div>

              <textarea
                required
                rows={6}
                placeholder="Type your broadcast message content here..."
                value={message}
                onChange={e => setMessage(e.target.value)}
                className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl p-3.5 text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans leading-relaxed"
              />
            </div>

            {/* Live Email Preview Box */}
            {showPreview && (
              <div className="mt-3 p-4 bg-[#070b13] border border-slate-800 rounded-xl space-y-3 animate-fade-in">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase tracking-wider block">
                  Live Email Template Preview
                </span>
                <div className="bg-[#0b0f19] border border-slate-800 p-4 rounded-lg space-y-2 text-slate-200">
                  <h4 className="font-bold text-white text-sm border-b border-slate-800 pb-2">
                    {subject || '(Subject line preview)'}
                  </h4>
                  <div className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed py-2">
                    {message || '(Message content preview...)'}
                  </div>
                  <div className="text-[10px] text-slate-500 pt-2 border-t border-slate-800/60">
                    CapitalTrust Platform Administration Console
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Control Footer */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <div className="text-xs text-slate-400 font-medium">
            Recipient Target:{' '}
            <strong className="text-indigo-400">
              {sendToAll ? `All Active (${tenants.length})` : `${selectedTenantIds.length} Selected`}
            </strong>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 shadow-lg cursor-pointer disabled:opacity-50"
          >
            {sending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Dispatching Emails...</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Dispatch Broadcast Email</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
