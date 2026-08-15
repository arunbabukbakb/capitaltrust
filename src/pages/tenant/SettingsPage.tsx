import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, Save, CheckCircle2, AlertCircle, Loader2, Users, Layers, ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { t } = useTranslation();
  const [oneUserOneGroup, setOneUserOneGroup] = useState<boolean>(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchOrganizationSettings();
  }, []);

  const getSubdomainHeader = (): Record<string, string> => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return { 'x-tenant-id': parts[0] };
    }
    return { 'x-tenant-id': 'demo' };
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchOrganizationSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings/organization', {
        headers: getSubdomainHeader()
      });
      if (res.ok) {
        const data = await res.json();
        if (typeof data.oneUserOneGroup === 'boolean') {
          setOneUserOneGroup(data.oneUserOneGroup);
        }
      }
    } catch (err) {
      console.error('Error fetching organization settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/settings/organization', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getSubdomainHeader()
        },
        body: JSON.stringify({ oneUserOneGroup })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save organization settings.');
      }
      showToast('Organization settings updated successfully.', 'success');
    } catch (err: any) {
      showToast(err.message || 'Error updating settings.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-12 mt-16 sm:mt-20 px-2 sm:px-0 max-w-4xl mx-auto">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 sm:top-6 right-4 sm:right-6 z-50 px-3.5 py-2.5 sm:px-5 sm:py-3.5 rounded-xl border shadow-xl flex items-center gap-2.5 text-xs sm:text-sm font-semibold backdrop-blur-md animate-fade-in ${
          toast.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
        }`}>
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 flex-shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-center gap-3 sm:gap-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-xl shadow-xs">
        <div className="p-2 sm:p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-600 dark:text-indigo-400">
          <Settings className="w-5 h-5 sm:w-7 sm:h-7" />
        </div>
        <div>
          <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('organizationPage.settingsTitle')}</h1>
          <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
            {t('organizationPage.settingsSub')}
          </p>
        </div>
      </div>

      {/* Main Settings Form Card */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 space-y-6 backdrop-blur-xl shadow-xs">
        <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
          <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-500" />
            <span>Group Assignment Policy</span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Control member group membership allocation rules for all users within this organization
          </p>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
            <p className="text-xs font-medium">Loading organization settings...</p>
          </div>
        ) : (
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="p-4 sm:p-5 bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800/80 rounded-xl space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <label className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-indigo-500" />
                    <span>One User Per Group Policy</span>
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    When enabled, a user can only be assigned to a single group. Users already assigned to another group will be excluded when adding members.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOneUserOneGroup(!oneUserOneGroup)}
                  className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    oneUserOneGroup ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      oneUserOneGroup ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  Current Mode: <strong className="text-indigo-600 dark:text-indigo-400">{oneUserOneGroup ? 'Strict Single Group Assignment (1 User = 1 Group)' : 'Multi-Group Assignment Allowed'}</strong>
                </span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Settings</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
