import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, Save, HelpCircle } from 'lucide-react';
import * as Icons from 'lucide-react';

interface Role {
  id: number;
  roleName: string;
  roleType: 'admin' | 'manager' | 'user';
}

interface MenuItem {
  id: number;
  menuId: string;
  name: string;
  parentId?: string;
  icon?: string;
}

export default function PermissionsPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleId, setSelectedRoleId] = useState<number | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [checkedMenuIds, setCheckedMenuIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch roles and menus on mount
  useEffect(() => {
    const initPage = async () => {
      try {
        setLoading(true);
        const rolesRes = await fetch('/api/roles');
        const menusRes = await fetch('/api/menus');
        if (!rolesRes.ok || !menusRes.ok) throw new Error('Failed to load page parameters');

        const rolesData = await rolesRes.json();
        const menusData = await menusRes.json();

        setRoles(rolesData);
        setMenus(menusData);

        if (rolesData.length > 0) {
          // Default to the first role that is NOT admin, if possible
          const nonAdmin = rolesData.find((r: Role) => r.roleType !== 'admin');
          setSelectedRoleId(nonAdmin ? nonAdmin.id : rolesData[0].id);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    initPage();
  }, []);

  // Fetch permissions when role changes
  useEffect(() => {
    if (!selectedRoleId) return;

    const fetchPermissions = async () => {
      const selectedRole = roles.find(r => r.id === selectedRoleId);
      if (selectedRole?.roleType === 'admin') {
        // Admin gets all menus checked
        setCheckedMenuIds(menus.map(m => m.id));
        return;
      }

      try {
        const res = await fetch(`/api/permissions/roles/${selectedRoleId}`);
        if (!res.ok) throw new Error('Failed to fetch role permissions');
        const allowedMenuIds = await res.json();
        setCheckedMenuIds(allowedMenuIds);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPermissions();
    setMessage(null);
  }, [selectedRoleId, roles, menus]);

  const selectedRole = roles.find(r => r.id === selectedRoleId);
  const isAdminRole = selectedRole?.roleType === 'admin';

  const handleToggleMenu = (menuId: number) => {
    if (isAdminRole) return; // Cannot edit admin role

    setCheckedMenuIds((prev) => {
      if (prev.includes(menuId)) {
        return prev.filter((id) => id !== menuId);
      } else {
        return [...prev, menuId];
      }
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRoleId || isAdminRole) return;

    try {
      setSaving(true);
      setMessage(null);
      const res = await fetch(`/api/permissions/roles/${selectedRoleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menuIds: checkedMenuIds }),
      });

      if (!res.ok) throw new Error('Failed to update permissions');

      setMessage({ type: 'success', text: 'Role permissions saved successfully.' });
      setTimeout(() => setMessage(null), 3000);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error saving permissions. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Group menus by hierarchy (parents and children)
  const parentMenus = menus.filter(m => !m.parentId);
  const getChildren = (parentMenuId: string) => menus.filter(m => m.parentId === parentMenuId);

  const renderIcon = (iconName?: string) => {
    if (iconName && iconName in Icons) {
      const IconComp = (Icons as any)[iconName];
      return <IconComp className="w-4 h-4 text-slate-500" />;
    }
    return <HelpCircle className="w-4 h-4 text-slate-400" />;
  };

  if (loading) {
    return (
      <div className="p-6 text-center text-slate-500 mt-16 font-medium">
        Loading permissions module...
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-8 animate-fade-in mt-16 max-w-4xl">
      <div>
        <h3 className="text-sm md:text-2xl font-bold font-headline text-slate-900">Role Permission Mapping</h3>
        <p className="hidden sm:block text-xs text-slate-500 mt-1">Assign sidebar menu access rights to individual roles.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Roles List Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 shadow-sm space-y-3">
          <h4 className="text-xs uppercase tracking-wider font-bold text-slate-400">Select Role</h4>
          <div className="flex flex-col gap-1.5">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRoleId(role.id)}
                className={`w-full text-left px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                  selectedRoleId === role.id
                    ? 'bg-slate-950 text-white border-slate-950 shadow-sm'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100/50'
                }`}
              >
                <span>{role.roleName}</span>
                <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                  selectedRoleId === role.id
                    ? 'bg-white/20 text-white'
                    : role.roleType === 'admin'
                    ? 'bg-rose-50 text-rose-800'
                    : role.roleType === 'manager'
                    ? 'bg-blue-50 text-blue-800'
                    : 'bg-emerald-50 text-emerald-800'
                }`}>
                  {role.roleType}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Permissions Table Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm md:col-span-2 space-y-6">
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-150 pb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 font-headline">
                Permissions for: {selectedRole?.roleName}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5">Toggle checkboxes to allow or deny view access.</p>
            </div>
            {!isAdminRole && (
              <button
                onClick={handleSavePermissions}
                disabled={saving}
                className="px-3.5 py-1.5 bg-slate-950 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            )}
          </header>

          {message && (
            <div className={`p-3.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
              message.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-rose-50 text-rose-800 border-rose-100'
            }`}>
              <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{message.text}</span>
            </div>
          )}

          {isAdminRole ? (
            <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl text-xs flex gap-3 text-rose-900">
              <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold">Full Administrator Access Bypassed</h5>
                <p className="text-rose-700/80 mt-1 leading-relaxed">
                  Users holding the Administrator role bypass permission filters and always have access to all menus. Modifications are disabled.
                </p>
              </div>
            </div>
          ) : null}

          {/* Hierarchical Checklist Tree */}
          <div className="space-y-4 max-h-[420px] overflow-y-auto pr-2 custom-scrollbar">
            {parentMenus.map((parent) => {
              const children = getChildren(parent.menuId);
              const isParentChecked = checkedMenuIds.includes(parent.id);

              return (
                <div key={parent.id} className="border border-slate-150 rounded-xl overflow-hidden shadow-sm">
                  {/* Parent Menu Row */}
                  <div className="bg-slate-50 p-3.5 flex items-center justify-between gap-3 border-b border-slate-150">
                    <label className="flex items-center gap-3 cursor-pointer select-none font-bold text-slate-800 text-xs">
                      <input
                        type="checkbox"
                        disabled={isAdminRole}
                        checked={isParentChecked}
                        onChange={() => handleToggleMenu(parent.id)}
                        className="w-4 h-4 accent-slate-900 border-slate-300 rounded focus:ring-slate-500 cursor-pointer disabled:opacity-50"
                      />
                      <span className="p-1 bg-white border border-slate-200 rounded">
                        {renderIcon(parent.icon)}
                      </span>
                      <span>{parent.name}</span>
                    </label>
                    <span className="text-[9px] font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-100 uppercase tracking-wider font-mono">
                      Category
                    </span>
                  </div>

                  {/* Children Sub-Menus */}
                  {children.length > 0 ? (
                    <div className="divide-y divide-slate-100 bg-white">
                      {children.map((child) => {
                        const isChildChecked = checkedMenuIds.includes(child.id);

                        return (
                          <div key={child.id} className="p-3 pl-8 flex items-center justify-between gap-3 hover:bg-slate-50/30 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition-colors">
                            <label className="flex items-center gap-3 cursor-pointer select-none text-slate-650 text-xs font-semibold">
                              <input
                                type="checkbox"
                                disabled={isAdminRole}
                                checked={isChildChecked}
                                onChange={() => handleToggleMenu(child.id)}
                                className="w-4 h-4 accent-slate-900 border-slate-300 rounded focus:ring-slate-500 cursor-pointer disabled:opacity-50"
                              />
                              <span className="p-1 bg-slate-50 border border-slate-150 rounded">
                                {renderIcon(child.icon)}
                              </span>
                              <span>{child.name}</span>
                            </label>
                            <span className="text-[9px] font-semibold text-slate-400">
                              Sub-Menu
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 pl-8 text-[11px] text-slate-400 italic bg-white">
                      No nested sub-menus in this category.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
