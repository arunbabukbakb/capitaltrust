import React, { useState, useEffect } from 'react';
import { Plus, Edit3, Tag, CheckCircle2, AlertCircle, Save, X, RefreshCw, Trash2, Power } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MeetingType {
  id: number;
  tenantId?: number | null;
  name: string;
  status: boolean | number;
  createdBy?: string;
  createdAt?: string;
}

export default function MeetingTypeMaster() {
  const { t } = useTranslation();
  const [types, setTypes] = useState<MeetingType[]>([]);
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
  const [deleteTarget, setDeleteTarget] = useState<MeetingType | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getTenantHeader = (): Record<string, string> => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return { 'x-tenant-id': parts[0] };
    }
    return { 'x-tenant-id': 'demo' };
  };

  const fetchMeetingTypes = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/meeting-types', { headers: getTenantHeader() });
      if (res.ok) {
        const data = await res.json();
        setTypes(data);
      } else {
        setError('Failed to fetch meeting types.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching meeting types.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetingTypes();
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

  const handleEdit = (item: MeetingType) => {
    setEditingId(item.id);
    setName(item.name);
    setStatus(Boolean(item.status));
    setShowModal(true);
    setError('');
  };

  const handleToggleStatus = async (item: MeetingType) => {
    const isSys = item.tenantId === null || item.tenantId === 0 || item.createdBy === 'system';
    if (isSys) return;

    try {
      const updatedStatus = !Boolean(item.status);
      const res = await fetch(`/api/meeting-types/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getTenantHeader() },
        body: JSON.stringify({ name: item.name, status: updatedStatus })
      });
      if (res.ok) {
        showToastMsg(`Status updated for "${item.name}"`);
        fetchMeetingTypes();
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
      setError('Meeting type name is required.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const url = editingId ? `/api/meeting-types/${editingId}` : '/api/meeting-types';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getTenantHeader() },
        body: JSON.stringify({ name: name.trim(), status })
      });

      if (res.ok) {
        showToastMsg(editingId ? 'Meeting type updated successfully.' : 'Meeting type created successfully.');
        setShowModal(false);
        fetchMeetingTypes();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to save meeting type.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error saving meeting type.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/meeting-types/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getTenantHeader()
      });
      if (res.ok) {
        showToastMsg(`Meeting type "${deleteTarget.name}" deleted.`);
        setDeleteTarget(null);
        fetchMeetingTypes();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to delete meeting type.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error deleting meeting type.');
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
              <Tag className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-headline">{t('meetingPage.typeMasterTitle')}</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('meetingPage.typeMasterSub')}
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ {t('meetingPage.type')}</span>
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
                <th className="py-3.5 px-6">Type Name</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Loading meeting types...</span>
                    </div>
                  </td>
                </tr>
              ) : types.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No meeting types found. Click "+ New Meeting Type" to add one.
                  </td>
                </tr>
              ) : (
                types.map((type) => {
                  const isActive = Boolean(type.status);
                  const isSys = type.tenantId === null || type.tenantId === 0 || type.createdBy === 'system';
                  return (
                    <tr key={type.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-medium text-slate-500">{type.id}</td>
                      <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{type.name}</span>
                          {isSys && (
                            <span className="px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 text-[10px] font-semibold border border-indigo-200 dark:border-indigo-800">
                              System Default
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">
                        <button
                          onClick={() => handleToggleStatus(type)}
                          disabled={isSys}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-colors ${
                            isSys
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
                        {!isSys ? (
                          <>
                            <button
                              onClick={() => handleEdit(type)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Type"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(type)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Delete Type"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[11px] font-medium text-slate-400 italic">Protected</span>
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
                {editingId ? t('meetingPage.editTypeTitle') : t('meetingPage.addTypeTitle')}
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
                  {t('meetingPage.typeName')} *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Regular, Special, Emergency"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="typeStatus"
                  checked={status}
                  onChange={(e) => setStatus(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="typeStatus" className="text-xs font-medium text-slate-700 dark:text-slate-300">
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
            <h3 className="text-base font-bold font-headline mb-2">{t('meetingPage.deleteTypeTitle')}</h3>
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
