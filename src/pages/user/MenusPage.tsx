import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, X, Menu, HelpCircle } from 'lucide-react';
import * as Icons from 'lucide-react';

interface MenuData {
  id: number;
  menuId: string;
  name: string;
  icon?: string;
  path?: string;
  parentId?: string;
  menuOrder: number;
  status?: number | boolean;
}

const POPULAR_ICONS = [
  'LayoutDashboard',
  'Coins',
  'Calculator',
  'Users',
  'TrendingUp',
  'ShieldCheck',
  'Shield',
  'FileText',
  'Menu',
  'Settings',
  'HelpCircle',
  'LogOut',
  'PlusCircle',
  'BookOpen',
  'Bell',
  'Database',
  'Lock',
  'Folder'
];

export default function MenusPage() {
  const [menus, setMenus] = useState<MenuData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentMenu, setCurrentMenu] = useState<Partial<MenuData> | null>(null);

  const fetchMenus = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/menus');
      if (!res.ok) throw new Error('Failed to fetch menus');
      const data = await res.json();
      setMenus(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenus();
  }, []);

  const handleOpenModal = (menuItem: Partial<MenuData> | null = null) => {
    setCurrentMenu(
      menuItem
        ? { ...menuItem }
        : { menuId: '', name: '', icon: 'HelpCircle', path: '', parentId: '', menuOrder: 0, status: 1 }
    );
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentMenu(null);
  };

  const handleSaveMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMenu || !currentMenu.menuId || !currentMenu.name) return;

    const payload = {
      ...currentMenu,
      path: currentMenu.path || null,
      parentId: currentMenu.parentId || null,
      icon: currentMenu.icon || 'HelpCircle',
      menuOrder: Number(currentMenu.menuOrder) || 0,
      status: currentMenu.status === false || currentMenu.status === 0 ? 0 : 1
    };

    const url = currentMenu.id ? `/api/menus/${currentMenu.id}` : '/api/menus';
    const method = currentMenu.id ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to save menu item');
      }

      await fetchMenus();
      handleCloseModal();
    } catch (err: any) {
      alert(err.message || 'Error saving menu item. Please try again.');
    }
  };

  const handleDeleteMenu = async (id: number, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"? Warning: deleting a parent category will delete all its child sub-menus.`)) {
      try {
        const res = await fetch(`/api/menus/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete menu item');
        await fetchMenus();
      } catch (err) {
        alert('Error deleting menu item. Please try again.');
      }
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (currentMenu) {
      setCurrentMenu({ ...currentMenu, [e.target.name]: e.target.value });
    }
  };

  // Helper to render Lucide Icons dynamically
  const renderIcon = (iconName?: string) => {
    if (iconName && iconName in Icons) {
      const IconComp = (Icons as any)[iconName];
      return <IconComp className="w-4 h-4" />;
    }
    return <HelpCircle className="w-4 h-4 text-slate-400" />;
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-8 animate-fade-in mt-16">
      <div className="flex flex-row justify-between items-center gap-3">
        <div>
          <h3 className="text-sm md:text-2xl font-bold font-headline text-slate-900">Menu Management</h3>
          <p className="hidden sm:block text-xs text-slate-500 mt-1">Configure and order portal navigation tabs dynamically.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-2.5 py-1.5 md:px-4 md:py-2 bg-slate-950 text-white rounded-lg text-[10px] md:text-xs font-bold shadow hover:bg-slate-900 transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Menu Item</span>
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl md:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/60">
              <tr className="text-slate-500 font-bold border-b border-slate-200 dark:border-slate-700">
                <th className="p-4 pl-6 uppercase tracking-wider text-[10px]">Icon</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Display Name</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Menu Key</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Route Path</th>
                <th className="p-4 uppercase tracking-wider text-[10px]">Parent Category</th>
                <th className="p-4 uppercase tracking-wider text-[10px] text-center">Sort Order</th>
                <th className="p-4 uppercase tracking-wider text-[10px] text-center">Status</th>
                <th className="p-4 pr-6 uppercase tracking-wider text-[10px] text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr><td colSpan={7} className="text-center p-8 text-slate-500">Loading menus...</td></tr>
              ) : error ? (
                <tr><td colSpan={7} className="text-center p-8 text-rose-500">{error}</td></tr>
              ) : menus.length === 0 ? (
                <tr><td colSpan={7} className="text-center p-8 text-slate-400">No menus defined. Add some to build your layout!</td></tr>
              ) : (
                menus.map((menu) => (
                  <tr key={menu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition-colors">
                    <td className="p-4 pl-6">
                      <div className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center justify-center text-slate-700">
                        {renderIcon(menu.icon)}
                      </div>
                    </td>
                    <td className="p-4 font-semibold text-slate-900">
                      {menu.parentId ? <span className="text-slate-400 font-normal mr-1">↳</span> : null}
                      {menu.name}
                    </td>
                    <td className="p-4 font-mono text-xs text-slate-500 font-bold">{menu.menuId}</td>
                    <td className="p-4">
                      {menu.path ? (
                        <span className="font-mono text-xs bg-slate-50 px-2 py-0.5 rounded border border-slate-150 text-slate-600">{menu.path}</span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Group Category</span>
                      )}
                    </td>
                    <td className="p-4 text-xs font-semibold text-slate-600">
                      {menu.parentId ? (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded">
                          {menus.find(m => m.menuId === menu.parentId)?.name || menu.parentId}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">Top-Level</span>
                      )}
                    </td>
                    <td className="p-4 text-center font-mono text-xs font-bold text-slate-800">{menu.menuOrder}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                        menu.status === 0 || menu.status === false
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      }`}>
                        {menu.status === 0 || menu.status === false ? 'Inactive' : 'Active'}
                      </span>
                    </td>
                    <td className="p-4 pr-6 text-right">
                      <div className="inline-flex gap-2">
                        <button onClick={() => handleOpenModal(menu)} className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteMenu(menu.id, menu.name)} className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer">
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
            <div className="text-center p-6 text-xs text-slate-500">Loading menus...</div>
          ) : error ? (
            <div className="text-center p-6 text-xs text-rose-500">{error}</div>
          ) : menus.length === 0 ? (
            <div className="text-center p-6 text-xs text-slate-400 font-semibold">No menus defined. Add some to build your layout!</div>
          ) : (
            menus.map((menu) => (
              <div key={menu.id} className="p-3 flex items-center justify-between gap-3 text-[10px] hover:bg-slate-50 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 transition duration-150">
                {/* Left Side: Icon */}
                <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg inline-flex items-center justify-center text-slate-700 flex-shrink-0">
                  {renderIcon(menu.icon)}
                </div>

                {/* Middle Info */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-bold text-slate-800 text-[11px] truncate flex items-center">
                      {menu.parentId ? <span className="text-slate-400 font-normal mr-1">↳</span> : null}
                      {menu.name}
                    </span>
                    <span className="font-mono text-slate-400 text-[8px] bg-slate-50 px-1 py-0.5 rounded border border-slate-150 font-bold">{menu.menuId}</span>
                  </div>

                  <div className="flex gap-1.5 items-center flex-wrap">
                    {menu.path ? (
                      <span className="font-mono text-[8px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-150 text-slate-500">
                        Route: {menu.path}
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-400 italic">Group Category</span>
                    )}

                    {menu.parentId ? (
                      <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-100 rounded text-[8px] font-bold">
                        Parent: {menus.find(m => m.menuId === menu.parentId)?.name || menu.parentId}
                      </span>
                    ) : (
                      <span className="text-[8px] text-slate-400 font-medium italic">Top-Level</span>
                    )}

                    <span className="font-mono text-[8px] text-slate-400 font-bold">Order: {menu.menuOrder}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[7px] font-bold border ${
                      menu.status === 0 || menu.status === false
                        ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                    }`}>
                      {menu.status === 0 || menu.status === false ? 'Inactive' : 'Active'}
                    </span>
                  </div>
                </div>

                {/* Right Side: Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleOpenModal(menu)} className="p-1 text-slate-500 hover:text-blue-600 rounded transition cursor-pointer">
                    <Edit className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteMenu(menu.id, menu.name)} className="p-1 text-slate-500 hover:text-rose-600 rounded transition cursor-pointer">
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
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full mx-4 p-4 md:p-6 animate-scale-up">
            <header className="flex justify-between items-center mb-4">
              <h4 className="text-sm md:text-lg font-bold font-headline text-slate-900">
                {currentMenu?.id ? 'Edit Menu Item' : 'New Menu Item'}
              </h4>
              <button onClick={handleCloseModal} className="p-1 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </header>

            <form onSubmit={handleSaveMenu} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="menuId" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                    Menu Key
                  </label>
                  <input
                    id="menuId"
                    name="menuId"
                    type="text"
                    required
                    value={currentMenu?.menuId || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., loan-repayments"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono font-bold"
                  />
                </div>
                <div>
                  <label htmlFor="name" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                    Display Name
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={currentMenu?.name || ''}
                    onChange={handleInputChange}
                    placeholder="e.g., Repayments"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-semibold"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="path" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Router Path (optional)
                </label>
                <input
                  id="path"
                  name="path"
                  type="text"
                  value={currentMenu?.path || ''}
                  onChange={handleInputChange}
                  placeholder="e.g., /loan-repayments (leave empty for parent groups)"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono text-slate-650"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="icon" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                    Icon
                  </label>
                  <div className="relative">
                    <select
                      id="icon"
                      name="icon"
                      value={currentMenu?.icon || 'HelpCircle'}
                      onChange={handleInputChange}
                      className="w-full appearance-none px-3 py-2 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-705 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                    >
                      {POPULAR_ICONS.map((ico) => (
                        <option key={ico} value={ico}>
                          {ico}
                        </option>
                      ))}
                    </select>
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                      {renderIcon(currentMenu?.icon)}
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="menuOrder" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                    Sort Order
                  </label>
                  <input
                    id="menuOrder"
                    name="menuOrder"
                    type="number"
                    value={currentMenu?.menuOrder || 0}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all font-mono"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="parentId" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Parent Category (optional)
                </label>
                <div className="relative">
                  <select
                    id="parentId"
                    name="parentId"
                    value={currentMenu?.parentId || ''}
                    onChange={handleInputChange}
                    className="w-full appearance-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-705 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                  >
                    <option value="">None (Top-Level Category)</option>
                    {menus
                      .filter((m) => !m.parentId && !m.path && m.id !== currentMenu?.id)
                      .map((parent) => (
                        <option key={parent.id} value={parent.menuId}>
                          {parent.name}
                        </option>
                      ))}
                  </select>
                  <Menu className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              <div>
                <label htmlFor="status" className="block text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">
                  Status
                </label>
                <div className="relative">
                  <select
                    id="status"
                    name="status"
                    value={currentMenu?.status === false || currentMenu?.status === 0 ? '0' : '1'}
                    onChange={(e) => setCurrentMenu(prev => prev ? { ...prev, status: Number(e.target.value) } : null)}
                    className="w-full appearance-none px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-705 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-900 transition-all"
                  >
                    <option value="1">Active</option>
                    <option value="0">Inactive</option>
                  </select>
                  <Menu className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
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
                  Save Menu Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
