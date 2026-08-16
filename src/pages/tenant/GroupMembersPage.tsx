import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Users,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  XCircle,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Layers,
  UserCheck,
  UserPlus,
  ShieldAlert,
  Hash,
  Calendar,
  Edit3,
  BookOpen
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface Group {
  id: number;
  name: string;
  code: string;
  status: string;
}

interface MemberUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  username?: string;
  status?: boolean | number;
  joinedDate?: string;
}

interface AvailableUser {
  id: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  username?: string;
}

export default function GroupMembersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | ''>('');
  const [members, setMembers] = useState<MemberUser[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Search filter for main list
  const [searchQuery, setSearchQuery] = useState('');

  // Add Member Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
  const [oneUserOneGroupPolicy, setOneUserOneGroupPolicy] = useState(true);
  const [loadingAvailable, setLoadingAvailable] = useState(false);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [modalSearch, setModalSearch] = useState('');
  const [adding, setAdding] = useState(false);

  // Edit Member Joined Date Modal State
  const [editDateTarget, setEditDateTarget] = useState<MemberUser | null>(null);
  const [newJoinedDate, setNewJoinedDate] = useState('');
  const [savingDate, setSavingDate] = useState(false);

  // Delete Member Confirmation
  const [deleteTarget, setDeleteTarget] = useState<MemberUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchMembers(Number(selectedGroupId));
    } else {
      setMembers([]);
    }
  }, [selectedGroupId]);

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

  const fetchGroups = async () => {
    setLoadingGroups(true);
    setError('');
    try {
      const res = await fetch('/api/groups', {
        headers: getSubdomainHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch groups list.');
      const data = await res.json();
      setGroups(data);
      if (data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Error loading groups.');
    } finally {
      setLoadingGroups(false);
    }
  };

  const fetchMembers = async (groupId: number) => {
    setLoadingMembers(true);
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        headers: getSubdomainHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch group members.');
      const data = await res.json();
      setMembers(data);
    } catch (err: any) {
      showToast(err.message || 'Error fetching members.', 'error');
    } finally {
      setLoadingMembers(false);
    }
  };

  const handleOpenAddModal = async () => {
    if (!selectedGroupId) return;

    setIsModalOpen(true);
    setSelectedUserIds([]);
    setModalSearch('');
    setLoadingAvailable(true);

    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/available-users`, {
        headers: getSubdomainHeader()
      });
      if (!res.ok) throw new Error('Failed to fetch available users.');
      const data = await res.json();
      setAvailableUsers(data.users || []);
      setOneUserOneGroupPolicy(Boolean(data.oneUserOneGroup));
    } catch (err: any) {
      showToast(err.message || 'Error loading available users.', 'error');
    } finally {
      setLoadingAvailable(false);
    }
  };

  const handleToggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAllAvailable = () => {
    if (selectedUserIds.length === filteredAvailableUsers.length) {
      setSelectedUserIds([]);
    } else {
      setSelectedUserIds(filteredAvailableUsers.map(u => u.id));
    }
  };

  const handleAddMembers = async () => {
    if (!selectedGroupId || selectedUserIds.length === 0) return;

    setAdding(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getSubdomainHeader()
        },
        body: JSON.stringify({ userIds: selectedUserIds })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add members.');

      showToast(`Successfully added ${selectedUserIds.length} member(s) to the group.`, 'success');
      setIsModalOpen(false);
      fetchMembers(Number(selectedGroupId));
    } catch (err: any) {
      showToast(err.message || 'Error adding members.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleOpenEditDateModal = (member: MemberUser) => {
    setEditDateTarget(member);
    if (member.joinedDate) {
      const d = new Date(member.joinedDate);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        setNewJoinedDate(`${yyyy}-${mm}-${dd}`);
      } else {
        setNewJoinedDate(member.joinedDate.substring(0, 10));
      }
    } else {
      const today = new Date().toISOString().substring(0, 10);
      setNewJoinedDate(today);
    }
  };

  const handleSaveJoinedDate = async () => {
    if (!selectedGroupId || !editDateTarget || !newJoinedDate) return;

    setSavingDate(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/members/${editDateTarget.id}/joined-date`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getSubdomainHeader()
        },
        body: JSON.stringify({ joinedDate: newJoinedDate })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update joined date.');

      showToast(`Joined date for "${editDateTarget.fullName}" updated successfully.`, 'success');
      setEditDateTarget(null);
      fetchMembers(Number(selectedGroupId));
    } catch (err: any) {
      showToast(err.message || 'Error updating joined date.', 'error');
    } finally {
      setSavingDate(false);
    }
  };

  const handleRemoveMember = async () => {
    if (!selectedGroupId || !deleteTarget) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/members/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: getSubdomainHeader()
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to remove member.');

      showToast(`Member "${deleteTarget.fullName}" removed from group.`, 'success');
      setDeleteTarget(null);
      fetchMembers(Number(selectedGroupId));
    } catch (err: any) {
      showToast(err.message || 'Error removing member.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const formatDateDisplay = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const selectedGroupObj = groups.find(g => g.id === Number(selectedGroupId));

  const filteredMembers = members.filter(m =>
    m.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.email && m.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredAvailableUsers = availableUsers.filter(u =>
    u.fullName.toLowerCase().includes(modalSearch.toLowerCase()) ||
    u.id.toLowerCase().includes(modalSearch.toLowerCase()) ||
    (u.email && u.email.toLowerCase().includes(modalSearch.toLowerCase()))
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-12 mt-16 sm:mt-20 px-2 sm:px-0 max-w-full overflow-x-hidden">
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-4">
          <div className="p-2 sm:p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-lg sm:rounded-xl text-indigo-600 dark:text-indigo-400">
            <UserCheck className="w-5 h-5 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-base sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t('organizationPage.membersTitle')}</h1>
            <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium">
              {t('organizationPage.membersSub')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => selectedGroupId && fetchMembers(Number(selectedGroupId))}
            disabled={loadingMembers || !selectedGroupId}
            className="p-2 sm:p-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg sm:rounded-xl text-slate-700 dark:text-slate-300 transition cursor-pointer disabled:opacity-50"
            title="Refresh List"
          >
            <RefreshCw className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${loadingMembers ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenAddModal}
            disabled={!selectedGroupId}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2 sm:px-5 sm:py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-lg sm:rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
          >
            <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>{t('organizationPage.addMembers')}</span>
          </button>
        </div>
      </div>

      {/* Controls Bar & Group Selector */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-4 sm:p-6 backdrop-blur-xl shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
          {/* Group Dropdown */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              <span>{t('organizationPage.selectGroup')}</span>
            </label>
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value ? Number(e.target.value) : '')}
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
            >
              {loadingGroups ? (
                <option value="">Loading groups...</option>
              ) : groups.length === 0 ? (
                <option value="">No groups configured</option>
              ) : (
                groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code}) - {g.status}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Search Box */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">{t('organizationPage.searchMembers')}</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('organizationPage.searchMemberPlaceholder')}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {selectedGroupObj && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5" /> {selectedGroupObj.code}
              </span>
              <span className="text-slate-700 dark:text-slate-300 font-bold">{selectedGroupObj.name}</span>
            </div>
            <span className="font-semibold text-slate-500 dark:text-slate-400">
              {t('organizationPage.totalAssignedMembers')}: <strong className="text-slate-900 dark:text-white font-mono">{members.length}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Main Members Container */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl overflow-hidden backdrop-blur-xl shadow-xs">
        {/* MOBILE APP CARD VIEW (< 640px) */}
        <div className="block sm:hidden divide-y divide-slate-200 dark:divide-slate-800/60 p-2">
          {loadingMembers ? (
            <div className="py-12 text-center text-slate-400">
              <Loader2 className="w-6 h-6 text-indigo-500 animate-spin mx-auto mb-2" />
              <p className="text-xs">Loading members...</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">No members assigned to this group</p>
              <p className="text-[10px] text-slate-500 mt-1">Click "Add Members" to assign users.</p>
            </div>
          ) : (
            filteredMembers.map((m) => (
              <div key={m.id} className="p-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl my-2 border border-slate-200/80 dark:border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                      {m.fullName}
                      <span className="text-[9px] font-mono text-slate-400 font-normal">({m.id})</span>
                    </h4>
                    <p className="text-[10px] text-slate-500 font-medium">{m.email}</p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleOpenEditDateModal(m)}
                      className="p-1.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-500/20 shrink-0"
                      title="Edit Joined Date"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => setDeleteTarget(m)}
                      className="p-1.5 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-lg border border-rose-500/20 shrink-0"
                      title="Remove Member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 text-indigo-500" /> Joined Date:
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-200 font-mono">
                    {formatDateDisplay(m.joinedDate)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800/80 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-bold">
              <tr>
                <th className="py-4 px-6 whitespace-nowrap">Member ID</th>
                <th className="py-4 px-6 whitespace-nowrap">Full Name</th>
                <th className="py-4 px-6 whitespace-nowrap">Email Address</th>
                <th className="py-4 px-6 whitespace-nowrap">Joined Date</th>
                <th className="py-4 px-6 text-right pr-8 whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {loadingMembers ? (
                <tr>
                  <td colSpan={5} className="py-16 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      <p className="text-sm font-medium">Loading group members...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredMembers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-9 h-9 text-slate-400 dark:text-slate-600 mb-1" />
                      <p className="text-sm font-bold text-slate-700 dark:text-slate-300">No members assigned to this group</p>
                      <p className="text-xs text-slate-500">
                        Click "Add Members" above to select and assign members.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredMembers.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4.5 px-6 font-mono font-bold text-slate-900 dark:text-white text-xs whitespace-nowrap">
                      {m.id}
                    </td>

                    <td className="py-4.5 px-6 font-bold text-slate-900 dark:text-white text-sm whitespace-nowrap">
                      {m.fullName}
                    </td>

                    <td className="py-4.5 px-6 text-slate-600 dark:text-slate-400 text-xs whitespace-nowrap">
                      {m.email}
                    </td>

                    <td className="py-4.5 px-6 text-xs whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-700 dark:text-slate-300 font-semibold">
                          {formatDateDisplay(m.joinedDate)}
                        </span>
                        <button
                          onClick={() => handleOpenEditDateModal(m)}
                          className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded transition"
                          title="Edit Joined Date"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>

                    <td className="py-4.5 px-6 text-right pr-8 whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/members/${m.id}/passbook`)}
                          className="p-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-600 dark:text-emerald-400 transition cursor-pointer"
                          title="Member Passbook"
                        >
                          <BookOpen className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleOpenEditDateModal(m)}
                          className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 rounded-xl text-indigo-600 dark:text-indigo-400 transition cursor-pointer"
                          title="Edit Joined Date"
                        >
                          <Calendar className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => setDeleteTarget(m)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-rose-600 dark:text-rose-400 transition cursor-pointer"
                          title="Remove Member from Group"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Members Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xl bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden p-4 sm:p-6 space-y-4 max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-500">
                  <UserPlus className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {t('organizationPage.addMembersTitle')}
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('organizationPage.selectUsersSub')}</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Policy Badge Alert */}
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 font-medium ${
              oneUserOneGroupPolicy
                ? 'bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300'
                : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-700 dark:text-indigo-300'
            }`}>
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>
                {oneUserOneGroupPolicy
                  ? 'Policy Active: Showing only users who are NOT assigned to any group (1 User = 1 Group).'
                  : 'Multi-group Policy: Showing all users except existing group members.'}
              </span>
            </div>

            {/* Search Filter & Select All */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  placeholder={t('organizationPage.filterUsersPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs font-medium text-slate-900 dark:text-white"
                />
              </div>

              <button
                type="button"
                onClick={handleSelectAllAvailable}
                disabled={filteredAvailableUsers.length === 0}
                className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700"
              >
                {selectedUserIds.length === filteredAvailableUsers.length && filteredAvailableUsers.length > 0 ? t('organizationPage.deselectAll') : t('organizationPage.selectAll')}
              </button>
            </div>

            {/* Users List Box */}
            <div className="flex-1 overflow-y-auto border border-slate-200 dark:border-slate-800 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 max-h-64 p-1">
              {loadingAvailable ? (
                <div className="py-8 text-center text-slate-400">
                  <Loader2 className="w-5 h-5 text-indigo-500 animate-spin mx-auto mb-1" />
                  <p className="text-xs">Loading eligible users...</p>
                </div>
              ) : filteredAvailableUsers.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  <p className="text-xs font-bold">No eligible users found to add</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">
                    {oneUserOneGroupPolicy
                      ? 'All workspace users are currently assigned to groups under 1 User = 1 Group policy.'
                      : 'All eligible users are already members of this group.'}
                  </p>
                </div>
              ) : (
                filteredAvailableUsers.map((u) => {
                  const isChecked = selectedUserIds.includes(u.id);
                  return (
                    <div
                      key={u.id}
                      onClick={() => handleToggleUserSelection(u.id)}
                      className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition ${
                        isChecked ? 'bg-indigo-50 dark:bg-indigo-950/40 border-l-4 border-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-900/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{u.fullName}</p>
                          <p className="text-[10px] text-slate-500 font-mono">{u.id} • {u.email}</p>
                        </div>
                      </div>

                      <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold">
                        {isChecked ? 'Selected' : ''}
                      </span>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                Selected: <strong className="text-indigo-600 dark:text-indigo-400">{selectedUserIds.length}</strong>
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={adding}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                >
                  {t('common.cancel')}
                </button>

                <button
                  type="button"
                  onClick={handleAddMembers}
                  disabled={adding || selectedUserIds.length === 0}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>{t('organizationPage.adding')}</span>
                    </>
                  ) : (
                    <span>{t('organizationPage.addSelectedMembers')}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Joined Date Modal */}
      {editDateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-500">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">{t('organizationPage.modifyJoinedDate')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Member: {editDateTarget.fullName}</p>
                </div>
              </div>
              <button
                onClick={() => setEditDateTarget(null)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400">
                {t('organizationPage.joinedDate')}
              </label>
              <input
                type="date"
                value={newJoinedDate}
                onChange={(e) => setNewJoinedDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditDateTarget(null)}
                disabled={savingDate}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                {t('common.cancel')}
              </button>

              <button
                type="button"
                onClick={handleSaveJoinedDate}
                disabled={savingDate || !newJoinedDate}
                className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow transition disabled:opacity-50 cursor-pointer"
              >
                {savingDate ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{t('organizationPage.saving')}</span>
                  </>
                ) : (
                  <span>{t('organizationPage.saveJoinedDate')}</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Member Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-white dark:bg-[#0b0f19] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">{t('organizationPage.removeMemberTitle')}</h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Remove member <strong className="text-slate-900 dark:text-white">"{deleteTarget.fullName}"</strong> from group <strong className="text-indigo-600 dark:text-indigo-400">"{selectedGroupObj?.name}"</strong>?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs sm:text-sm font-bold transition"
              >
                {t('common.cancel')}
              </button>

              <button
                onClick={handleRemoveMember}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('organizationPage.removing')}</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>{t('organizationPage.removeMemberBtn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
