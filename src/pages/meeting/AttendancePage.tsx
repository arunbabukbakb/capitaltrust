import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Save,
  RefreshCw,
  ArrowLeft,
  Users,
  Calendar,
  Check,
  XCircle,
  AlertTriangle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface MemberAttendanceRow {
  memberId: string;
  fullName: string;
  email: string;
  attendanceStatus: 'Present' | 'Absent' | 'Excused';
  remarks: string;
}

interface MeetingHeaderInfo {
  id: number;
  meetingNo: string;
  meetingDate: string;
  groupId?: number | null;
  groupName?: string | null;
}

export default function AttendancePage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const meetingId = searchParams.get('meetingId');

  const [meetingInfo, setMeetingInfo] = useState<MeetingHeaderInfo | null>(null);
  const [members, setMembers] = useState<MemberAttendanceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const getTenantHeader = (): Record<string, string> => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return { 'x-tenant-id': parts[0] };
    }
    return { 'x-tenant-id': 'demo' };
  };

  const fetchAttendanceData = async () => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch(`/api/attendance?meetingId=${meetingId}`, {
        headers: getTenantHeader()
      });

      if (res.ok) {
        const data = await res.json();
        setMeetingInfo(data.meeting);
        setMembers(data.members || []);
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to load attendance data.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error fetching attendance.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendanceData();
  }, [meetingId]);

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const handleMarkAllPresent = () => {
    setMembers(prev =>
      prev.map(m => ({ ...m, attendanceStatus: 'Present' }))
    );
    showToastMsg('All members marked as Present.');
  };

  const handleStatusChange = (memberId: string, status: 'Present' | 'Absent' | 'Excused') => {
    setMembers(prev =>
      prev.map(m => (m.memberId === memberId ? { ...m, attendanceStatus: status } : m))
    );
  };

  const handleRemarksChange = (memberId: string, remarks: string) => {
    setMembers(prev =>
      prev.map(m => (m.memberId === memberId ? { ...m, remarks } : m))
    );
  };

  const handleSaveAttendance = async () => {
    if (!meetingId) return;

    setSaving(true);
    setError('');

    try {
      const payload = {
        meetingId: Number(meetingId),
        records: members.map(m => ({
          memberId: m.memberId,
          attendanceStatus: m.attendanceStatus,
          remarks: m.remarks
        }))
      };

      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getTenantHeader() },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        showToastMsg('Attendance saved successfully.');
      } else {
        const errJson = await res.json().catch(() => ({}));
        setError(errJson.error || 'Failed to save attendance.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error saving attendance.');
    } finally {
      setSaving(false);
    }
  };

  // Stats Counters
  const presentCount = members.filter(m => m.attendanceStatus === 'Present').length;
  const absentCount = members.filter(m => m.attendanceStatus === 'Absent').length;
  const excusedCount = members.filter(m => m.attendanceStatus === 'Excused').length;
  const totalMembers = members.length;

  if (!meetingId) {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-12 text-center mt-16 sm:mt-20">
        <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs space-y-4">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-base font-bold font-headline text-slate-900 dark:text-white">Meeting Reference Required</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Attendance can only be recorded within the context of a specific meeting. Please select or open a meeting first.
          </p>
          <button
            onClick={() => navigate('/meetings')}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs"
          >
            <Calendar className="w-4 h-4" />
            <span>Go to Meetings List</span>
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <div className="flex justify-center items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-indigo-500" />
          <span className="text-xs font-semibold">Loading attendance register...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-6 max-w-7xl mx-auto pb-12 mt-14 sm:mt-20 px-2 sm:px-0">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(`/meetings/${meetingId}`)}
          className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          <span>{t('meetingPage.returnToMeeting', { defaultValue: 'Back to Meeting Dashboard' })}</span>
        </button>
      </div>

      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 p-3.5 sm:p-6 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 border-b border-slate-100 dark:border-slate-800 pb-3 sm:pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 sm:p-2 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-lg sm:rounded-xl">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
              </span>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-headline">{t('meetingPage.attendance', { defaultValue: 'Meeting Attendance' })}</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1.5 sm:mt-2">
              <span className="font-semibold text-slate-900 dark:text-white">
                Meeting #{meetingInfo?.meetingNo}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                <span>{meetingInfo?.meetingDate}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                <span>Group: {meetingInfo?.groupName || 'All Members'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleMarkAllPresent}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg sm:rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600" />
              <span>{t('meetingPage.markAllPresent', { defaultValue: 'Mark All Present' })}</span>
            </button>

            <button
              onClick={handleSaveAttendance}
              disabled={saving}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-1.5 sm:px-5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg sm:rounded-xl text-xs font-semibold shadow-xs disabled:opacity-50 cursor-pointer transition-colors"
            >
              {saving ? <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-spin" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
              <span>{t('meetingPage.saveAttendance', { defaultValue: 'Save Attendance' })}</span>
            </button>
          </div>
        </div>

        {/* Stats Counter Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 pt-0.5 sm:pt-1">
          <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg sm:rounded-xl border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] sm:text-[11px] text-slate-500">Total Members</span>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-headline">{totalMembers}</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-emerald-50/60 dark:bg-emerald-950/30 rounded-lg sm:rounded-xl border border-emerald-100 dark:border-emerald-900">
            <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Present</span>
            <p className="text-base sm:text-lg font-bold text-emerald-700 dark:text-emerald-300 font-headline">{presentCount}</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-rose-50/60 dark:bg-rose-950/30 rounded-lg sm:rounded-xl border border-rose-100 dark:border-rose-900">
            <span className="text-[10px] sm:text-[11px] text-rose-600 dark:text-rose-400 font-medium">Absent</span>
            <p className="text-base sm:text-lg font-bold text-rose-700 dark:text-rose-300 font-headline">{absentCount}</p>
          </div>
          <div className="p-2.5 sm:p-3 bg-amber-50/60 dark:bg-amber-950/30 rounded-lg sm:rounded-xl border border-amber-100 dark:border-amber-900">
            <span className="text-[10px] sm:text-[11px] text-amber-600 dark:text-amber-400 font-medium">Excused</span>
            <p className="text-base sm:text-lg font-bold text-amber-700 dark:text-amber-300 font-headline">{excusedCount}</p>
          </div>
        </div>
      </div>

      {/* Notifications */}
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

      {/* Attendance Register Container */}
      <div className="bg-white dark:bg-slate-900 rounded-xl sm:rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
        {/* MOBILE CARD VIEW (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800 p-2 space-y-2">
          {members.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              No active members found for this meeting's scope.
            </div>
          ) : (
            members.map((member) => (
              <div key={member.memberId} className="p-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{member.fullName}</h4>
                    <p className="text-[10px] text-slate-500 font-mono">{member.memberId} {member.email ? `• ${member.email}` : ''}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  {(['Present', 'Absent', 'Excused'] as const).map((st) => {
                    const isSelected = member.attendanceStatus === st;
                    let activeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
                    if (isSelected && st === 'Present') {
                      activeClass = 'bg-emerald-600 text-white font-bold shadow-xs';
                    } else if (isSelected && st === 'Absent') {
                      activeClass = 'bg-rose-600 text-white font-bold shadow-xs';
                    } else if (isSelected && st === 'Excused') {
                      activeClass = 'bg-amber-600 text-white font-bold shadow-xs';
                    }
                    return (
                      <button
                        key={st}
                        type="button"
                        onClick={() => handleStatusChange(member.memberId, st)}
                        className={`py-1.5 rounded-lg text-[11px] font-semibold text-center transition-all cursor-pointer ${activeClass}`}
                      >
                        {st}
                      </button>
                    );
                  })}
                </div>

                <div>
                  <input
                    type="text"
                    value={member.remarks}
                    onChange={(e) => handleRemarksChange(member.memberId, e.target.value)}
                    placeholder="Optional remark..."
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[11px] focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">Member ID</th>
                <th className="py-3.5 px-6">Member Name</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {members.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-400">
                    No active members found for this meeting's scope.
                  </td>
                </tr>
              ) : (
                members.map((member) => (
                  <tr key={member.memberId} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-6 font-mono font-medium text-slate-500">{member.memberId}</td>
                    <td className="py-3.5 px-6 font-semibold text-slate-900 dark:text-white">
                      {member.fullName}
                      {member.email && <span className="block text-[11px] font-normal text-slate-400">{member.email}</span>}
                    </td>
                    <td className="py-3.5 px-6">
                      <div className="flex items-center gap-2">
                        {(['Present', 'Absent', 'Excused'] as const).map((st) => {
                          const isSelected = member.attendanceStatus === st;
                          let activeClass = 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700';
                          if (isSelected && st === 'Present') {
                            activeClass = 'bg-emerald-600 text-white font-bold shadow-xs';
                          } else if (isSelected && st === 'Absent') {
                            activeClass = 'bg-rose-600 text-white font-bold shadow-xs';
                          } else if (isSelected && st === 'Excused') {
                            activeClass = 'bg-amber-600 text-white font-bold shadow-xs';
                          }
                          return (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleStatusChange(member.memberId, st)}
                              className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${activeClass}`}
                            >
                              {st}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td className="py-3.5 px-6">
                      <input
                        type="text"
                        value={member.remarks}
                        onChange={(e) => handleRemarksChange(member.memberId, e.target.value)}
                        placeholder="Optional remark (e.g. Sick, On leave)..."
                        className="w-full max-w-xs px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
