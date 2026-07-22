import React, { useState, useEffect } from 'react';
import {
  Mail,
  Server,
  CheckCircle,
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  Send,
  X
} from 'lucide-react';

interface SmtpRecord {
  id: number;
  server: string;
  username: string;
  port: number;
  encryption: string;
  password?: string;
  status: 'Active' | 'Inactive';
}

export default function SmtpSettings() {
  const [smtpList, setSmtpList] = useState<SmtpRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form & Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState<Record<number, boolean>>({});
  const [formShowPassword, setFormShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    server: '',
    username: '',
    port: 587,
    encryption: 'STARTTLS',
    password: '',
    status: 'Inactive' as 'Active' | 'Inactive'
  });
  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<number | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [testSmtpId, setTestSmtpId] = useState<number | null>(null);
  const [testEmailInput, setTestEmailInput] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    fetchSmtpSettings();
  }, []);

  const fetchSmtpSettings = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/smtp');
      if (!res.ok) {
        throw new Error('Failed to fetch SMTP mail server settings.');
      }
      const data = await res.json();
      setSmtpList(data);
    } catch (err: any) {
      setError(err.message || 'Error loading SMTP settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormData({
      server: '',
      username: '',
      port: 587,
      encryption: 'STARTTLS',
      password: '',
      status: smtpList.length === 0 ? 'Active' : 'Inactive'
    });
    setFormShowPassword(false);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (rec: SmtpRecord) => {
    setEditingId(rec.id);
    setFormData({
      server: rec.server,
      username: rec.username,
      port: rec.port,
      encryption: rec.encryption,
      password: rec.password || '',
      status: rec.status
    });
    setFormShowPassword(false);
    setIsModalOpen(true);
  };

  const handleSaveSmtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccessMsg('');

    try {
      const url = editingId ? `/api/super-admin/smtp/${editingId}` : '/api/super-admin/smtp';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save SMTP settings.');
      }

      setSuccessMsg(editingId ? 'SMTP configuration updated successfully.' : 'New SMTP configuration created successfully.');
      setIsModalOpen(false);
      fetchSmtpSettings();
    } catch (err: any) {
      setError(err.message || 'Error saving SMTP setting.');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: number) => {
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/super-admin/smtp/${id}/activate`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to activate SMTP setting.');
      }

      setSuccessMsg('Active SMTP mail configuration updated.');
      fetchSmtpSettings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this SMTP mail configuration?')) {
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/super-admin/smtp/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete SMTP setting.');
      }

      setSuccessMsg('SMTP configuration deleted.');
      fetchSmtpSettings();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleTestConnection = (id: number) => {
    setTestSmtpId(id);
    setTestEmailInput('');
    setIsTestModalOpen(true);
    setError('');
    setSuccessMsg('');
  };

  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testSmtpId || !testEmailInput.trim()) return;

    setTesting(true);
    setError('');
    setSuccessMsg('');
    try {
      const res = await fetch(`/api/super-admin/smtp/${testSmtpId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail: testEmailInput.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'SMTP Connection failed.');
      }
      setSuccessMsg(data.message || `SMTP connection test succeeded! Test mail sent to ${testEmailInput}`);
      setIsTestModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setTesting(false);
    }
  };

  const togglePasswordVisibility = (id: number) => {
    setShowPassword(prev => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="p-3 sm:p-8 space-y-4 sm:space-y-6 max-w-6xl mx-auto animate-fade-in text-slate-200 font-sans">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
        <div>
          <h1 className="text-lg sm:text-2xl font-extrabold font-headline text-white flex items-center gap-2">
            <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400" />
            SMTP Mail Client Settings
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
            Configure mail client settings for system notifications and alerts.{' '}
            <strong className="text-indigo-400 font-bold">Only one configuration is active at a time.</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            onClick={fetchSmtpSettings}
            disabled={loading}
            className="inline-flex items-center justify-center gap-1.5 p-2 sm:px-3 sm:py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer disabled:opacity-50"
            title="Refresh list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition shadow-md cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add SMTP Server</span>
          </button>
        </div>
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

      {/* Main Mail Client Settings Panel */}
      <div className="bg-[#0c101b] border border-slate-800/90 rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-2xl space-y-4 sm:space-y-6 relative overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 sm:pb-4">
          <h2 className="text-sm sm:text-lg font-bold font-headline text-white flex items-center gap-2">
            <Server className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
            Mail Client Configurations
          </h2>
          <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full uppercase font-bold">
            Total: {smtpList.length}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto text-indigo-400" />
            <p className="text-xs">Loading SMTP mail configurations...</p>
          </div>
        ) : smtpList.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-3 bg-[#070b13] border border-slate-800/60 rounded-2xl p-4">
            <Mail className="w-8 h-8 sm:w-10 sm:h-10 mx-auto text-slate-600" />
            <p className="text-xs font-bold text-slate-400">No SMTP server configurations added yet.</p>
            <button
              onClick={handleOpenAddModal}
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow cursor-pointer inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First SMTP Server</span>
            </button>
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {smtpList.map((smtp) => {
              const isActive = smtp.status === 'Active';
              return (
                <div
                  key={smtp.id}
                  className={`relative rounded-xl sm:rounded-2xl p-3.5 sm:p-6 transition border ${
                    isActive
                      ? 'bg-[#0f172a]/90 border-indigo-500/50 shadow-xl ring-1 ring-indigo-500/30'
                      : 'bg-[#070b13] border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  {/* Header & Controls */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-3 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] sm:text-xs font-extrabold uppercase tracking-wider text-slate-300 font-mono">
                        SMTP (ID: #{smtp.id})
                      </span>
                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700/60">
                          Inactive
                        </span>
                      )}
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!isActive && (
                        <button
                          onClick={() => handleActivate(smtp.id)}
                          className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-[10px] sm:text-xs font-bold rounded-lg sm:rounded-xl transition cursor-pointer flex items-center gap-1"
                          title="Set as active SMTP configuration"
                        >
                          <Check className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>Set Active</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleTestConnection(smtp.id)}
                        disabled={testing && testSmtpId === smtp.id}
                        className="px-2.5 py-1 sm:px-3 sm:py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-[10px] sm:text-xs font-semibold rounded-lg sm:rounded-xl transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                        title="Test connection"
                      >
                        <Send className={`w-3 h-3 sm:w-3.5 sm:h-3.5 ${testing && testSmtpId === smtp.id ? 'animate-bounce' : ''}`} />
                        <span>{testing && testSmtpId === smtp.id ? 'Testing...' : 'Test'}</span>
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(smtp)}
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg sm:rounded-xl transition cursor-pointer"
                        title="Edit SMTP settings"
                      >
                        <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>

                      <button
                        onClick={() => handleDelete(smtp.id)}
                        className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg sm:rounded-xl transition cursor-pointer"
                        title="Delete SMTP setting"
                      >
                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Settings Grid (Mobile: 2 cols, Desktop: 5 cols) */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs">
                    <div className="col-span-2 sm:col-span-1">
                      <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-500 mb-0.5">Server name:</span>
                      <span className="font-mono font-bold text-white text-xs sm:text-sm truncate block" title={smtp.server}>
                        {smtp.server}
                      </span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-500 mb-0.5">Username:</span>
                      <span className="font-mono text-cyan-400 font-bold text-xs truncate block" title={smtp.username}>
                        {smtp.username}
                      </span>
                    </div>

                    <div>
                      <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-500 mb-0.5">Port:</span>
                      <span className="font-mono font-bold text-white text-xs">{smtp.port}</span>
                    </div>

                    <div>
                      <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-500 mb-0.5">Encryption:</span>
                      <span className="font-mono font-bold text-slate-300 text-xs uppercase">{smtp.encryption}</span>
                    </div>

                    <div className="col-span-2 sm:col-span-1">
                      <span className="block text-[10px] sm:text-[11px] font-semibold text-slate-500 mb-0.5">Password:</span>
                      <div className="flex items-center gap-1 font-mono text-xs">
                        <span className="text-slate-300 font-bold">
                          {showPassword[smtp.id] ? smtp.password || '••••••••' : '••••••••••••'}
                        </span>
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(smtp.id)}
                          className="p-1 text-slate-500 hover:text-slate-300 cursor-pointer"
                        >
                          {showPassword[smtp.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD / EDIT SMTP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0c101b] border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl p-4 sm:p-6 relative text-slate-200 animate-scale-up">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <header className="mb-4">
              <h3 className="text-base sm:text-lg font-bold font-headline text-white flex items-center gap-2">
                <Server className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                {editingId ? 'Edit SMTP Configuration' : 'Add New SMTP Server'}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Enter your mail server parameters. Active status will deactivate previous configs.
              </p>
            </header>

            <form onSubmit={handleSaveSmtp} className="space-y-3 sm:space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px]">SMTP Server Name / Host</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. dryzen.in or smtp.gmail.com"
                  value={formData.server}
                  onChange={e => setFormData({ ...formData, server: e.target.value })}
                  className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Username / Email Address</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. contact@dryzen.in"
                  value={formData.username}
                  onChange={e => setFormData({ ...formData, username: e.target.value })}
                  className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Port</label>
                  <input
                    type="number"
                    required
                    placeholder="587"
                    value={formData.port}
                    onChange={e => setFormData({ ...formData, port: Number(e.target.value) })}
                    className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Encryption</label>
                  <select
                    value={formData.encryption}
                    onChange={e => setFormData({ ...formData, encryption: e.target.value })}
                    className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-2.5 py-2 text-white font-mono focus:outline-none focus:border-indigo-500"
                  >
                    <option value="STARTTLS">STARTTLS (587)</option>
                    <option value="SSL/TLS">SSL/TLS (465)</option>
                    <option value="None">None (25)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Password</label>
                <div className="relative">
                  <input
                    type={formShowPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter SMTP password"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl pl-3 pr-9 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowPassword(!formShowPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 cursor-pointer"
                  >
                    {formShowPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Status</label>
                <select
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                  className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-semibold focus:outline-none focus:border-indigo-500"
                >
                  <option value="Active">Active (Deactivates others)</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>{editingId ? 'Update' : 'Save'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-[#0c101b] border border-slate-800 rounded-2xl sm:rounded-3xl w-full max-w-md shadow-2xl p-4 sm:p-6 relative text-slate-200 animate-scale-up">
            <button
              onClick={() => setIsTestModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800/60 rounded-full transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <header className="mb-4">
              <h3 className="text-base sm:text-lg font-bold font-headline text-white flex items-center gap-2">
                <Send className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-400" />
                Test SMTP Connection
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                Send a test email to verify your SMTP parameters.
              </p>
            </header>

            <form onSubmit={handleSendTestEmail} className="space-y-3 sm:space-y-4 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1 text-[11px]">Recipient Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. you@example.com"
                  value={testEmailInput}
                  onChange={e => setTestEmailInput(e.target.value)}
                  className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl px-3 py-2 text-white font-mono placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={testing}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {testing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Sending Test...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Mail</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
