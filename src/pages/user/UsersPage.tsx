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
  Check
} from 'lucide-react';

interface User {
  id: string;
  fullName: string;
  email: string;
  username?: string;
  phoneNumber?: string;
  status: boolean;
  roleId: number;
  roleName: string;
  roleType: 'admin' | 'manager' | 'user';
  assignedRoles?: { id: number; roleName: string; roleType: string }[];
  roleIds?: number[];
}

interface Role {
  id: number;
  roleName: string;
  roleType: 'admin' | 'manager' | 'user';
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<Partial<User> | null>(null);

  // Tenant User Quota & Pricing State
  const [maxUserLimit, setMaxUserLimit] = useState(25);
  const [pricingInfo, setPricingInfo] = useState<{
    defaultUserLimit: number;
    additionalUserBlockSize: number;
    additionalUserBlockPrice: number;
    tax: number;
  } | null>(null);

  // Upgrade Modal State
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [selectedBlocks, setSelectedBlocks] = useState(1);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState('');
  const [upgradeSuccess, setUpgradeSuccess] = useState('');

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
            defaultUserLimit: Number(settingsData.pricing.defaultUserLimit) || 25,
            additionalUserBlockSize: Number(settingsData.pricing.additionalUserBlockSize) || 5,
            additionalUserBlockPrice: Number(settingsData.pricing.additionalUserBlockPrice) || 0,
            tax: Number(settingsData.pricing.tax) || 0
          });
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error loading user management.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenUpgradeModal = async () => {
    setShowUpgradeModal(true);
    try {
      const settingsRes = await fetch('/api/settings/company');
      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        if (sData.pricing) {
          setPricingInfo({
            defaultUserLimit: Number(sData.pricing.defaultUserLimit) || 25,
            additionalUserBlockSize: Number(sData.pricing.additionalUserBlockSize) || 5,
            additionalUserBlockPrice: Number(sData.pricing.additionalUserBlockPrice) || 0,
            tax: Number(sData.pricing.tax) || 0
          });
        }
      }
    } catch (e) {}
  };

  const handleOpenModal = (user: Partial<User> | null = null) => {
    const defaultRole = roles.find(r => r.roleType === 'user');
    if (user) {
      const assignedIds = user.assignedRoles ? user.assignedRoles.map((r: any) => r.id) : (user.roleId ? [user.roleId] : []);
      setCurrentUser({
        ...user,
        roleIds: assignedIds
      });
    } else {
      if (users.length >= maxUserLimit) {
        alert(`User limit reached (${users.length}/${maxUserLimit}). Please upgrade your member quota to add new users.`);
        handleOpenUpgradeModal();
        return;
      }

      setCurrentUser({
        fullName: '',
        email: '',
        username: '',
        phoneNumber: '',
        roleIds: defaultRole ? [defaultRole.id] : []
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentUser(null);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !currentUser.fullName || !currentUser.email || !currentUser.username || !currentUser.roleIds || currentUser.roleIds.length === 0) return;

    const url = currentUser.id ? `/api/users/${currentUser.id}` : '/api/users';
    const method = currentUser.id ? 'PUT' : 'POST';

    try {
      const payload = {
        ...currentUser,
        roleId: currentUser.roleIds[0],
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
    if (window.confirm(`Are you sure you want to approve ${user.fullName}?`)) {
      try {
        const res = await fetch(`/api/users/${user.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...user, status: true }),
        });
        if (!res.ok) throw new Error('Failed to approve user');
        await fetchData();
      } catch (err) { alert('Error approving user.'); }
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await fetch(`/api/users/${id}`, { method: 'DELETE' });
        await fetchData();
      } catch (err) {
        alert('Error deleting user.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (currentUser) {
      const { name, value } = e.target;
      setCurrentUser({ ...currentUser, [name]: name === 'roleId' ? parseInt(value) : value });
    }
  };

  // Load Razorpay Checkout SDK
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // Handle Member Limit Upgrade Payment
  const handleUpgradePayment = async () => {
    setUpgrading(true);
    setUpgradeError('');
    setUpgradeSuccess('');

    try {
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        throw new Error("Razorpay SDK failed to load. Please check your internet connection.");
      }

      // 1. Create upgrade order
      const orderRes = await fetch('/api/tenants/upgrade/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks: selectedBlocks })
      });

      const orderData = await orderRes.json();
      if (!orderRes.ok) {
        throw new Error(orderData.error || 'Failed to initialize member upgrade transaction.');
      }

      if (typeof orderData.blockPrice !== 'undefined') {
        setPricingInfo(prev => ({
          defaultUserLimit: prev?.defaultUserLimit || 25,
          additionalUserBlockSize: orderData.blockSize || prev?.additionalUserBlockSize || 5,
          additionalUserBlockPrice: Number(orderData.blockPrice) || 0,
          tax: typeof orderData.taxPercent !== 'undefined' ? Number(orderData.taxPercent) : (prev?.tax || 0)
        }));
      }

      // 2. Razorpay Checkout Setup
      const options = {
        key: orderData.isMock ? "rzp_test_dummyKeyId1234" : orderData.keyId,
        amount: Math.round(orderData.amount * 100),
        currency: orderData.currency || "INR",
        name: "CapitalTrust",
        description: `Member Quota Upgrade (+${orderData.addedMembers} Users)`,
        order_id: orderData.isMock ? undefined : orderData.orderId,
        prefill: orderData.prefill || {},
        handler: async function (response: any) {
          setUpgrading(true);
          try {
            const verifyRes = await fetch('/api/tenants/upgrade/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id || orderData.orderId,
                razorpay_payment_id: response.razorpay_payment_id || `pay_mock_${Date.now()}`,
                razorpay_signature: response.razorpay_signature || "mock_signature",
                blocks: selectedBlocks,
                isMock: orderData.isMock
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok) {
              throw new Error(verifyData.error || 'Failed to verify upgrade payment signature.');
            }

            setUpgradeSuccess(verifyData.message || 'Member quota successfully upgraded!');
            if (verifyData.maxUserLimit) {
              setMaxUserLimit(verifyData.maxUserLimit);
            }
            setTimeout(() => {
              setShowUpgradeModal(false);
              setUpgradeSuccess('');
              fetchData();
            }, 1800);
          } catch (err: any) {
            setUpgradeError(err.message || 'Payment verification failed.');
          } finally {
            setUpgrading(false);
          }
        },
        modal: {
          ondismiss: function () {
            setUpgrading(false);
          }
        }
      };

      // Mock Checkout Trigger for dev test
      if (orderData.isMock && !(window as any).Razorpay) {
        const verifyRes = await fetch('/api/tenants/upgrade/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_order_id: orderData.orderId,
            razorpay_payment_id: `pay_mock_${Date.now()}`,
            razorpay_signature: `sig_mock_${Date.now()}`,
            blocks: selectedBlocks,
            isMock: true
          })
        });

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) {
          throw new Error(verifyData.error || 'Failed to verify mock payment.');
        }

        setUpgradeSuccess(verifyData.message || 'Member quota successfully upgraded!');
        if (verifyData.maxUserLimit) {
          setMaxUserLimit(verifyData.maxUserLimit);
        }
        setTimeout(() => {
          setShowUpgradeModal(false);
          setUpgradeSuccess('');
          fetchData();
        }, 1500);
        return;
      }

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      setUpgradeError(err.message || 'Error processing payment upgrade.');
    } finally {
      setUpgrading(false);
    }
  };

  const blockSize = pricingInfo?.additionalUserBlockSize || 5;
  const blockPrice = pricingInfo?.additionalUserBlockPrice || 0;
  const taxPercent = pricingInfo?.tax || 0;
  const addedMembersCount = selectedBlocks * blockSize;
  const baseCost = selectedBlocks * blockPrice;
  const taxAmount = baseCost * (taxPercent / 100);
  const totalCost = baseCost + taxAmount;

  const isLimitReached = users.length >= maxUserLimit;

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-8 animate-fade-in mt-16 max-w-7xl mx-auto">
      {/* Top Title & Member Limit Quota Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold font-headline text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            User Management
          </h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Add, manage, and assign role access permissions for portal members.
          </p>
        </div>

        {/* Action Controls & Quota Status */}
        <div className="flex items-center gap-3">
          {/* Quota Badge & Upgrade Button */}
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl">
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">Member Quota</span>
              <span className={`text-xs font-mono font-extrabold ${isLimitReached ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {users.length} / {maxUserLimit} Users
              </span>
            </div>

            <button
              onClick={handleOpenUpgradeModal}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-lg shadow-md transition cursor-pointer"
              title="Upgrade Member Limit"
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Upgrade</span>
            </button>
          </div>

          <button
            onClick={() => handleOpenModal()}
            className="px-4 py-2 bg-slate-950 dark:bg-indigo-600 text-white rounded-xl text-xs font-bold shadow hover:bg-slate-900 dark:hover:bg-indigo-500 transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New User</span>
          </button>
        </div>
      </div>

      {/* Quota Limit Alert Header */}
      {isLimitReached && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-rose-700 dark:text-rose-400 text-xs sm:text-sm font-semibold">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <span>
              <strong>Organization Quota Reached:</strong> You have reached your default maximum limit of {maxUserLimit} members. Upgrade your plan to add more team members.
            </span>
          </div>
          <button
            onClick={handleOpenUpgradeModal}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs shrink-0 transition cursor-pointer"
          >
            Upgrade Capacity Now
          </button>
        </div>
      )}

      {/* Main Users Table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr className="text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 pl-6 uppercase tracking-wider text-[10px]">User</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Contact</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Assigned Role</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Status</th>
                <th className="p-4 pr-6 uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
              {loading ? (
                <tr><td colSpan={5} className="text-center p-8 text-slate-500">Loading users...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="text-center p-8 text-rose-500">{error}</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-900 dark:text-white">{user.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono">{user.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-800 dark:text-slate-200">{user.username}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {user.assignedRoles && user.assignedRoles.length > 0 ? (
                          user.assignedRoles.map((r: any) => (
                            <span key={r.id} className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${r.roleType === 'admin' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' :
                              r.roleType === 'manager' ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                                'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                              }`}>
                              {r.roleName}
                            </span>
                          ))
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${user.roleType === 'admin' ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400' :
                            user.roleType === 'manager' ? 'bg-blue-50 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400' :
                              'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                            }`}>
                            {user.roleName || user.roleType}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${user.status ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
                        }`}>
                        {user.status ? 'Active' : 'Pending Approval'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right space-x-2">
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

      {/* User Add / Edit Modal */}
      {showModal && currentUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 dark:border-slate-800 relative">
            <button onClick={handleCloseModal} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white">
              <X className="w-5 h-5" />
            </button>
            <h4 className="text-lg font-bold font-headline text-slate-900 dark:text-white">
              {currentUser.id ? 'Edit User' : 'Add New User'}
            </h4>
            <form onSubmit={handleSaveUser} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={currentUser.fullName || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Username</label>
                <input
                  type="text"
                  name="username"
                  value={currentUser.username || ''}
                  onChange={handleInputChange}
                  required
                  disabled={!!currentUser.id}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={currentUser.email || ''}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1">Assigned Role</label>
                <select
                  name="roleId"
                  value={currentUser.roleIds ? currentUser.roleIds[0] : (roles[0]?.id || '')}
                  onChange={(e) => setCurrentUser({ ...currentUser, roleIds: [parseInt(e.target.value)] })}
                  className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{r.roleName}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade Member Limit & Razorpay Checkout Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold font-headline text-slate-900 dark:text-white">
                  Upgrade Member Capacity
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Current Quota: <strong>{maxUserLimit} Users</strong>. Upgrade in blocks of <strong>{blockSize} members</strong>.
                </p>
              </div>
            </div>

            {upgradeError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{upgradeError}</span>
              </div>
            )}

            {upgradeSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold rounded-xl flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                <span>{upgradeSuccess}</span>
              </div>
            )}

            {/* Block Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase text-slate-500">
                Select Member Upgrade Pack
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map((num) => {
                  const membersAdded = num * blockSize;
                  const isSelected = selectedBlocks === num;
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setSelectedBlocks(num)}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-500/10 border-indigo-500 text-indigo-900 dark:text-white font-bold ring-2 ring-indigo-500/30'
                          : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <span className="text-sm font-extrabold block">+{membersAdded} Users</span>
                      <span className="text-[10px] text-slate-500 block font-normal">({num} {num === 1 ? 'pack' : 'packs'})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Price Summary Breakdown */}
            <div className="bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>New Maximum Limit:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{maxUserLimit + addedMembersCount} Users</span>
              </div>
              <div className="flex justify-between text-slate-600 dark:text-slate-400">
                <span>Pack Price ({selectedBlocks} x ₹{blockPrice.toFixed(2)}):</span>
                <span className="font-mono font-medium">₹{baseCost.toFixed(2)}</span>
              </div>
              {taxPercent > 0 && (
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>GST ({taxPercent}%):</span>
                  <span className="font-mono font-medium">₹{taxAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-sm text-slate-900 dark:text-white">
                <span>Total Amount Payable:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400">₹{totalCost.toFixed(2)}</span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpgradePayment}
                disabled={upgrading}
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {upgrading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Proceed to Pay & Upgrade</span>
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