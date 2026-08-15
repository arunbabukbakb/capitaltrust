import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  Play,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  Coins,
  Receipt,
  Calculator,
  MessageSquare,
  Plus,
  UserCheck,
  ChevronRight,
  Clock,
  Trash2,
  Edit3,
  X,
  Save
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MeetingSummary {
  meeting: {
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
    typeName?: string;
    statusName?: string;
    groupName?: string;
  };
  attendance: {
    total: number;
    present: number;
    absent: number;
    excused: number;
  };
  collections: {
    count: number;
    total: number;
  };
  repayments: {
    count: number;
    principal: number;
    interest: number;
    total: number;
  };
  expenses: {
    count: number;
    total: number;
  };
  discussions: {
    count: number;
  };
}

interface DiscussionTopic {
  id: number;
  title: string;
  description?: string | null;
  discussedBy?: string | null;
  remarks?: string | null;
  createdByName?: string;
  createdAt?: string;
}

export default function MeetingDetails() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState<MeetingSummary | null>(null);
  const [discussions, setDiscussions] = useState<DiscussionTopic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Start / Complete Action loading
  const [actionLoading, setActionLoading] = useState(false);

  // Discussion Modal state
  const [showDiscussionModal, setShowDiscussionModal] = useState(false);
  const [editingDiscussion, setEditingDiscussion] = useState<DiscussionTopic | null>(null);
  const [discForm, setDiscForm] = useState({
    title: '',
    description: '',
    discussedBy: '',
    remarks: ''
  });
  const [discSubmitting, setDiscSubmitting] = useState(false);

  const getTenantHeader = (): Record<string, string> => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return { 'x-tenant-id': parts[0] };
    }
    return { 'x-tenant-id': 'demo' };
  };

  const loadData = async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const headers = getTenantHeader();
      const [sumRes, discRes] = await Promise.all([
        fetch(`/api/meetings/${id}/summary`, { headers }),
        fetch(`/api/meeting-discussions?meetingId=${id}`, { headers })
      ]);

      if (sumRes.ok) {
        const sumJson = await sumRes.json();
        setSummaryData(sumJson);
      } else {
        const errJson = await sumRes.json().catch(() => ({}));
        setError(errJson.error || 'Failed to load meeting details.');
      }

      if (discRes.ok) {
        const discJson = await discRes.json();
        setDiscussions(discJson);
      }
    } catch (err) {
      console.error(err);
      setError('Network error loading meeting details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleStartMeeting = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/meetings/${id}/start`, {
        method: 'PUT',
        headers: getTenantHeader()
      });
      if (res.ok) {
        showToastMsg('Meeting started successfully.');
        loadData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to start meeting.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error starting meeting.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteMeeting = async () => {
    if (!id) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/meetings/${id}/complete`, {
        method: 'PUT',
        headers: getTenantHeader()
      });
      if (res.ok) {
        showToastMsg('Meeting marked as Completed.');
        loadData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to complete meeting.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error completing meeting.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAddDiscussion = () => {
    setEditingDiscussion(null);
    setDiscForm({ title: '', description: '', discussedBy: '', remarks: '' });
    setShowDiscussionModal(true);
  };

  const handleOpenEditDiscussion = (disc: DiscussionTopic) => {
    setEditingDiscussion(disc);
    setDiscForm({
      title: disc.title,
      description: disc.description || '',
      discussedBy: disc.discussedBy || '',
      remarks: disc.remarks || ''
    });
    setShowDiscussionModal(true);
  };

  const handleSaveDiscussion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!discForm.title.trim()) {
      setError('Discussion title is required.');
      return;
    }

    setDiscSubmitting(true);
    try {
      const url = editingDiscussion ? `/api/meeting-discussions/${editingDiscussion.id}` : '/api/meeting-discussions';
      const method = editingDiscussion ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', ...getTenantHeader() },
        body: JSON.stringify({
          meetingId: Number(id),
          title: discForm.title.trim(),
          description: discForm.description.trim() || null,
          discussedBy: discForm.discussedBy.trim() || null,
          remarks: discForm.remarks.trim() || null
        })
      });

      if (res.ok) {
        showToastMsg(editingDiscussion ? 'Discussion updated.' : 'Discussion topic added.');
        setShowDiscussionModal(false);
        loadData();
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to save discussion.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error saving discussion.');
    } finally {
      setDiscSubmitting(false);
    }
  };

  const handleDeleteDiscussion = async (discId: number) => {
    try {
      const res = await fetch(`/api/meeting-discussions/${discId}`, {
        method: 'DELETE',
        headers: getTenantHeader()
      });
      if (res.ok) {
        showToastMsg('Discussion topic deleted.');
        loadData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="flex justify-center items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-xs font-semibold">Loading meeting dashboard...</span>
        </div>
      </div>
    );
  }

  if (!summaryData) {
    return (
      <div className="py-12 max-w-xl mx-auto text-center space-y-4">
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
          {error || 'Meeting not found.'}
        </div>
        <button
          onClick={() => navigate('/meetings')}
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Meetings</span>
        </button>
      </div>
    );
  }

  const { meeting, attendance, collections, repayments, expenses, discussions: discSummary } = summaryData;
  const isScheduled = meeting.statusName === 'Scheduled';
  const isCompleted = meeting.statusName === 'Completed';

  return (
    <div className="space-y-3 sm:space-y-6 max-w-7xl mx-auto pb-12 mt-14 sm:mt-20 px-2 sm:px-0">
      {/* Top Back Navigation */}
      <div>
        <button
          onClick={() => navigate('/meetings')}
          className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{t('common.back', { defaultValue: 'Back to Meeting List' })}</span>
        </button>
      </div>

      {/* Meeting Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
          <div>
            <div className="flex items-center gap-2.5 sm:gap-3">
              <h1 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white font-headline">
                Meeting #{meeting.meetingNo}
              </h1>
              <span className={`inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold ${isScheduled
                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                  : isCompleted
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                    : 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                }`}>
                {meeting.statusName || 'Scheduled'}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 sm:gap-4 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 sm:mt-2">
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{meeting.meetingDate}</span>
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <span className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[10px] sm:text-[11px]">
                  {meeting.typeName || 'Regular'}
                </span>
              </span>
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>{meeting.groupName || 'All Members'}</span>
              </span>
              {meeting.location && (
                <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                  <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{meeting.location}</span>
                </span>
              )}
            </div>
          </div>

          {/* Header Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {!meeting.startedAt && isScheduled && (
              <button
                onClick={handleStartMeeting}
                disabled={actionLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg sm:rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                <span>{t('meetingPage.startMeeting', { defaultValue: 'Start Meeting' })}</span>
              </button>
            )}

            {!isCompleted && (
              <button
                onClick={handleCompleteMeeting}
                disabled={actionLoading}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg sm:rounded-xl text-xs font-semibold shadow-xs transition-all cursor-pointer disabled:opacity-50"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>{t('meetingPage.completeMeeting', { defaultValue: 'Complete Meeting' })}</span>
              </button>
            )}
          </div>
        </div>

        {/* Timestamps & Note */}
        <div className="flex flex-wrap items-center justify-between text-[11px] sm:text-xs text-slate-500 gap-2 sm:gap-4 pt-0.5">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            {meeting.startedAt && (
              <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                <span>Started: {new Date(meeting.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            )}
            {meeting.completedAt && (
              <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Completed: {new Date(meeting.completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </span>
            )}
          </div>
          {meeting.note && (
            <p className="text-slate-600 dark:text-slate-300 italic">
              Note: "{meeting.note}"
            </p>
          )}
        </div>
      </div>

      {/* Notifications / Alerts */}
      {toast && (
        <div className="flex items-center gap-2 p-3 sm:p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 rounded-xl text-xs font-medium">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toast}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 sm:p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Summary Sections Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-5">
        {/* 1. Attendance Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2.5 sm:space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg sm:rounded-xl">
                  <UserCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-headline">{t('meetingPage.attendance', { defaultValue: 'Attendance' })}</h3>
              </div>
            </div>

            {attendance.total === 0 ? (
              <p className="text-[11px] sm:text-xs text-slate-400 py-1 sm:py-2">No attendance recorded yet for this meeting.</p>
            ) : (
              <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-slate-500">Present</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">{attendance.present}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-slate-500">Absent</span>
                  <span className="font-semibold text-rose-600 dark:text-rose-400">{attendance.absent}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-slate-500">Excused</span>
                  <span className="font-semibold text-amber-600 dark:text-amber-400">{attendance.excused}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                  <span>Total</span>
                  <span>{attendance.total}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(`/attendance?meetingId=${id}`)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>Mark / View</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 2. Collections Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2.5 sm:space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="p-1.5 sm:p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-lg sm:rounded-xl">
                  <Coins className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-headline">{t('nav.fund-collection', { defaultValue: 'Collections' })}</h3>
              </div>
            </div>

            {collections.count === 0 ? (
              <p className="text-[11px] sm:text-xs text-slate-400 py-1 sm:py-2">No collections recorded yet.</p>
            ) : (
              <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-slate-500">TXNs</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{collections.count}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                  <span>Collected</span>
                  <span className="text-emerald-600 dark:text-emerald-400">{formatCurrency(collections.total)}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(`/fund-collection?meetingId=${id}`)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 hover:bg-emerald-50 dark:bg-slate-800 dark:hover:bg-emerald-950/50 border border-slate-200 dark:border-slate-700 text-emerald-600 dark:text-emerald-400 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 3. Loan Repayment Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2.5 sm:space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="p-1.5 sm:p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-lg sm:rounded-xl">
                  <Calculator className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-headline">{t('nav.loan-repayments', { defaultValue: 'Repayments' })}</h3>
              </div>
            </div>

            {repayments.count === 0 ? (
              <p className="text-[11px] sm:text-xs text-slate-400 py-1 sm:py-2">No repayments recorded yet.</p>
            ) : (
              <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-slate-500">Principal</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(repayments.principal)}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-slate-500">Interest</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(repayments.interest)}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                  <span>Total</span>
                  <span className="text-blue-600 dark:text-blue-400">{formatCurrency(repayments.total)}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(`/loan-repayments?meetingId=${id}`)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 4. Expenses Summary Card */}
        <div className="bg-white dark:bg-slate-900 p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between space-y-2.5 sm:space-y-4">
          <div>
            <div className="flex items-center justify-between mb-2 sm:mb-3">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="p-1.5 sm:p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-lg sm:rounded-xl">
                  <Receipt className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </span>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white font-headline">{t('nav.expenses', { defaultValue: 'Expenses' })}</h3>
              </div>
            </div>

            {expenses.count === 0 ? (
              <p className="text-[11px] sm:text-xs text-slate-400 py-1 sm:py-2">No expenses recorded yet.</p>
            ) : (
              <div className="space-y-1 sm:space-y-1.5 pt-0.5 sm:pt-1">
                <div className="flex justify-between text-[10px] sm:text-xs">
                  <span className="text-slate-500">TXNs</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{expenses.count}</span>
                </div>
                <div className="flex justify-between text-[10px] sm:text-xs pt-1.5 sm:pt-2 border-t border-slate-100 dark:border-slate-800 font-bold text-slate-900 dark:text-white">
                  <span>Total</span>
                  <span className="text-rose-600 dark:text-rose-400">{formatCurrency(expenses.total)}</span>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={() => navigate(`/expenses?meetingId=${id}`)}
            className="w-full flex items-center justify-between px-2.5 py-1.5 sm:px-3.5 sm:py-2 bg-slate-50 hover:bg-rose-50 dark:bg-slate-800 dark:hover:bg-rose-950/50 border border-slate-200 dark:border-slate-700 text-rose-600 dark:text-rose-400 rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-semibold transition-colors cursor-pointer"
          >
            <span>View All</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 5. Discussions Section */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 sm:p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-lg sm:rounded-xl">
                <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </span>
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-headline">{t('meetingPage.discussions', { defaultValue: 'Discussions' })}</h2>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Record topics, notes, or requests discussed during this meeting.
            </p>
          </div>

          <button
            onClick={handleOpenAddDiscussion}
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg sm:rounded-xl text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t('meetingPage.addDiscussion', { defaultValue: '+ Add Topic' })}</span>
          </button>
        </div>

        {discussions.length === 0 ? (
          <div className="py-6 sm:py-8 text-center text-slate-400 text-[11px] sm:text-xs">
            No discussion topics added yet for this meeting.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 pt-1 sm:pt-2">
            {discussions.map((disc) => (
              <div
                key={disc.id}
                className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 rounded-lg sm:rounded-xl space-y-1.5 sm:space-y-2 relative group"
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">{disc.title}</h4>
                  <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditDiscussion(disc)}
                      className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded cursor-pointer"
                      title="Edit Topic"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteDiscussion(disc.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded cursor-pointer"
                      title="Delete Topic"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {disc.description && (
                  <p className="text-[11px] sm:text-xs text-slate-600 dark:text-slate-300 whitespace-pre-line">
                    {disc.description}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 sm:pt-2 border-t border-slate-200/60 dark:border-slate-700 text-[10px] sm:text-[11px] text-slate-400">
                  {disc.discussedBy && (
                    <span>
                      By: <span className="font-semibold text-slate-700 dark:text-slate-300">{disc.discussedBy}</span>
                    </span>
                  )}
                  {disc.remarks && (
                    <span className="italic">Remarks: {disc.remarks}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Discussion Modal */}
      {showDiscussionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 text-slate-900 dark:text-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-bold font-headline">
                {editingDiscussion ? 'Edit Discussion Topic' : 'Add Discussion Topic'}
              </h3>
              <button
                onClick={() => setShowDiscussionModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDiscussion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={discForm.title}
                  onChange={(e) => setDiscForm({ ...discForm, title: e.target.value })}
                  placeholder="e.g. Monthly collection review, New loan requests"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={discForm.description}
                  onChange={(e) => setDiscForm({ ...discForm, description: e.target.value })}
                  placeholder="Detailed notes on what was discussed..."
                  rows={3}
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Discussed By
                </label>
                <input
                  type="text"
                  value={discForm.discussedBy}
                  onChange={(e) => setDiscForm({ ...discForm, discussedBy: e.target.value })}
                  placeholder="e.g. Secretary, Manager, President"
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Remarks
                </label>
                <input
                  type="text"
                  value={discForm.remarks}
                  onChange={(e) => setDiscForm({ ...discForm, remarks: e.target.value })}
                  placeholder="Follow-up action or decision..."
                  className="w-full px-3.5 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDiscussionModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={discSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-medium shadow-xs disabled:opacity-50 cursor-pointer"
                >
                  {discSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span>{editingDiscussion ? 'Update' : 'Save Topic'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
