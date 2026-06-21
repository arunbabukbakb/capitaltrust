import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Users, Mail, Phone, Shield, CheckCircle } from 'lucide-react';

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

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
      ]);
      if (!usersRes.ok || !rolesRes.ok) throw new Error('Failed to fetch data');
      const usersData = await usersRes.json();
      const rolesData = await rolesRes.json();
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (user: Partial<User> | null = null) => {
    const defaultRole = roles.find(r => r.roleType === 'user');
    if (user) {
      const assignedIds = user.assignedRoles ? user.assignedRoles.map((r: any) => r.id) : (user.roleId ? [user.roleId] : []);
      setCurrentUser({
        ...user,
        roleIds: assignedIds
      });
    } else {
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
        roleId: currentUser.roleIds[0], // fallback for backward-compatibility
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

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-8 animate-fade-in mt-16">
      <div className="flex flex-row justify-between items-center gap-3">
        <div>
          <h3 className="text-sm md:text-2xl font-bold font-headline text-slate-900">User Management</h3>
          <p className="hidden sm:block text-xs text-slate-500 mt-1">Add, edit, and manage portal users and their assigned roles.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-2.5 py-1.5 md:px-4 md:py-2 bg-slate-950 text-white rounded-lg text-[10px] md:text-xs font-bold shadow hover:bg-slate-900 transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New User</span>
        </button>
      </div>

      <div className="bg-white rounded-xl md:rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50">
              <tr className="text-slate-500 font-bold border-b border-slate-200">
                <th className="p-4 pl-6 uppercase tracking-wider text-[10px]">User</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Contact</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Assigned Role</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Status</th>
                <th className="p-4 pr-6 uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={5} className="text-center p-8 text-slate-500">Loading users...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="text-center p-8 text-rose-500">{error}</td></tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6">
                      <p className="font-bold text-slate-900">{user.fullName}</p>
                      <p className="text-xs text-slate-500 font-mono">{user.id}</p>
                    </td>
                    <td className="p-4">
                      <p className="font-medium text-slate-800">{user.username}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {user.assignedRoles && user.assignedRoles.length > 0 ? (
                          user.assignedRoles.map((r: any) => (
                            <span key={r.id} className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${r.roleType === 'admin' ? 'bg-rose-50 text-rose-800' :
                                r.roleType === 'manager' ? 'bg-blue-50 text-blue-800' :
                                  'bg-emerald-50 text-emerald-800'
                              }`}>
                              {r.roleName}
                            </span>
                          ))
                        ) : (
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${user.roleType === 'admin' ? 'bg-rose-50 text-rose-800' :
                              user.roleType === 'manager' ? 'bg-blue-50 text-blue-800' :
                                'bg-emerald-50 text-emerald-800'
                            }`}>
                            {user.roleName}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold capitalize ${user.status
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-amber-50 text-amber-800'
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${user.status
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                          }`} />
                        {user.status ? 'Approved' : 'Pending'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => handleOpenModal(user)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer">
                          <Edit className="w-4 h-4" />
                        </button>
                        {user.roleType !== 'admin' && (
                          <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        {!user.status && user.roleType !== 'admin' && (
                          <button onClick={() => handleApproveUser(user)} className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer" title="Approve User">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile List Card View */}
        <div className="block sm:hidden divide-y divide-slate-100 bg-white">
          {loading ? (
            <div className="text-center p-6 text-xs text-slate-500">Loading users...</div>
          ) : error ? (
            <div className="text-center p-6 text-xs text-rose-500">{error}</div>
          ) : users.length === 0 ? (
            <div className="text-center p-6 text-xs text-slate-400">No users found.</div>
          ) : (
            users.map((user) => (
              <div key={user.id} className="p-3 flex items-center justify-between gap-2 text-[10px] hover:bg-slate-50 transition duration-150">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800 truncate text-[11px]">{user.fullName}</span>
                    <span className="font-mono text-slate-400 text-[8px] bg-slate-50 px-1 py-0.5 rounded">{user.id}</span>
                  </div>
                  <div className="text-slate-500 font-medium font-mono text-[9px] truncate">
                    {user.username} • {user.email} {user.phoneNumber ? `• ${user.phoneNumber}` : ''}
                  </div>
                  <div className="flex gap-1.5 items-center flex-wrap">
                    {user.assignedRoles && user.assignedRoles.length > 0 ? (
                      user.assignedRoles.map((r: any) => (
                        <span key={r.id} className={`inline-block px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase ${
                          r.roleType === 'admin' ? 'bg-rose-50 text-rose-800' :
                          r.roleType === 'manager' ? 'bg-blue-50 text-blue-800' :
                          'bg-emerald-50 text-emerald-800'
                        }`}>
                          {r.roleName}
                        </span>
                      ))
                    ) : (
                      <span className={`inline-block px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase ${
                        user.roleType === 'admin' ? 'bg-rose-50 text-rose-800' :
                        user.roleType === 'manager' ? 'bg-blue-50 text-blue-800' :
                        'bg-emerald-50 text-emerald-850'
                      }`}>
                        {user.roleName}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1 px-1 py-0.5 rounded text-[8px] font-bold capitalize ${
                      user.status ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'
                    }`}>
                      <span className={`w-1 h-1 rounded-full ${user.status ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                      {user.status ? 'Approved' : 'Pending'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleOpenModal(user)} className="p-1 text-slate-500 hover:text-blue-600 rounded transition cursor-pointer">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  {user.roleType !== 'admin' && (
                    <button onClick={() => handleDeleteUser(user.id)} className="p-1 text-slate-500 hover:text-rose-600 rounded transition cursor-pointer">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {!user.status && user.roleType !== 'admin' && (
                    <button onClick={() => handleApproveUser(user)} className="p-1 text-slate-500 hover:text-emerald-600 rounded transition cursor-pointer" title="Approve User">
                      <CheckCircle className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Create/Edit User */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm w-full mx-4 p-4 md:p-6 animate-scale-up">
            <header className="flex justify-between items-center mb-3">
              <h4 className="text-sm md:text-lg font-bold font-headline text-slate-900">
                {currentUser?.id ? 'Edit User' : 'Create New User'}
              </h4>
              <button onClick={handleCloseModal} className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </header>

            <form onSubmit={handleSaveUser} className="space-y-3">
              <div>
                <label htmlFor="fullName" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Full Name</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input id="fullName" name="fullName" type="text" required value={currentUser?.fullName || ''} onChange={handleInputChange} placeholder="John Doe"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all" />
                </div>
              </div>

              <div>
                <label htmlFor="username" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Username</label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input id="username" name="username" type="text" required value={currentUser?.username || ''} onChange={handleInputChange} placeholder="johndoe"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all" />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input id="email" name="email" type="email" required value={currentUser?.email || ''} onChange={handleInputChange} placeholder="john@acme.com"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all" />
                </div>
              </div>

              <div>
                <label htmlFor="phoneNumber" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input id="phoneNumber" name="phoneNumber" type="tel" value={currentUser?.phoneNumber || ''} onChange={handleInputChange} placeholder="+1 (555) 123-4567"
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all" />
                </div>
              </div>

              <div>
                <label className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-2">Assigned Roles</label>
                <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                  {roles.map(role => {
                    const isChecked = currentUser?.roleIds?.includes(role.id) || false;
                    return (
                      <label key={role.id} className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (!currentUser) return;
                            const currentIds = currentUser.roleIds || [];
                            let nextIds: number[];
                            if (e.target.checked) {
                              nextIds = [...currentIds, role.id];
                            } else {
                              nextIds = currentIds.filter(id => id !== role.id);
                            }
                            setCurrentUser({ ...currentUser, roleIds: nextIds });
                          }}
                          className="w-4 h-4 rounded border-slate-350 text-slate-900 focus:ring-slate-950 focus:ring-offset-0 cursor-pointer"
                        />
                        <span>{role.roleName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {!currentUser?.id && (
                <p className="text-[10px] md:text-xs text-slate-500 italic pt-1">
                  A new user will be created. They will need to use the "Forgot Password" link on the login screen to set their initial password.
                </p>
              )}

              <div className="flex gap-2.5 pt-2">
                <button type="button" onClick={handleCloseModal} className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-[11px] md:text-xs font-bold transition-all cursor-pointer">
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 bg-slate-950 text-white hover:bg-slate-900 rounded-lg text-[11px] md:text-xs font-bold transition-all cursor-pointer">
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}