import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { updateUser } from '../authSlice';
import { User, Mail, Phone, Shield, Camera, Save, ArrowLeft, CheckCircle, AlertCircle, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState(user?.fullName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [profileImage, setProfileImage] = useState(user?.profileImage || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState('');
  const [pwdError, setPwdError] = useState('');

  // Keep state updated if redux user loads asynchronously
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setProfileImage(user.profileImage || '');
    }
  }, [user]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("The selected image file is too large. Please upload an image smaller than 1MB.");
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
        body: JSON.stringify({ fullName, email, phoneNumber, profileImage }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      dispatch(updateUser(data.user));
      setSuccess('Your profile details have been successfully updated.');
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

      setPwdSuccess('Your password has been changed successfully.');
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
    <div className="p-3 md:p-6 space-y-6 md:space-y-8 animate-fade-in mt-16 max-w-3xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-full transition-all cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-lg md:text-2xl font-bold font-headline text-slate-900 dark:text-slate-100">My Account Profile</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage your personal information, contact credentials, and avatar photo.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-8 transition-colors duration-200">
        
        {/* Profile Image Column */}
        <div className="flex flex-col items-center gap-4 flex-shrink-0 md:w-48">
          <div className="relative group w-32 h-32 rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
            {profileImage ? (
              <img
                src={profileImage}
                alt="Profile Preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl text-slate-400 dark:text-slate-600">👤</span>
            )}
            
            <label className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer select-none">
              <Camera className="w-6 h-6 mb-1" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Upload Photo</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </label>
          </div>
          
          <div className="text-center">
            <span className="text-[9px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold px-2 py-0.5 rounded uppercase tracking-wider">
              {user?.role || 'Member'}
            </span>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">Max upload size is 1MB. (JPEG, PNG formats only)</p>
          </div>
        </div>

        {/* Profile Info Form */}
        <div className="flex-1">
          {success && (
            <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
              <span>{success}</span>
            </div>
          )}
          
          {error && (
            <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-450 mb-1.5">User Account ID</label>
              <input
                type="text"
                readOnly
                value={user?.id || ''}
                className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-mono font-bold text-slate-500 dark:text-slate-450 select-none outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-450 mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="John Doe"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-800 focus:border-slate-950 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-450 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john.doe@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-800 focus:border-slate-950 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-450 mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+1 (555) 555-5555"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-800 focus:border-slate-950 transition-all text-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-950 rounded-lg text-xs font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{saving ? 'Updating...' : 'Save Profile Changes'}</span>
              </button>
            </div>
          </form>
        </div>

      </div>

      {/* Change Password Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-200">
        <div className="mb-4">
          <h4 className="text-sm md:text-base font-bold text-slate-900 dark:text-slate-100 font-headline">Change Password</h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Protect your portal account by configuring a new authentication password.</p>
        </div>

        {pwdSuccess && (
          <div className="mb-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{pwdSuccess}</span>
          </div>
        )}

        {pwdError && (
          <div className="mb-4 p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-600 dark:text-rose-400" />
            <span>{pwdError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSave} className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end">
          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-450 mb-1.5">Current Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-800 focus:border-slate-950 transition-all text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-450 mb-1.5">New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-800 focus:border-slate-950 transition-all text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase font-bold tracking-wider text-slate-500 dark:text-slate-450 mb-1.5">Confirm New Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium focus:outline-none focus:ring-1 focus:ring-slate-950 dark:focus:ring-slate-800 focus:border-slate-950 transition-all text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="md:col-span-3 pt-2">
            <button
              type="submit"
              disabled={pwdSaving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-950 dark:bg-slate-100 hover:bg-slate-900 dark:hover:bg-white text-white dark:text-slate-950 rounded-lg text-xs font-bold shadow-md active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{pwdSaving ? 'Saving...' : 'Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
