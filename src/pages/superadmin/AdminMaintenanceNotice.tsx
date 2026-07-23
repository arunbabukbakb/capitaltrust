import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setCompanySettings } from '../../authSlice';
import {
  Wrench,
  Clock,
  MessageSquare,
  Power,
  Save,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Calendar,
  ShieldAlert,
  Info
} from 'lucide-react';

export default function AdminMaintenanceNotice() {
  const dispatch = useDispatch();
  const { companySettings } = useSelector((state: RootState) => state.auth);

  const [companyName, setCompanyName] = useState('CapitalTrust');
  const [companyLogo, setCompanyLogo] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstno, setGstno] = useState('');

  const [ismaintanance, setIsmaintanance] = useState<boolean>(false);
  const [message, setMessage] = useState<string>('');
  const [resumetime, setResumetime] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  const fetchCompanyDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/super-admin/company-details');
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.companyName || 'CapitalTrust');
        setCompanyLogo(data.companyLogo || '');
        setSupportEmail(data.supportEmail || '');
        setSupportPhone(data.supportPhone || '');
        setAddress(data.address || '');
        setGstno(data.gstno || '');
        setIsmaintanance(Boolean(data.ismaintanance));
        setMessage(data.message || '');
        setResumetime(data.resumetime || '');
      }
    } catch (err: any) {
      console.error("Error fetching company details:", err);
      setErrorMsg("Failed to fetch maintenance settings.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/super-admin/company-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyLogo,
          supportEmail,
          supportPhone,
          address,
          gstno,
          ismaintanance,
          message,
          resumetime
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMsg('Maintenance notice settings updated successfully!');
        if (data.companyDetails) {
          dispatch(setCompanySettings(data.companyDetails));
        }
      } else {
        setErrorMsg(data.error || 'Failed to save maintenance settings.');
      }
    } catch (err: any) {
      console.error("Error saving maintenance settings:", err);
      setErrorMsg("Failed to connect to server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const formatPreviewDate = (dateTimeStr: string) => {
    if (!dateTimeStr) return 'Not Specified';
    try {
      const d = new Date(dateTimeStr);
      return isNaN(d.getTime()) ? dateTimeStr : d.toLocaleString(undefined, {
        dateStyle: 'full',
        timeStyle: 'short'
      });
    } catch {
      return dateTimeStr;
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-headline">Maintenance Notice Control</h2>
              <p className="text-xs text-slate-400">
                Manage global server maintenance status, resume schedule, and customer notice messages.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchCompanyDetails}
          disabled={loading}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-start gap-3 text-emerald-400 text-xs font-semibold animate-fade-in">
          <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs font-semibold animate-fade-in">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Status Indicator Banner */}
      <div className={`p-6 rounded-3xl border backdrop-blur-xl transition-all ${
        ismaintanance
          ? 'bg-gradient-to-r from-amber-500/15 via-red-500/10 to-orange-500/15 border-amber-500/30 shadow-lg shadow-amber-500/5'
          : 'bg-slate-900/40 border-slate-800/80'
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              ismaintanance
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 animate-pulse'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400'
            }`}>
              <Power className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">Maintenance Mode Status:</span>
                <span className={`px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider rounded-full border ${
                  ismaintanance
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                    : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                }`}>
                  {ismaintanance ? 'ACTIVE (Server In Maintenance)' : 'INACTIVE (Normal Operation)'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {ismaintanance
                  ? 'All non-admin users visiting the application will see the Maintenance Notice page.'
                  : 'The application is running normally for all registered workspaces and visitors.'}
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={ismaintanance}
              onChange={(e) => setIsmaintanance(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-amber-500"></div>
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Form Card */}
        <div className="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-headline border-b border-slate-800/60 pb-3">
              <ShieldAlert className="w-4 h-4 text-indigo-400" />
              Configure Notice Details
            </h3>

            {/* Toggle Row */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-slate-800/60">
              <div>
                <label htmlFor="isMaintenanceToggle" className="text-xs font-bold text-white block cursor-pointer">
                  Enable Maintenance Mode (<code className="text-amber-400 font-mono">ismaintanance</code>)
                </label>
                <span className="text-[11px] text-slate-400">
                  When toggled ON, users will be redirected to the Maintenance Notice Page.
                </span>
              </div>
              <input
                id="isMaintenanceToggle"
                type="checkbox"
                checked={ismaintanance}
                onChange={(e) => setIsmaintanance(e.target.checked)}
                className="w-5 h-5 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            {/* Maintenance Message */}
            <div className="space-y-2">
              <label htmlFor="maintenanceMsg" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Maintenance Message (<code className="text-cyan-400 font-mono">message</code>)
              </label>
              <textarea
                id="maintenanceMsg"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Server maintenance is currently underway. We are upgrading our databases and optimizing services for better stability..."
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition resize-none font-sans"
              />
              <p className="text-[10px] text-slate-400">
                This custom message will be prominently displayed on the maintenance page to explain the work being performed.
              </p>
            </div>

            {/* Resume Time */}
            <div className="space-y-2">
              <label htmlFor="resumeTimeInput" className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-indigo-400" />
                Estimated Resume Date & Time (<code className="text-indigo-400 font-mono">resumetime</code>)
              </label>
              <input
                id="resumeTimeInput"
                type="datetime-local"
                value={resumetime}
                onChange={(e) => setResumetime(e.target.value)}
                className="w-full px-4 py-3 bg-slate-950/60 border border-slate-800 focus:border-indigo-500/60 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition font-sans cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                Specify when the system is expected to be fully back online.
              </p>
            </div>

            {/* Submit Button */}
            <div className="pt-4 border-t border-slate-800/60 flex items-center justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition cursor-pointer transform hover:-translate-y-0.5 disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Saving Settings...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Maintenance Notice
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Live Preview Card */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-xl shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2 font-headline border-b border-slate-800/60 pb-3">
              <Info className="w-4 h-4 text-amber-400" />
              Live User Notice Preview
            </h3>

            <div className="p-5 rounded-2xl bg-[#090d16] border border-amber-500/20 relative overflow-hidden space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Wrench className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white font-headline">Server Maintenance Underway</h4>
                  <p className="text-[10px] text-amber-400/90 font-medium">CapitalTrust Service Portal</p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 text-xs leading-relaxed">
                {message || <span className="text-slate-500 italic">No custom message specified. Standard maintenance notice will be shown.</span>}
              </div>

              <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  Expected Resume:
                </span>
                <span className="font-bold text-indigo-300 text-[11px]">
                  {formatPreviewDate(resumetime)}
                </span>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 space-y-1 bg-slate-800/20 p-3 rounded-xl border border-slate-800/40">
              <p className="font-semibold text-slate-300">Note for Super Administrators:</p>
              <p>
                Even when Maintenance Mode is ON, Super Admin pages (under <code className="text-indigo-300 font-mono">/admin/*</code>) remain accessible so you can configure or turn off maintenance mode at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
