import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Shield } from 'lucide-react';

interface Role {
  id: number;
  roleName: string;
  roleType: 'admin' | 'manager' | 'user';
}

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentRole, setCurrentRole] = useState<Partial<Role> | null>(null);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/roles');
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      setRoles(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  const handleOpenModal = (role: Partial<Role> | null = null) => {
    setCurrentRole(role ? { ...role } : { roleName: '', roleType: 'user' });
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentRole(null);
  };

  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRole || !currentRole.roleName) return;

    const url = currentRole.id ? `/api/roles/${currentRole.id}` : '/api/roles';
    const method = currentRole.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentRole),
      });
      if (!res.ok) throw new Error('Failed to save role');
      await fetchRoles();
      handleCloseModal();
    } catch (err) {
      alert('Error saving role. Please try again.');
    }
  };

  const handleDeleteRole = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this role? This action cannot be undone.')) {
      try {
        const res = await fetch(`/api/roles/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete role');
        await fetchRoles();
      } catch (err) {
        alert('Error deleting role. Please try again.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (currentRole) {
      setCurrentRole({ ...currentRole, [e.target.name]: e.target.value });
    }
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-8 animate-fade-in mt-16">
      <div className="flex flex-row justify-between items-center gap-3">
        <div>
          <h3 className="text-sm md:text-2xl font-bold font-headline text-slate-900">Role Management</h3>
          <p className="hidden sm:block text-xs text-slate-500 mt-1">Create, edit, and manage user roles and permissions.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-2.5 py-1.5 md:px-4 md:py-2 bg-slate-950 text-white rounded-lg text-[10px] md:text-xs font-bold shadow hover:bg-slate-900 transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Role</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr className="text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 pl-6 uppercase tracking-wider text-[10px]">ID</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Role Name</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Role Type</th>
                <th className="p-4 pr-6 uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={4} className="text-center p-8 text-slate-500">Loading roles...</td></tr>
              ) : error ? (
                <tr><td colSpan={4} className="text-center p-8 text-rose-500">{error}</td></tr>
              ) : (
                roles?.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <td className="p-4 pl-6 font-mono font-bold text-slate-500">{role.id}</td>
                    <td className="p-4 font-semibold text-slate-900">{role.roleName}</td>
                    <td className="p-4">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold capitalize ${
                        role.roleType === 'admin' ? 'bg-rose-50 text-rose-800' :
                        role.roleType === 'manager' ? 'bg-blue-50 text-blue-800' :
                        'bg-emerald-50 text-emerald-800'
                      }`}>
                        {role.roleType}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => handleOpenModal(role)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteRole(role.id)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer">
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

        {/* Mobile List Card View */}
        <div className="block sm:hidden divide-y divide-slate-100 bg-white">
          {loading ? (
            <div className="text-center p-6 text-xs text-slate-500">Loading roles...</div>
          ) : error ? (
            <div className="text-center p-6 text-xs text-rose-500">{error}</div>
          ) : roles.length === 0 ? (
            <div className="text-center p-6 text-xs text-slate-400">No roles found.</div>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="p-3 flex items-center justify-between gap-2 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition duration-150">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-slate-400 text-[8px] bg-slate-50 px-1 py-0.5 rounded">ID: {role.id}</span>
                    <span className="font-bold text-slate-800 truncate text-[11px]">{role.roleName}</span>
                  </div>
                  <div>
                    <span className={`inline-block px-1.5 py-0.5 rounded-[4px] text-[8px] font-bold uppercase ${
                      role.roleType === 'admin' ? 'bg-rose-50 text-rose-800' :
                      role.roleType === 'manager' ? 'bg-blue-50 text-blue-800' :
                      'bg-emerald-50 text-emerald-800'
                    }`}>
                      {role.roleType}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1.5 flex-shrink-0">
                  <button onClick={() => handleOpenModal(role)} className="p-1 text-slate-500 hover:text-blue-600 rounded transition cursor-pointer">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteRole(role.id)} className="p-1 text-slate-500 hover:text-rose-600 rounded transition cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal for Create/Edit */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-sm w-full mx-4 p-4 md:p-6 animate-scale-up">
            <header className="flex justify-between items-center mb-3">
              <h4 className="text-sm md:text-lg font-bold font-headline text-slate-900">
                {currentRole?.id ? 'Edit Role' : 'Create New Role'}
              </h4>
              <button onClick={handleCloseModal} className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </header>

            <form onSubmit={handleSaveRole} className="space-y-3">
              <div>
                <label htmlFor="roleName" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Role Name
                </label>
                <input
                  id="roleName"
                  name="roleName"
                  type="text"
                  required
                  value={currentRole?.roleName || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., Compliance Officer"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                />
              </div>

              <div>
                <label htmlFor="roleType" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Role Type
                </label>
                <div className="relative">
                  <select
                    id="roleType"
                    name="roleType"
                    required
                    value={currentRole?.roleType || 'user'}
                    onChange={handleInputChange}
                    className="w-full appearance-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                  >
                    <option value="user">User</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Shield className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 py-2 border border-slate-200 hover:bg-slate-50 rounded-lg text-[11px] md:text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-slate-950 text-white hover:bg-slate-900 rounded-lg text-[11px] md:text-xs font-bold transition-all cursor-pointer"
                >
                  Save Role
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}