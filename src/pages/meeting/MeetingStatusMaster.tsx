import React, { useState, useEffect } from 'react';
import { Plus, Edit3, CheckSquare, CheckCircle2, AlertCircle, Save, X, RefreshCw, Trash2, Power, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MeetingStatusItem {
  id: number;
  name: string;
  isDefault: boolean | number;
  isSystem: boolean | number;
  status: boolean | number;
  createdAt?: string;
}

export default function MeetingStatusMaster() {
  const { t } = useTranslation();
  const [statuses, setStatuses] = useState<MeetingStatusItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Form State
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [status, setStatus] = useState(true);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<MeetingStatusItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getTenantHeader = (): Record<string, string> => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return { 'x-tenant-id': parts[0] };
    }
    return { 'x-tenant-id': 'demo' };
  };

  const fetchMeetingStatuses = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/meeting-statuses', { headers: getTenantHeader() });
      if (res.ok) {
        const data = await res.json();
        setStatuses(data);
      } else {
        setError('Failed to fetch meeting statuses.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching meeting statuses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingStatuses();
  }, []);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setStatus(true);
    setShowModal(true);
    setError('');
  };

  const handleEdit = (item: MeetingStatusItem) => {
    if (Boolean(item.isSystem)) {
      setError('System default statuses (Scheduled, Postponed, Completed) cannot be modified.');
      return;
    }
    setEditingId(item.id);
    setName(item.name);
    setStatus(Boolean(item.status));
    setShowModal(true);
    setError('');
  };

  const handleToggleStatus = async (item: MeetingStatusItem) => {
    if (Boolean(item.isSystem)) {
      setError('System default statuses cannot be deactivated.');
      return;
    }
    try {
      const updatedStatus = !Boolean(item.status);
      const res = await fetch(`/api/meeting-statuses/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getTenantHeader() },
        body: JSON.stringify({ name: item.name, status: updatedStatus })
      });
      if (res.ok) {
        showToastMsg(`Status updated for "${item.name}"`);
        fetchMeetingStatuses();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to update status.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error updating status.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Meeting status name is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const url = editingId ? `/api/meeting-statuses/${editingId}` : '/api/meeting-statuses';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getTenantHeader() },
        body: JSON.stringify({ name: name.trim(), status })
      });

      if (res.ok) {
        showToastMsg(editingId ? 'Meeting status updated successfully.' : 'Meeting status created successfully.');
        setShowModal(false);
        fetchMeetingStatuses();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to save meeting status.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error saving meeting status.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    if (Boolean(deleteTarget.isSystem)) {
      setError('System default statuses cannot be deleted.');
      setDeleteTarget(null);
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/meeting-statuses/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getTenantHeader()
      });
      if (res.ok) {
        showToastMsg(`Meeting status "${deleteTarget.name}" deleted.`);
        setDeleteTarget(null);
        fetchMeetingStatuses();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to delete meeting status.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error deleting meeting status.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 mt-16 sm:mt-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <CheckSquare className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-headline">{t('meetingPage.statusMasterTitle')}</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('meetingPage.statusMasterSub')}
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ {t('meetingPage.status')}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">ID</th>
                <th className="py-3.5 px-6">Status Name</th>
                <th className="py-3.5 px-6">Type</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Loading meeting statuses...</span>
                    </div>
                  </td>
                </tr>
              ) : statuses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No meeting statuses found. Click "+ New Custom Status" to add one.
                  </td>
                </tr>
              ) : (
                statuses.map((item) => {
                  const isSys = Boolean(item.isSystem);
                  const isActive = Boolean(item.status);
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-medium text-slate-500">{item.id}</td>
                      <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                        <span>{item.name}</span>
                        {Boolean(item.isDefault) && (
                          <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] rounded-md font-semibold">
                            Default
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        {isSys ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 rounded-full text-[11px] font-semibold">
                            <Lock className="w-3 h-3" />
                            <span>System</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-full text-[11px] font-semibold">
                            User-defined
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          disabled={isSys}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${isSys
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-not-allowed opacity-90'
                              : isActive
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 cursor-pointer'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 cursor-pointer'
                            }`}
                        >
                          <Power className="w-3 h-3" />
                          <span>{isActive ? 'Active' : 'Inactive'}</span>
                        </button>
                      </td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        {isSys ? (
                          <span className="text-xs text-slate-400 italic">Protected</span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleEdit(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Status"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Delete Status"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold font-headline">
                {editingId ? t('meetingPage.editStatusTitle') : t('meetingPage.addStatusTitle')}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('meetingPage.statusName')} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cancelled, Rescheduled"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="statusActive"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="statusActive" className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  {t('meetingPage.activeStatus')}
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingId ? t('common.save') : t('common.save')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-sm w-full p-6 text-slate-900 dark:text-white">
            <h3 className="text-base font-bold font-headline mb-2">{t('meetingPage.deleteStatusTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-white">"{deleteTarget.name}"</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
              >
                {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                <span>{t('common.delete')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
