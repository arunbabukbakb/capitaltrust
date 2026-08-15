import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Plus,
  Search,
  Filter,
  Play,
  Eye,
  Edit3,
  Trash2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  Save,
  MapPin,
  Users,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MeetingTypeOption {
  id: number;
  name: string;
  status: boolean | number;
}

interface MeetingStatusOption {
  id: number;
  name: string;
}

interface GroupOption {
  id: number;
  name: string;
}

interface MeetingRow {
  id: number;
  meetingNo: string;
  meetingDate: string;
  meetingTypeId: number;
  meetingStatusId: number;
  location?: string | null;
  groupId?: number | null;
  note?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  createdBy: string;
  createdAt: string;
  typeName?: string;
  statusName?: string;
  groupName?: string;
  createdByName?: string;
}

export default function MeetingList() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [meetings, setMeetings] = useState<MeetingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Dropdown options for filters and modal
  const [types, setTypes] = useState<MeetingTypeOption[]>([]);
  const [statuses, setStatuses] = useState<MeetingStatusOption[]>([]);
  const [groups, setGroups] = useState<GroupOption[]>([]);

  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // New / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MeetingRow | null>(null);
  const [formSubmitting, setFormSubmitting] = useState(false);

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    meetingDate: getTodayString(),
    meetingTypeId: '',
    location: '',
    groupId: '',
    note: ''
  });

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<MeetingRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const getTenantHeader = (): Record<string, string> => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return { 'x-tenant-id': parts[0] };
    }
    return { 'x-tenant-id': 'demo' };
  };

  const fetchDropdownData = async () => {
    try {
      const headers = getTenantHeader();
      const [typeRes, statusRes, groupRes] = await Promise.all([
        fetch('/api/meeting-types', { headers }),
        fetch('/api/meeting-statuses', { headers }),
        fetch('/api/groups', { headers })
      ]);

      if (typeRes.ok) {
        const typeData = await typeRes.json();
        setTypes(typeData.filter((t: MeetingTypeOption) => Boolean(t.status)));
      }

      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatuses(statusData);
      }

      if (groupRes.ok) {
        const groupData = await groupRes.json();
        setGroups(groupData);
      }
    } catch (err) {
      console.error("Error loading dropdown data:", err);
    }
  };

  const fetchMeetings = async () => {
    setLoading(true);
    setError('');
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('limit', String(limit));
      if (search) queryParams.set('search', search);
      if (selectedType) queryParams.set('meetingTypeId', selectedType);
      if (selectedStatus) queryParams.set('meetingStatusId', selectedStatus);
      if (selectedGroup) queryParams.set('groupId', selectedGroup);
      if (startDate) queryParams.set('startDate', startDate);
      if (endDate) queryParams.set('endDate', endDate);

      const res = await fetch(`/api/meetings?${queryParams.toString()}`, {
        headers: getTenantHeader()
      });

      if (res.ok) {
        const result = await res.json();
        setMeetings(result.data || []);
        setTotalPages(result.pagination?.totalPages || 1);
        setTotalCount(result.pagination?.total || 0);
      } else {
        setError('Failed to fetch meetings list.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching meetings list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdownData();
  }, []);

  useEffect(() => {
    fetchMeetings();
  }, [page, selectedType, selectedStatus, selectedGroup, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMeetings();
  };

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleOpenNewModal = () => {
    setEditingItem(null);
    setFormData({
      meetingDate: getTodayString(),
      meetingTypeId: types.length > 0 ? String(types[0].id) : '',
      location: '',
      groupId: '',
      note: ''
    });
    setShowModal(true);
    setError('');
  };

  const handleOpenEditModal = (item: MeetingRow) => {
    setEditingItem(item);
    setFormData({
      meetingDate: item.meetingDate,
      meetingTypeId: String(item.meetingTypeId),
      location: item.location || '',
      groupId: item.groupId ? String(item.groupId) : '',
      note: item.note || ''
    });
    setShowModal(true);
    setError('');
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.meetingDate) {
      setError('Meeting date is required.');
      return;
    }
    if (!formData.meetingTypeId) {
      setError('Meeting type is required.');
      return;
    }

    setFormSubmitting(true);
    setError('');

    try {
      const url = editingItem ? `/api/meetings/${editingItem.id}` : '/api/meetings';
      const method = editingItem ? 'PUT' : 'POST';

      const bodyPayload = {
        meetingDate: formData.meetingDate,
        meetingTypeId: Number(formData.meetingTypeId),
        location: formData.location.trim() || null,
        groupId: formData.groupId ? Number(formData.groupId) : null,
        note: formData.note.trim() || null
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getTenantHeader() },
        body: JSON.stringify(bodyPayload)
      });

      if (res.ok) {
        const resData = await res.json();
        showToastMsg(editingItem ? 'Meeting updated successfully.' : `Meeting ${resData.meetingNo || ''} created successfully.`);
        setShowModal(false);
        fetchMeetings();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to save meeting.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error saving meeting.');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleStartMeeting = async (item: MeetingRow) => {
    try {
      const res = await fetch(`/api/meetings/${item.id}/start`, {
        method: 'PUT',
        headers: getTenantHeader()
      });
      if (res.ok) {
        navigate(`/meetings/${item.id}`);
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to start meeting.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error starting meeting.');
    }
  };

  const handleDeleteMeeting = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/meetings/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getTenantHeader()
      });
      if (res.ok) {
        showToastMsg(`Meeting ${deleteTarget.meetingNo} deleted successfully.`);
        setDeleteTarget(null);
        fetchMeetings();
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || 'Failed to delete meeting.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error deleting meeting.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 mt-16 sm:mt-20">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Calendar className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white font-headline">{t('meetingPage.title')}</h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {t('meetingPage.subTitle')}
          </p>
        </div>
        <button
          onClick={handleOpenNewModal}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-xs shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{t('meetingPage.newMeeting')}</span>
        </button>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className="flex items-center gap-2 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Error Notification */}
      {error && (
        <div className="flex items-center gap-2 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {/* Search text */}
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search meeting no, location..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Meeting Types</option>
              {types.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {statuses.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          {/* Group Filter */}
          <div>
            <select
              value={selectedGroup}
              onChange={(e) => { setSelectedGroup(e.target.value); setPage(1); }}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">All Groups</option>
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium cursor-pointer"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filter</span>
            </button>
            {(search || selectedType || selectedStatus || selectedGroup || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setSelectedType('');
                  setSelectedStatus('');
                  setSelectedGroup('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">Meeting No.</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Type</th>
                <th className="py-3.5 px-6">Location</th>
                <th className="py-3.5 px-6">Group</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Created By</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <div className="flex justify-center items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin text-indigo-500" />
                      <span>Loading meetings register...</span>
                    </div>
                  </td>
                </tr>
              ) : meetings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No meetings found matching the selected filters.
                  </td>
                </tr>
              ) : (
                meetings.map((item) => {
                  const isScheduled = item.statusName === 'Scheduled';
                  const isCompleted = item.statusName === 'Completed';
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-6 font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {item.meetingNo}
                      </td>
                      <td className="py-3.5 px-6 font-medium">{item.meetingDate}</td>
                      <td className="py-3.5 px-6">
                        <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-medium">
                          {item.typeName || 'Regular'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">
                        {item.location ? (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{item.location}</span>
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-slate-600 dark:text-slate-300 font-medium">
                        {item.groupName ? (
                          <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                            <Users className="w-3 h-3 text-indigo-500" />
                            <span>{item.groupName}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">All Members</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${isScheduled
                            ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                            : isCompleted
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}>
                          {item.statusName || 'Scheduled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-slate-500">{item.createdByName || item.createdBy}</td>
                      <td className="py-3.5 px-6 text-right space-x-2">
                        {isScheduled ? (
                          <>
                            <button
                              onClick={() => handleStartMeeting(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                              title="Start Meeting"
                            >
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Start</span>
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit Meeting"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Delete Meeting"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => navigate(`/meetings/${item.id}`)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>View</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Server-side Pagination Controls */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
          <span className="text-slate-500">
            Showing <span className="font-semibold text-slate-900 dark:text-white">{meetings.length}</span> of{' '}
            <span className="font-semibold text-slate-900 dark:text-white">{totalCount}</span> meetings
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* New Meeting Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold font-headline">
                {editingItem ? t('meetingPage.editMeeting') : t('meetingPage.scheduleMeeting')}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('meetingPage.meetingDate')} *
                  </label>
                  <input
                    type="date"
                    value={formData.meetingDate}
                    onChange={(e) => setFormData({ ...formData, meetingDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    {t('meetingPage.meetingType')} *
                  </label>
                  <select
                    value={formData.meetingTypeId}
                    onChange={(e) => setFormData({ ...formData, meetingTypeId: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    required
                  >
                    <option value="">Select Type</option>
                    {types.map(tItem => (
                      <option key={tItem.id} value={tItem.id}>{tItem.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('meetingPage.location')}
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g. Community Hall, Office, Online"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('meetingPage.groupOptional')}
                </label>
                <select
                  value={formData.groupId}
                  onChange={(e) => setFormData({ ...formData, groupId: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="">None (All Members)</option>
                  {groups.map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  {t('meetingPage.generalNote')}
                </label>
                <textarea
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  placeholder="Additional details or instructions for this meeting..."
                  rows={3}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
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
                  disabled={formSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {formSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingItem ? t('common.save') : t('meetingPage.scheduleMeeting')}</span>
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
            <h3 className="text-base font-bold font-headline mb-2">{t('meetingPage.deleteMeetingTitle')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              Are you sure you want to delete meeting <span className="font-bold text-slate-900 dark:text-white">{deleteTarget.meetingNo}</span>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteMeeting}
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
