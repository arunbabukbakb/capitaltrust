import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Users,
  Mail,
  Phone,
  Shield,
  CheckCircle,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Zap,
  Check,
  Building2,
  Camera,
  Eye,
  FileText,
  UserCheck,
  Landmark,
  Compass,
  Hash,
  Briefcase,
  Calendar,
  Search
} from 'lucide-react';

interface User {
  id: string;
  memberNumber?: string;
  fullName: string;
  email: string;
  username?: string;
  status: boolean;
  roleId: number;
  roleName: string;
  roleType: 'admin' | 'manager' | 'user';
  assignedRoles?: { id: number; roleName: string; roleType: string }[];
  roleIds?: number[];
  phoneNumber?: string;
  alternateNumber?: string;
  gender?: string;
  dob?: string;
  joiningDate?: string;
  address?: string;
  country?: string;
  state?: string;
  district?: string;
  locality?: string;
  pincode?: string;
  idType?: string;
  idNumber?: string;
  bankName?: string;
  bankBranch?: string;
  accountNumber?: string;
  ifsc?: string;
  nomineeName?: string;
  relationship?: string;
  nomineeContact?: string;
  occupation?: string;
  notes?: string;
  profileImage?: string;
}

import { useTranslation } from 'react-i18next';

interface Role {
  id: number;
  roleName: string;
  roleType: 'admin' | 'manager' | 'user';
}

type ModalTab = 'basic' | 'contact' | 'identification' | 'bank' | 'nominee' | 'other';

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Capacity & Pricing
  const [maxUserLimit, setMaxUserLimit] = useState<number>(25);
  const [pricingInfo, setPricingInfo] = useState<{
    blockSize: number;
    blockPrice: number;
    taxPercent: number;
  }>({ blockSize: 5, blockPrice: 0, taxPercent: 18 });
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeBlockCount, setUpgradeBlockCount] = useState<number>(1);
  const [upgrading, setUpgrading] = useState(false);

  // Edit / Add Modal state
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<ModalTab>('basic');
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);

  // Detail View Modal state
  const [viewingUser, setViewingUser] = useState<User | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const getSubdomainHeader = (): Record<string, string> => {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 2 && parts[0] !== 'www') {
      return { 'x-tenant-id': parts[0] };
    }
    return { 'x-tenant-id': 'demo' };
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes, settingsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/settings/company')
      ]);

      if (!usersRes.ok || !rolesRes.ok) throw new Error('Failed to fetch user directory');

      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      setUsers(usersData);
      setRoles(rolesData);

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.tenantDetails?.maxUserLimit != null) {
          setMaxUserLimit(Number(settingsData.tenantDetails.maxUserLimit));
        }
        if (settingsData.pricing) {
          setPricingInfo({
            blockSize: settingsData.pricing.additionalUserBlockSize ?? 5,
            blockPrice: settingsData.pricing.additionalUserBlockPrice ?? 0,
            taxPercent: settingsData.pricing.tax ?? 18
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading directory data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (user: Partial<User> | null = null) => {
    setActiveTab('basic');
    if (user) {
      setCurrentUser({
        ...user,
        roleIds: user.assignedRoles ? user.assignedRoles.map(r => r.id) : (user.roleId ? [user.roleId] : [roles[0]?.id || 1])
      });
    } else {
      setCurrentUser({
        memberNumber: `MEM-${Math.floor(1000 + Math.random() * 9000)}`,
        fullName: '',
        username: '',
        email: '',
        phoneNumber: '',
        alternateNumber: '',
        gender: 'Male',
        dob: '',
        joiningDate: new Date().toISOString().substring(0, 10),
        address: '',
        country: 'India',
        state: '',
        district: '',
        locality: '',
        pincode: '',
        idType: 'Aadhaar',
        idNumber: '',
        bankName: '',
        bankBranch: '',
        accountNumber: '',
        ifsc: '',
        nomineeName: '',
        relationship: 'Spouse',
        nomineeContact: '',
        occupation: '',
        notes: '',
        roleIds: roles.length > 0 ? [roles[0].id] : []
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentUser(null);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size < 5120) {
        alert("Photo file size is too small. Minimum required size is 5 KB.");
        return;
      }
      if (file.size > 1024 * 1024) {
        alert("Photo file size is too large. Maximum allowed size is 1 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCurrentUser(prev => (prev ? { ...prev, profileImage: reader.result as string } : null));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.fullName || !currentUser.email || !currentUser.username || !currentUser.roleIds || currentUser.roleIds.length === 0) return;

    const url = currentUser.id ? `/api/users/${currentUser.id}` : '/api/users';
    const method = currentUser.id ? 'PUT' : 'POST';

    try {
      const payload = {
        ...currentUser,
        roleId: currentUser.roleIds[0]
      };
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to save user');
      }

      await fetchData();
      handleCloseModal();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleApproveUser = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...user,
          status: 1
        }),
      });

      if (!res.ok) throw new Error('Failed to approve user');
      await fetchData();
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(users.filter((u) => u.id !== id));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    }
  };

  const filteredUsers = users.filter((u) =>
    u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.memberNumber && u.memberNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.phoneNumber && u.phoneNumber.includes(searchQuery))
  );

  return (
    <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-12 mt-16 sm:mt-20 px-2 sm:px-0 max-w-full overflow-x-hidden">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800/80 p-4 sm:p-6 rounded-xl sm:rounded-2xl backdrop-blur-xl shadow-xs">
        <div>
          <h1 className="text-base sm:text-2xl font-bold font-headline text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 sm:w-7 sm:h-7 text-indigo-500" />
            <span>{t('userPage.title')}</span>
          </h1>
          <p className="text-[11px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {t('userPage.subTitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="px-3 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-xl text-center">
            <span className="text-[10px] uppercase font-bold text-indigo-500 block">{t('userPage.memberQuota')}</span>
            <span className="text-xs sm:text-sm font-black text-indigo-700 dark:text-indigo-300 font-mono">
              {users.length} / {maxUserLimit}
            </span>
          </div>

          <button
            onClick={() => handleOpenModal(null)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-4 py-2.5 sm:px-5 sm:py-3 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t('userPage.addMember')}</span>
          </button>
        </div>
      </div>

      {/* Search & Directory Controls */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl p-3 sm:p-4 backdrop-blur-xl shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('userPage.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 self-end sm:self-auto">
          {t('userPage.showing')} <strong className="text-slate-900 dark:text-white font-mono">{filteredUsers.length}</strong> {t('userPage.of')} <strong className="text-slate-900 dark:text-white font-mono">{users.length}</strong> {t('userPage.registeredUsers')}
        </div>
      </div>

      {/* User Directory Container */}
      <div className="bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-xl sm:rounded-2xl overflow-hidden backdrop-blur-xl shadow-xs">
        {/* MOBILE CARD VIEW (< 768px) */}
        <div className="block md:hidden divide-y divide-slate-200 dark:divide-slate-800/60 p-2 space-y-2">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-xs">Loading directory...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">No users matching search query</div>
          ) : (
            filteredUsers.map((user) => (
              <div key={user.id} className="p-3 bg-slate-50/50 dark:bg-slate-950/40 rounded-xl border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-xs">
                      {user.profileImage ? (
                        <img src={user.profileImage} alt={user.fullName} className="w-full h-full object-cover" />
                      ) : (
                        user.fullName.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                        {user.fullName}
                        {user.memberNumber && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[9px] font-mono font-bold">
                            {user.memberNumber}
                          </span>
                        )}
                      </h4>
                      <p className="text-[10px] text-slate-500 font-mono">{user.id} • {user.email}</p>
                    </div>
                  </div>

                  <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    user.status ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
                  }`}>
                    {user.status ? 'Active' : 'Pending'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[10px] pt-1 border-t border-slate-200/60 dark:border-slate-800/60 text-slate-600 dark:text-slate-400">
                  <div>
                    <span className="text-slate-400 block font-medium">Role</span>
                    <strong className="text-slate-900 dark:text-white capitalize">{user.roleName || user.roleType}</strong>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-medium">Mobile</span>
                    <strong className="text-slate-900 dark:text-white font-mono">{user.phoneNumber || 'N/A'}</strong>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    onClick={() => setViewingUser(user)}
                    className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-[10px] font-bold flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3 text-indigo-500" /> View
                  </button>

                  <button
                    onClick={() => handleOpenModal(user)}
                    className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded-lg text-[10px] font-bold flex items-center gap-1 border border-indigo-200 dark:border-indigo-800"
                  >
                    <Edit className="w-3 h-3" /> Edit
                  </button>

                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-1 bg-rose-50 text-rose-600 rounded-lg border border-rose-200"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* DESKTOP TABLE VIEW (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="p-4 pl-6 whitespace-nowrap">{t('userPage.memberId')}</th>
                <th className="p-4 whitespace-nowrap">{t('userPage.contactParameters')}</th>
                <th className="p-4 whitespace-nowrap">{t('userPage.genderDob')}</th>
                <th className="p-4 whitespace-nowrap">{t('userPage.assignedRoles')}</th>
                <th className="p-4 whitespace-nowrap">{t('common.status')}</th>
                <th className="p-4 pr-6 text-right whitespace-nowrap">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr><td colSpan={6} className="text-center p-8 text-slate-500">Loading directory...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan={6} className="text-center p-8 text-slate-400">No users found</td></tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <td className="p-4 pl-6 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-300 dark:border-slate-700 flex items-center justify-center font-bold text-xs">
                          {user.profileImage ? (
                            <img src={user.profileImage} alt={user.fullName} className="w-full h-full object-cover" />
                          ) : (
                            user.fullName.substring(0, 2).toUpperCase()
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-1.5">
                            {user.fullName}
                            {user.memberNumber && (
                              <span className="px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-[9px] font-mono font-bold">
                                {user.memberNumber}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">{user.id}</p>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <p className="font-medium text-slate-800 dark:text-slate-200 text-xs">{user.email}</p>
                      <p className="text-xs text-slate-500 font-mono">{user.phoneNumber || 'N/A'}</p>
                    </td>

                    <td className="p-4 whitespace-nowrap text-xs">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{user.gender || 'N/A'}</p>
                      <p className="text-slate-400 font-mono text-[11px]">{user.dob || 'DOB N/A'}</p>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {user.assignedRoles && user.assignedRoles.length > 0 ? (
                          user.assignedRoles.map((r: any) => (
                            <span key={r.id} className={`inline-block px-2.5 py-1 rounded text-xs font-bold capitalize ${
                              r.roleType === 'admin' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' :
                              r.roleType === 'manager' ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                              'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                              {r.roleName}
                            </span>
                          ))
                        ) : (
                          <span className="inline-block px-2.5 py-1 rounded text-xs font-bold capitalize bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400">
                            {user.roleName || user.roleType}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        user.status ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                      }`}>
                        {user.status ? 'Active' : 'Pending'}
                      </span>
                    </td>

                    <td className="p-4 pr-6 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => setViewingUser(user)}
                        className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4 text-indigo-500" />
                      </button>

                      {!user.status && (
                        <button
                          onClick={() => handleApproveUser(user)}
                          className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors cursor-pointer"
                          title="Approve User"
                        >
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}

                      <button
                        onClick={() => handleOpenModal(user)}
                        className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg transition-colors cursor-pointer"
                        title="Edit User"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-lg transition-colors cursor-pointer"
                        title="Delete User"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD / EDIT USER MODAL */}
      {showModal && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-3 sm:p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col p-4 sm:p-6 text-slate-900 dark:text-white animate-scale-in">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3 mb-4">
              <div>
                <h3 className="text-base font-bold font-headline flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-indigo-500" />
                  <span>{currentUser.id ? t('userPage.editMember') : t('userPage.addMember')}</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-medium">{t('userPage.memberDetails')}</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex overflow-x-auto gap-1 border-b border-slate-200 dark:border-slate-800 pb-2 mb-4 no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('basic')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center gap-1.5 ${
                  activeTab === 'basic' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                }`}
              >
                <FileText className="w-3.5 h-3.5" /> {t('userPage.tabBasic')}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('contact')}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition ${activeTab === 'contact' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Contact
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('identification')}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition ${activeTab === 'identification' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Identification
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bank')}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition ${activeTab === 'bank' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Bank Details
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('nominee')}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition ${activeTab === 'nominee' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Nominee
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('other')}
                className={`px-3 py-1.5 rounded-lg shrink-0 transition ${activeTab === 'other' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
              >
                Other
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveUser} className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* TAB 1: BASIC */}
              {activeTab === 'basic' && (
                <div className="space-y-4 animate-fade-in">
                  <div className="flex items-center gap-4 p-3 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800">
                    <div className="relative group w-16 h-16 rounded-full bg-slate-200 dark:bg-slate-800 border-2 border-indigo-500 overflow-hidden flex items-center justify-center shrink-0">
                      {currentUser.profileImage ? (
                        <img src={currentUser.profileImage} alt="Member Photo" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="w-6 h-6 text-slate-400" />
                      )}
                      <label className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-[9px] font-bold cursor-pointer">
                        Upload
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                      </label>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">Member Photo</h4>
                      <p className="text-[10px] text-slate-500">Min size: <strong>5 KB</strong> • Max size: <strong>1 MB</strong></p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                    <div>
                      <label className="block uppercase font-bold text-slate-500 mb-1">Member Number</label>
                      <input
                        type="text"
                        value={currentUser.memberNumber || ''}
                        onChange={(e) => setCurrentUser({ ...currentUser, memberNumber: e.target.value })}
                        placeholder="e.g. MEM-1001"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono font-bold text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block uppercase font-bold text-slate-500 mb-1">Full Name *</label>
                      <input
                        type="text"
                        required
                        value={currentUser.fullName || ''}
                        onChange={(e) => setCurrentUser({ ...currentUser, fullName: e.target.value })}
                        placeholder="John Doe"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block uppercase font-bold text-slate-500 mb-1">Username *</label>
                      <input
                        type="text"
                        required
                        value={currentUser.username || ''}
                        onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
                        placeholder="johndoe"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block uppercase font-bold text-slate-500 mb-1">Email Address *</label>
                      <input
                        type="email"
                        required
                        value={currentUser.email || ''}
                        onChange={(e) => setCurrentUser({ ...currentUser, email: e.target.value })}
                        placeholder="john@example.com"
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block uppercase font-bold text-slate-500 mb-1">Gender</label>
                      <select
                        value={currentUser.gender || 'Male'}
                        onChange={(e) => setCurrentUser({ ...currentUser, gender: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block uppercase font-bold text-slate-500 mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={currentUser.dob || ''}
                        onChange={(e) => setCurrentUser({ ...currentUser, dob: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block uppercase font-bold text-slate-500 mb-1">Joining Date</label>
                      <input
                        type="date"
                        value={currentUser.joiningDate || ''}
                        onChange={(e) => setCurrentUser({ ...currentUser, joiningDate: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                      />
                    </div>

                    <div>
                      <label className="block uppercase font-bold text-slate-500 mb-1">System Role *</label>
                      <select
                        value={currentUser.roleIds ? currentUser.roleIds[0] : (roles[0]?.id || '')}
                        onChange={(e) => setCurrentUser({ ...currentUser, roleIds: [parseInt(e.target.value)] })}
                        className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-bold"
                      >
                        {roles.map((r) => (
                          <option key={r.id} value={r.id}>{r.roleName}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: CONTACT */}
              {activeTab === 'contact' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs animate-fade-in">
                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Mobile Number</label>
                    <input
                      type="text"
                      value={currentUser.phoneNumber || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, phoneNumber: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Alternate Number</label>
                    <input
                      type="text"
                      value={currentUser.alternateNumber || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, alternateNumber: e.target.value })}
                      placeholder="+91 9123456789"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block uppercase font-bold text-slate-500 mb-1">Address</label>
                    <input
                      type="text"
                      value={currentUser.address || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, address: e.target.value })}
                      placeholder="House / Street Address"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Locality</label>
                    <input
                      type="text"
                      value={currentUser.locality || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, locality: e.target.value })}
                      placeholder="Area / Locality"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">District</label>
                    <input
                      type="text"
                      value={currentUser.district || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, district: e.target.value })}
                      placeholder="District"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">State</label>
                    <input
                      type="text"
                      value={currentUser.state || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, state: e.target.value })}
                      placeholder="State"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Country</label>
                    <input
                      type="text"
                      value={currentUser.country || 'India'}
                      onChange={(e) => setCurrentUser({ ...currentUser, country: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">PIN Code</label>
                    <input
                      type="text"
                      value={currentUser.pincode || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, pincode: e.target.value })}
                      placeholder="600001"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: IDENTIFICATION */}
              {activeTab === 'identification' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs animate-fade-in">
                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">ID Type</label>
                    <select
                      value={currentUser.idType || 'Aadhaar'}
                      onChange={(e) => setCurrentUser({ ...currentUser, idType: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="Aadhaar">Aadhaar Card</option>
                      <option value="PAN">PAN Card</option>
                      <option value="Voter ID">Voter ID</option>
                      <option value="Passport">Passport</option>
                      <option value="Driving License">Driving License</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">ID Number</label>
                    <input
                      type="text"
                      value={currentUser.idNumber || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, idNumber: e.target.value })}
                      placeholder="Identification Number"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>
              )}

              {/* TAB 4: BANK DETAILS */}
              {activeTab === 'bank' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs animate-fade-in">
                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={currentUser.bankName || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, bankName: e.target.value })}
                      placeholder="e.g. State Bank of India"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Branch Name</label>
                    <input
                      type="text"
                      value={currentUser.bankBranch || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, bankBranch: e.target.value })}
                      placeholder="Branch Location"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Account Number</label>
                    <input
                      type="text"
                      value={currentUser.accountNumber || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, accountNumber: e.target.value })}
                      placeholder="Account Number"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      value={currentUser.ifsc || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, ifsc: e.target.value })}
                      placeholder="SBIN0001234"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono font-bold uppercase"
                    />
                  </div>
                </div>
              )}

              {/* TAB 5: NOMINEE */}
              {activeTab === 'nominee' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs animate-fade-in">
                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Nominee Name</label>
                    <input
                      type="text"
                      value={currentUser.nomineeName || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, nomineeName: e.target.value })}
                      placeholder="Nominee Full Name"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Relationship</label>
                    <select
                      value={currentUser.relationship || 'Spouse'}
                      onChange={(e) => setCurrentUser({ ...currentUser, relationship: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    >
                      <option value="Spouse">Spouse</option>
                      <option value="Father">Father</option>
                      <option value="Mother">Mother</option>
                      <option value="Son">Son</option>
                      <option value="Daughter">Daughter</option>
                      <option value="Brother">Brother</option>
                      <option value="Sister">Sister</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block uppercase font-bold text-slate-500 mb-1">Nominee Contact Number</label>
                    <input
                      type="text"
                      value={currentUser.nomineeContact || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, nomineeContact: e.target.value })}
                      placeholder="+91 9876543210"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white font-mono"
                    />
                  </div>
                </div>
              )}

              {/* TAB 6: OTHER */}
              {activeTab === 'other' && (
                <div className="space-y-3.5 text-xs animate-fade-in">
                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Occupation</label>
                    <input
                      type="text"
                      value={currentUser.occupation || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, occupation: e.target.value })}
                      placeholder="e.g. Business / Salaried / Self-Employed"
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>

                  <div>
                    <label className="block uppercase font-bold text-slate-500 mb-1">Notes</label>
                    <textarea
                      rows={3}
                      value={currentUser.notes || ''}
                      onChange={(e) => setCurrentUser({ ...currentUser, notes: e.target.value })}
                      placeholder="Additional member remarks or notes..."
                      className="w-full px-3 py-2 border border-slate-300 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Footer Modal Actions */}
              <div className="pt-3 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
                <div className="flex gap-1.5">
                  {activeTab !== 'basic' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: ModalTab[] = ['basic', 'contact', 'identification', 'bank', 'nominee', 'other'];
                        const idx = tabs.indexOf(activeTab);
                        if (idx > 0) setActiveTab(tabs[idx - 1]);
                      }}
                      className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-bold"
                    >
                      Back
                    </button>
                  )}
                  {activeTab !== 'other' && (
                    <button
                      type="button"
                      onClick={() => {
                        const tabs: ModalTab[] = ['basic', 'contact', 'identification', 'bank', 'nominee', 'other'];
                        const idx = tabs.indexOf(activeTab);
                        if (idx < tabs.length - 1) setActiveTab(tabs[idx + 1]);
                      }}
                      className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800"
                    >
                      Next Step
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold shadow"
                  >
                    Save Member
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Full Detail Modal */}
      {viewingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-4 sm:p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setViewingUser(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
              <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden shrink-0 border-2 border-indigo-500 flex items-center justify-center font-bold text-base">
                {viewingUser.profileImage ? (
                  <img src={viewingUser.profileImage} alt={viewingUser.fullName} className="w-full h-full object-cover" />
                ) : (
                  viewingUser.fullName.substring(0, 2).toUpperCase()
                )}
              </div>
              <div>
                <h3 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  {viewingUser.fullName}
                  {viewingUser.memberNumber && (
                    <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300 text-xs font-mono font-bold">
                      {viewingUser.memberNumber}
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500 font-mono">ID: {viewingUser.id} • {viewingUser.email}</p>
              </div>
            </div>

            {/* Details Grid */}
            <div className="space-y-4 text-xs">
              {/* Basic */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">Basic Details</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div><span className="text-slate-400 block">Gender:</span> <strong>{viewingUser.gender || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">Date of Birth:</span> <strong>{viewingUser.dob || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">Joining Date:</span> <strong>{viewingUser.joiningDate || 'N/A'}</strong></div>
                </div>
              </div>

              {/* Contact */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">Contact Details</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <div><span className="text-slate-400 block">Mobile Number:</span> <strong className="font-mono">{viewingUser.phoneNumber || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">Alternate Number:</span> <strong className="font-mono">{viewingUser.alternateNumber || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">Email:</span> <strong>{viewingUser.email}</strong></div>
                  <div className="col-span-2 sm:col-span-3"><span className="text-slate-400 block">Address:</span> <strong>{viewingUser.address || 'N/A'}, {viewingUser.locality || ''}, {viewingUser.district || ''}, {viewingUser.state || ''} {viewingUser.pincode ? `- ${viewingUser.pincode}` : ''}</strong></div>
                </div>
              </div>

              {/* Identification */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">Identification</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-slate-400 block">ID Type:</span> <strong>{viewingUser.idType || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">ID Number:</span> <strong className="font-mono">{viewingUser.idNumber || 'N/A'}</strong></div>
                </div>
              </div>

              {/* Bank Details */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">Bank Details</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div><span className="text-slate-400 block">Bank Name:</span> <strong>{viewingUser.bankName || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">Branch:</span> <strong>{viewingUser.bankBranch || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">Account #:</span> <strong className="font-mono">{viewingUser.accountNumber || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">IFSC:</span> <strong className="font-mono uppercase">{viewingUser.ifsc || 'N/A'}</strong></div>
                </div>
              </div>

              {/* Nominee */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950 rounded-xl space-y-2">
                <h4 className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px]">Nominee Details</h4>
                <div className="grid grid-cols-3 gap-2">
                  <div><span className="text-slate-400 block">Nominee Name:</span> <strong>{viewingUser.nomineeName || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">Relationship:</span> <strong>{viewingUser.relationship || 'N/A'}</strong></div>
                  <div><span className="text-slate-400 block">Contact:</span> <strong className="font-mono">{viewingUser.nomineeContact || 'N/A'}</strong></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingUser(null)}
                className="px-5 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}