import React, { useState, useEffect } from 'react';
import {
  Video,
  Play,
  Search,
  ExternalLink,
  Loader2,
  Film,
  AlertCircle,
  Tv,
  X,
  Sparkles
} from 'lucide-react';

interface VideoTutorial {
  id: number;
  title: string;
  link: string;
  status: 'Active' | 'Inactive';
  order_number?: number;
  created_at?: string;
}

export default function VideoTutorialsDoc() {
  const [tutorials, setTutorials] = useState<VideoTutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  // Modal Popup state when clicking a video item from the list
  const [popupVideo, setPopupVideo] = useState<VideoTutorial | null>(null);

  useEffect(() => {
    fetchPublicTutorials();
  }, []);

  const fetchPublicTutorials = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/video-tutorials/public');
      if (!res.ok) {
        throw new Error('Failed to load video tutorials.');
      }
      const data = await res.json();
      setTutorials(data);
    } catch (err: any) {
      setError(err.message || 'Error loading video tutorials.');
    } finally {
      setLoading(false);
    }
  };

  // Convert link to embed link
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

  // Helper to extract YouTube thumbnail if possible
  const getYouTubeThumbnail = (url: string) => {
    const ytReg = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(ytReg);
    if (match && match[1]) {
      return `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg`;
    }
    return null;
  };

  const filteredTutorials = tutorials
    .filter((t) => t.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.order_number || 0) - (b.order_number || 0));

  return (
    <div className="space-y-4 sm:space-y-6 text-slate-700 dark:text-slate-300">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-slate-800 pb-3 sm:pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-500/10 border border-rose-500/20 rounded-full text-rose-600 dark:text-rose-400 text-xs sm:text-sm font-semibold mb-2 sm:mb-3">
          <Video className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          Video Guide Library
        </div>
        <h1 className="text-xl sm:text-3xl md:text-4xl font-extrabold font-headline text-slate-900 dark:text-white">
          Video Tutorials
        </h1>
        <p className="text-xs sm:text-base text-slate-600 dark:text-slate-400 mt-1 sm:mt-2 leading-relaxed">
          Click on any tutorial video from the ordered list below to watch step-by-step feature guides and walkthroughs.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
          <p className="text-xs sm:text-sm font-medium">Loading video tutorials...</p>
        </div>
      ) : error ? (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-600 dark:text-red-400 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : tutorials.length === 0 ? (
        <div className="bg-slate-100/60 dark:bg-slate-900/40 p-8 sm:p-12 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-3">
          <Film className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">No Video Tutorials Available</h3>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            Video tutorials are currently being updated. Please check back soon or consult the written documentation modules.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Top Bar: Title & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-100/60 dark:bg-slate-900/40 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800/80">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-headline flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Available Tutorials ({filteredTutorials.length})
            </h3>

            {/* Search Bar */}
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search video tutorials..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-900 dark:text-slate-200"
              />
            </div>
          </div>

          {/* Video Tutorial List Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {filteredTutorials.map((item) => {
              const thumb = getYouTubeThumbnail(item.link);
              return (
                <div
                  key={item.id}
                  onClick={() => setPopupVideo(item)}
                  className="group cursor-pointer rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-900/80 hover:border-indigo-300 dark:hover:border-indigo-500/40 shadow-xs hover:shadow-lg transition-all duration-300 overflow-hidden flex flex-col justify-between"
                >
                  {/* Thumbnail Container */}
                  <div className="aspect-video w-full bg-slate-900 relative overflow-hidden flex items-center justify-center">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="p-6 text-center">
                        <Film className="w-10 h-10 text-indigo-400/60 mx-auto" />
                      </div>
                    )}

                    {/* Dark overlay & Play Button Badge */}
                    <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/20 transition-colors flex items-center justify-center">
                      <div className="p-3.5 rounded-full bg-rose-600 group-hover:bg-rose-500 text-white shadow-xl group-hover:scale-110 transition-all duration-300 flex items-center justify-center">
                        <Play className="w-6 h-6 fill-current ml-0.5" />
                      </div>
                    </div>

                    <div className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-slate-950/80 backdrop-blur-md rounded-md text-[10px] font-mono font-bold text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                      #{item.order_number || 0}
                    </div>
                  </div>

                  {/* Content Info */}
                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white line-clamp-2 font-headline group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {item.title}
                    </h4>

                    <div className="flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-semibold pt-2 border-t border-slate-100 dark:border-slate-800/60">
                      <span className="flex items-center gap-1.5">
                        <Play className="w-3 h-3 fill-current" />
                        Click to Watch Video
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Video Popup Modal */}
      {popupVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div
            className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden relative flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-3.5 sm:p-5 bg-slate-950/90 border-b border-slate-800">
              <div className="flex items-center gap-2.5 min-w-0 pr-4">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-xl shrink-0">
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                </div>
                <h3 className="text-sm sm:text-lg font-bold text-white font-headline truncate">
                  {popupVideo.title}
                </h3>
              </div>

              <button
                onClick={() => setPopupVideo(null)}
                className="p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-xl transition cursor-pointer shrink-0"
                title="Close Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Player Container */}
            <div className="w-full aspect-video bg-black flex items-center justify-center relative overflow-hidden">
              {getEmbedUrl(popupVideo.link).includes('embed') || getEmbedUrl(popupVideo.link).includes('player.vimeo') ? (
                <iframe
                  src={getEmbedUrl(popupVideo.link)}
                  title={popupVideo.title}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="text-center p-8 space-y-4">
                  <Tv className="w-16 h-16 text-rose-400 mx-auto" />
                  <div>
                    <h4 className="text-base font-bold text-white">{popupVideo.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                      This tutorial is hosted on an external platform. Click the button below to watch the video directly.
                    </p>
                  </div>
                  <a
                    href={popupVideo.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    <span>Watch Tutorial Video</span>
                  </a>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 truncate max-w-md hidden sm:inline">
                Link: <span className="font-mono text-slate-300">{popupVideo.link}</span>
              </span>
              <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
                <a
                  href={popupVideo.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
                >
                  <span>Open in External Tab</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <button
                  onClick={() => setPopupVideo(null)}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
