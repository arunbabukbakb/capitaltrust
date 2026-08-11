import React, { useState, useEffect } from 'react';
import {
  Video,
  Plus,
  Search,
  Edit3,
  Trash2,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Play,
  Film,
  X,
  AlertCircle,
  Loader2,
  RefreshCw,
  Eye,
  Link as LinkIcon,
  Hash
} from 'lucide-react';

interface VideoTutorial {
  id: number;
  title: string;
  link: string;
  status: 'Active' | 'Inactive';
  order_number?: number;
  created_at?: string;
  updated_at?: string;
}

export default function AdminVideoTutorials() {
  const [tutorials, setTutorials] = useState<VideoTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VideoTutorial | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    link: '',
    status: 'Active' as 'Active' | 'Inactive',
    order_number: 1
  });
  const [saving, setSaving] = useState(false);

  // Preview modal state
  const [previewVideo, setPreviewVideo] = useState<VideoTutorial | null>(null);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState<VideoTutorial | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchTutorials();
  }, []);

  const fetchTutorials = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/video-tutorials');
      if (!res.ok) {
        throw new Error('Failed to fetch video tutorials.');
      }
      const data = await res.json();
      setTutorials(data);
    } catch (err: any) {
      setError(err.message || 'Error loading video tutorials.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    const nextOrder = tutorials.length > 0
      ? Math.max(...tutorials.map(t => t.order_number || 0)) + 1
      : 1;
    setFormData({
      title: '',
      link: '',
      status: 'Active',
      order_number: nextOrder
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: VideoTutorial) => {
    setEditingItem(item);
    setFormData({
      title: item.title,
      link: item.link,
      status: item.status,
      order_number: item.order_number || 0
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.link.trim()) {
      setError('Please provide both title and video link.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const url = editingItem
        ? `/api/super-admin/video-tutorials/${editingItem.id}`
        : '/api/super-admin/video-tutorials';
      const method = editingItem ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save video tutorial.');
      }

      setIsModalOpen(false);
      fetchTutorials();
    } catch (err: any) {
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (item: VideoTutorial) => {
    try {
      const res = await fetch(`/api/super-admin/video-tutorials/${item.id}/status`, {
        method: 'PATCH'
      });
      if (!res.ok) {
        throw new Error('Failed to toggle status.');
      }
      fetchTutorials();
    } catch (err: any) {
      alert(err.message || 'Failed to update status.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/super-admin/video-tutorials/${deleteTarget.id}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        throw new Error('Failed to delete video tutorial.');
      }
      setDeleteTarget(null);
      fetchTutorials();
    } catch (err: any) {
      alert(err.message || 'Failed to delete video tutorial.');
    } finally {
      setDeleting(false);
    }
  };

  // Helper to extract YouTube Embed URL if valid YouTube URL
  const getEmbedUrl = (url: string) => {
    if (!url) return '';
    try {
      const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = url.match(ytReg);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}?autoplay=1`;
      }
      const vimeoReg = /vimeo\.com\/(?:.*#|.*\/)?([0-9]+)/;
      const vimeoMatch = url.match(vimeoReg);
      if (vimeoMatch && vimeoMatch[1]) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  const filteredTutorials = tutorials.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.link.toLowerCase().includes(search.toLowerCase())
  );

  const activeCount = tutorials.filter((t) => t.status === 'Active').length;
  const inactiveCount = tutorials.filter((t) => t.status === 'Inactive').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white font-headline">
                Video Tutorials Management
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Manage video tutorial links, titles, display order numbers, and publication status.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchTutorials}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition cursor-pointer"
            title="Refresh List"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/20 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Video Tutorial</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#0b1329]/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Tutorials</span>
            <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Video className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-white mt-2 font-headline">{tutorials.length}</p>
        </div>

        <div className="bg-[#0b1329]/60 border border-emerald-500/20 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Active Videos</span>
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-400 mt-2 font-headline">{activeCount}</p>
        </div>

        <div className="bg-[#0b1329]/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Inactive / Draft</span>
            <div className="p-2 bg-slate-800/60 rounded-xl text-slate-400">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-300 mt-2 font-headline">{inactiveCount}</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex items-center gap-3 bg-[#0b1329]/60 border border-slate-800/80 p-3 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tutorials by title or URL link..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
          />
        </div>
      </div>

      {/* Main List Table */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-medium">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs font-medium">Loading video tutorials...</p>
        </div>
      ) : filteredTutorials.length === 0 ? (
        <div className="bg-[#0b1329]/40 border border-slate-800/80 rounded-2xl p-12 text-center">
          <Video className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-white">No Video Tutorials Found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {search ? 'No video tutorials match your search query.' : 'Click "Add Video Tutorial" to add your first video tutorial link.'}
          </p>
        </div>
      ) : (
        <div className="bg-[#0b1329]/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">Order #</th>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Video Link</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredTutorials.map((item) => {
                  return (
                    <tr key={item.id} className="hover:bg-slate-900/40 transition">
                      {/* Order Number */}
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-extrabold rounded-lg font-mono text-xs">
                          #{item.order_number || 0}
                        </span>
                      </td>

                      {/* Title */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 shrink-0">
                            <Play className="w-4 h-4 fill-current" />
                          </div>
                          <div>
                            <p className="font-bold text-white text-xs sm:text-sm font-headline">{item.title}</p>
                            <p className="text-[10px] text-slate-500 mt-0.5">ID: #{item.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Video Link */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 max-w-md">
                          <LinkIcon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <a
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-400 hover:text-indigo-300 truncate underline font-mono"
                          >
                            {item.link}
                          </a>
                          <ExternalLink className="w-3 h-3 text-slate-500 shrink-0" />
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider transition cursor-pointer ${
                            item.status === 'Active'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20'
                              : 'bg-slate-800/80 text-slate-400 border border-slate-700 hover:bg-slate-800'
                          }`}
                          title="Click to toggle status"
                        >
                          {item.status === 'Active' ? (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>Active</span>
                            </>
                          ) : (
                            <>
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                              <span>Inactive</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Preview Button */}
                          <button
                            onClick={() => setPreviewVideo(item)}
                            className="p-2 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-400 rounded-xl transition cursor-pointer"
                            title="Preview Video"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Button */}
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition cursor-pointer border border-slate-700"
                            title="Edit Tutorial"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => setDeleteTarget(item)}
                            className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition cursor-pointer border border-red-500/20"
                            title="Delete Tutorial"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Video Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-[#0b1329] border border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                <Video className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white font-headline">
                  {editingItem ? 'Edit Video Tutorial' : 'Add New Video Tutorial'}
                </h3>
                <p className="text-xs text-slate-400">
                  {editingItem
                    ? 'Update the video title, link, display order, or status.'
                    : 'Provide tutorial title, video link, display order, and status.'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Order Number */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Order Number
                </label>
                <div className="relative">
                  <Hash className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-400" />
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 1"
                    value={formData.order_number}
                    onChange={(e) => setFormData({ ...formData, order_number: parseInt(e.target.value) || 0 })}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Tutorials will be listed in documentation sorted by this order number (1, 2, 3...).
                </p>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Tutorial Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. How to Create & Manage Member Accounts"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>

              {/* Link */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Video URL Link <span className="text-red-400">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
                  value={formData.link}
                  onChange={(e) => setFormData({ ...formData, link: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Supports YouTube watch links, YouTube shorts, Vimeo links, or direct MP4 URLs.
                </p>
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Active' | 'Inactive' })}
                  className="w-full px-3.5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                >
                  <option value="Active">Active (Published to Documentation)</option>
                  <option value="Inactive">Inactive (Draft / Hidden)</option>
                </select>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
                >
                  {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Save Changes' : 'Add Tutorial'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Video Preview Modal */}
      {previewVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
          <div className="w-full max-w-3xl bg-[#0b1329] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60">
              <div className="flex items-center gap-2.5">
                <Play className="w-4 h-4 text-indigo-400 fill-current" />
                <h3 className="text-sm font-bold text-white truncate max-w-lg">{previewVideo.title}</h3>
              </div>
              <button
                onClick={() => setPreviewVideo(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 bg-black flex items-center justify-center">
              <div className="w-full aspect-video rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative flex items-center justify-center">
                {getEmbedUrl(previewVideo.link).includes('embed') || getEmbedUrl(previewVideo.link).includes('player.vimeo') ? (
                  <iframe
                    src={getEmbedUrl(previewVideo.link)}
                    title={previewVideo.title}
                    className="w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <Film className="w-12 h-12 text-indigo-400 mx-auto" />
                    <p className="text-xs text-slate-300">Direct Link Preview</p>
                    <a
                      href={previewVideo.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
                    >
                      <span>Open Video Link</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#0b1329] border border-slate-800 rounded-2xl shadow-2xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Delete Video Tutorial?</h3>
              <p className="text-xs text-slate-400 mt-1">
                Are you sure you want to delete <span className="text-white font-semibold">"{deleteTarget.title}"</span>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold rounded-xl border border-slate-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl shadow-lg transition cursor-pointer disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Delete Tutorial</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
