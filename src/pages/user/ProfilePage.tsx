import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store';
import { updateUser } from '../../authSlice';
import {
  User,
  Mail,
  Phone,
  Shield,
  Camera,
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  Lock,
  Sparkles,
  Building2,
  Key,
  FileText,
  Landmark,
  Compass,
  Briefcase,
  UserCheck,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type ProfileTab = 'basic' | 'contact' | 'identification' | 'bank' | 'nominee' | 'security';

export default function ProfilePage() {
  const { t } = useTranslation();
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<ProfileTab>('basic');

  // Form State
  const [memberNumber, setMemberNumber] = useState((user as any)?.memberNumber || '');
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [alternateNumber, setAlternateNumber] = useState((user as any)?.alternateNumber || '');
  const [gender, setGender] = useState((user as any)?.gender || 'Male');
  const [dob, setDob] = useState((user as any)?.dob || '');
  const [joiningDate, setJoiningDate] = useState((user as any)?.joiningDate || '');
  const [address, setAddress] = useState((user as any)?.address || '');
  const [country, setCountry] = useState((user as any)?.country || 'India');
  const [state, setState] = useState((user as any)?.state || '');
  const [district, setDistrict] = useState((user as any)?.district || '');
  const [locality, setLocality] = useState((user as any)?.locality || '');
  const [pincode, setPincode] = useState((user as any)?.pincode || '');
  const [idType, setIdType] = useState((user as any)?.idType || 'Aadhaar');
  const [idNumber, setIdNumber] = useState((user as any)?.idNumber || '');
  const [bankName, setBankName] = useState((user as any)?.bankName || '');
  const [bankBranch, setBankBranch] = useState((user as any)?.bankBranch || '');
  const [accountNumber, setAccountNumber] = useState((user as any)?.accountNumber || '');
  const [ifsc, setIfsc] = useState((user as any)?.ifsc || '');
  const [nomineeName, setNomineeName] = useState((user as any)?.nomineeName || '');
  const [relationship, setRelationship] = useState((user as any)?.relationship || 'Spouse');
  const [nomineeContact, setNomineeContact] = useState((user as any)?.nomineeContact || '');
  const [occupation, setOccupation] = useState((user as any)?.occupation || '');
  const [notes, setNotes] = useState((user as any)?.notes || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');

  const [fetchingUser, setFetchingUser] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  useEffect(() => {
    fetchFreshUser();
  }, []);

  const fetchFreshUser = async () => {
    try {
      setFetchingUser(true);
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          dispatch(updateUser(data.user));
          populateUserData(data.user);
        }
      }
    } catch (e) {
      console.error('Failed to refresh user profile from server', e);
    } finally {
      setFetchingUser(false);
    }
  };

  const populateUserData = (u: any) => {
    setMemberNumber(u.memberNumber || '');
    setFullName(u.fullName || '');
    setEmail(u.email || '');
    setPhoneNumber(u.phoneNumber || '');
    setAlternateNumber(u.alternateNumber || '');
    setGender(u.gender || 'Male');
    setDob(u.dob || '');
    setJoiningDate(u.joiningDate || '');
    setAddress(u.address || '');
    setCountry(u.country || 'India');
    setState(u.state || '');
    setDistrict(u.district || '');
    setLocality(u.locality || '');
    setPincode(u.pincode || '');
    setIdType(u.idType || 'Aadhaar');
    setIdNumber(u.idNumber || '');
    setBankName(u.bankName || '');
    setBankBranch(u.bankBranch || '');
    setAccountNumber(u.accountNumber || '');
    setIfsc(u.ifsc || '');
    setNomineeName(u.nomineeName || '');
    setRelationship(u.relationship || 'Spouse');
    setNomineeContact(u.nomineeContact || '');
    setOccupation(u.occupation || '');
    setNotes(u.notes || '');
    setProfileImage(u.profileImage || '');
  };

  // Sync state if Redux user changes
  useEffect(() => {
    if (user) {
      populateUserData(user);
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size < 5120) {
        alert("Photo file size is too small. Minimum required photo size is 5 KB.");
        return;
      }
      if (file.size > 1024 * 1024) {
        alert("Photo file size is too large. Maximum allowed photo size is 1 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setProfileImage(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) {
      setError('Full name and email are required');
      return;
    }
    setSaving(true);
    setSuccess('');
    setError('');

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          memberNumber,
          fullName,
          email,
          phoneNumber,
          alternateNumber,
          gender,
          dob,
          joiningDate,
          address,
          country,
          state,
          district,
          locality,
          pincode,
          idType,
          idNumber,
          bankName,
          bankBranch,
          accountNumber,
          ifsc,
          nomineeName,
          relationship,
          nomineeContact,
          occupation,
          notes,
          profileImage
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      dispatch(updateUser(data.user));
      setSuccess('Your profile details updated successfully.');
    } catch (err: any) {
      setError(err.message || 'An error occurred while updating profile.');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPwdError('All password fields are required');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdError('New password and confirm password do not match');
      return;
    }
    setPwdSaving(true);
    setPwdSuccess('');
    setPwdError('');

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to change password');
      }

      setPwdSuccess('Your security password has been changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPwdError(err.message || 'An error occurred while changing password.');
    } finally {
      setPwdSaving(false);
    }
  };

  return (
    <div className="p-2 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in mt-14 sm:mt-16 max-w-6xl mx-auto pb-16">
      {/* Top Bar Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/60 rounded-xl transition-all cursor-pointer border border-slate-200 dark:border-slate-800"
          >
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <div>
            <h1 className="text-base sm:text-2xl font-bold font-headline text-slate-900 dark:text-slate-100">{t('profilePage.title')}</h1>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400">{t('profilePage.subTitle')}</p>
          </div>
        </div>

        <button
          onClick={fetchFreshUser}
          className="p-2 sm:px-3 sm:py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          title="Refresh Profile"
        >
          <Sparkles className={`w-3.5 h-3.5 text-indigo-500 ${fetchingUser ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Sync Data</span>
        </button>
      </div>

      {/* Profile Header Banner Card */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="h-28 sm:h-36 bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-600 opacity-30 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent"></div>
        </div>

        <div className="px-4 sm:px-8 pb-6 pt-0 relative flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-12 sm:-mt-14">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 text-center sm:text-left">
            {/* Avatar Photo Container */}
            <div className="relative group w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 border-slate-900 bg-slate-950 shadow-2xl flex items-center justify-center shrink-0">
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile Avatar"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <span className="text-3xl sm:text-4xl text-slate-400">👤</span>
              )}

              <label className="absolute inset-0 rounded-full bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer select-none">
                <Camera className="w-5 h-5 mb-1 text-indigo-400" />
                <span className="text-[9px] font-bold uppercase tracking-wider">{t('userPage.upload')}</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>

            <div className="space-y-1 pb-1">
              <h2 className="text-lg sm:text-2xl font-black font-headline text-white tracking-tight flex items-center justify-center sm:justify-start gap-2">
                {fullName || t('profilePage.title')}
                {memberNumber && (
                  <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-mono font-bold">
                    {memberNumber}
                  </span>
                )}
              </h2>
              <p className="text-xs text-indigo-200/80 flex items-center justify-center sm:justify-start gap-3 flex-wrap">
                <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-indigo-400" /> {email}</span>
                <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5 text-indigo-400" /> {phoneNumber || 'N/A'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Selector for Profile Sections */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 text-xs font-bold scrollbar-none">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-3.5 py-2 rounded-xl shrink-0 transition cursor-pointer ${activeTab === 'basic' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}
        >
          {t('userPage.tabBasic')}
        </button>
        <button
          onClick={() => setActiveTab('contact')}
          className={`px-3.5 py-2 rounded-xl shrink-0 transition cursor-pointer ${activeTab === 'contact' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}
        >
          {t('userPage.tabContact')}
        </button>
        <button
          onClick={() => setActiveTab('identification')}
          className={`px-3.5 py-2 rounded-xl shrink-0 transition cursor-pointer ${activeTab === 'identification' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}
        >
          {t('userPage.tabIdentification')}
        </button>
        <button
          onClick={() => setActiveTab('bank')}
          className={`px-3.5 py-2 rounded-xl shrink-0 transition cursor-pointer ${activeTab === 'bank' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}
        >
          {t('userPage.tabBank')}
        </button>
        <button
          onClick={() => setActiveTab('nominee')}
          className={`px-3.5 py-2 rounded-xl shrink-0 transition cursor-pointer ${activeTab === 'nominee' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}
        >
          {t('userPage.tabNominee')}
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={`px-3.5 py-2 rounded-xl shrink-0 transition cursor-pointer ${activeTab === 'security' ? 'bg-indigo-600 text-white shadow' : 'text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'}`}
        >
          {t('profilePage.tabSecurity')}
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab !== 'security' ? (
        <form onSubmit={handleSave} className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
          {success && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* BASIC TAB */}
          {activeTab === 'basic' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fade-in">
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Member Number</label>
                <input
                  type="text"
                  value={memberNumber}
                  onChange={(e) => setMemberNumber(e.target.value)}
                  placeholder="MEM-1001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Full Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Joining Date</label>
                <input
                  type="date"
                  value={joiningDate}
                  onChange={(e) => setJoiningDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* CONTACT TAB */}
          {activeTab === 'contact' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fade-in">
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Mobile Number</label>
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Alternate Number</label>
                <input
                  type="text"
                  value={alternateNumber}
                  onChange={(e) => setAlternateNumber(e.target.value)}
                  placeholder="+91 9123456789"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / House Address"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Locality</label>
                <input
                  type="text"
                  value={locality}
                  onChange={(e) => setLocality(e.target.value)}
                  placeholder="Area / Locality"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">District</label>
                <input
                  type="text"
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  placeholder="District"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">PIN Code</label>
                <input
                  type="text"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value)}
                  placeholder="600001"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* IDENTIFICATION TAB */}
          {activeTab === 'identification' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fade-in">
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">ID Type</label>
                <select
                  value={idType}
                  onChange={(e) => setIdType(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
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
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">ID Number</label>
                <input
                  type="text"
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="ID Number"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* BANK TAB */}
          {activeTab === 'bank' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs animate-fade-in">
              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Bank Name</label>
                <input
                  type="text"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  placeholder="Bank Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Branch Name</label>
                <input
                  type="text"
                  value={bankBranch}
                  onChange={(e) => setBankBranch(e.target.value)}
                  placeholder="Branch Name"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Account Number</label>
                <input
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Account Number"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">IFSC Code</label>
                <input
                  type="text"
                  value={ifsc}
                  onChange={(e) => setIfsc(e.target.value)}
                  placeholder="SBIN0001234"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono font-bold uppercase text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* NOMINEE & OTHER TAB */}
          {activeTab === 'nominee' && (
            <div className="space-y-4 text-xs animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Nominee Name</label>
                  <input
                    type="text"
                    value={nomineeName}
                    onChange={(e) => setNomineeName(e.target.value)}
                    placeholder="Nominee Full Name"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Relationship</label>
                  <select
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
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

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Nominee Contact</label>
                  <input
                    type="text"
                    value={nomineeContact}
                    onChange={(e) => setNomineeContact(e.target.value)}
                    placeholder="+91 9876543210"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-mono text-slate-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Occupation</label>
                  <input
                    type="text"
                    value={occupation}
                    onChange={(e) => setOccupation(e.target.value)}
                    placeholder="Occupation / Profession"
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold text-slate-500 mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional personal notes..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl font-medium text-slate-900 dark:text-white"
                />
              </div>
            </div>
          )}

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/20 transition cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      ) : (
        /* SECURITY TAB */
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-6 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4 animate-fade-in">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-500" />
              <span>Security & Password Credentials</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Change your portal login authentication password</p>
          </div>

          {pwdSuccess && (
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{pwdSuccess}</span>
            </div>
          )}

          {pwdError && (
            <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{pwdError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSave} className="space-y-4">
            <div>
              <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Current Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs sm:text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={pwdSaving}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow transition cursor-pointer disabled:opacity-50"
              >
                {pwdSaving ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
