import React from 'react';
import {
  Wrench,
  Clock,
  MessageSquare,
  Mail,
  ShieldAlert,
  RefreshCw,
  Sparkles
} from 'lucide-react';

interface MaintenanceNoticePageProps {
  companySettings?: {
    companyName?: string;
    companyLogo?: string;
    supportEmail?: string;
    supportPhone?: string;
    ismaintanance?: boolean;
    message?: string;
    resumetime?: string;
  } | null;
}

export default function MaintenanceNoticePage({ companySettings }: MaintenanceNoticePageProps) {
  const companyName = companySettings?.companyName || 'CapitalTrust';
  const companyLogo = companySettings?.companyLogo;
  const supportEmail = companySettings?.supportEmail || 'support@capitaltrust.com';
  const supportPhone = companySettings?.supportPhone || '';
  const message = companySettings?.message;
  const resumetime = companySettings?.resumetime;

  const cleanPhone = supportPhone ? supportPhone.replace(/[^0-9]/g, '') : '';
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hello, I need support during server maintenance.')}`
    : '#';

  const formatResumeTime = (timeStr?: string) => {
    if (!timeStr) return null;
    try {
      const d = new Date(timeStr);
      if (isNaN(d.getTime())) return timeStr;
      return d.toLocaleString(undefined, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return timeStr;
    }
  };

  const formattedResumeTime = formatResumeTime(resumetime);

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#070b14] text-[#e2e8f0] flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Background Decorative Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[55%] h-[65%] rounded-full bg-amber-500/10 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-500/10 blur-[160px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[35%] h-[35%] rounded-full bg-cyan-500/5 blur-[120px] pointer-events-none" />

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #ffffff 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }}
      />

      <div className="max-w-xl w-full bg-slate-900/60 border border-slate-800/90 rounded-3xl p-6 sm:p-10 backdrop-blur-2xl shadow-2xl relative z-10 space-y-8 text-center animate-fade-in">
        {/* Company Header / Logo */}
        <div className="flex flex-col items-center justify-center space-y-3">
          {companyLogo ? (
            <img
              src={companyLogo}
              alt={companyName}
              className="h-12 max-w-[200px] object-contain rounded-lg"
            />
          ) : (
            <div className="flex items-center gap-2">
              <div className="p-2 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-xl text-slate-950 shadow-md">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="text-xl font-black text-white font-headline tracking-wide uppercase">
                {companyName}
              </span>
            </div>
          )}
        </div>

        {/* Maintenance Icon Badge */}
        <div className="relative inline-block mx-auto">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl shadow-amber-500/10 mx-auto">
            <Wrench className="w-10 h-10 animate-bounce" />
          </div>
          <span className="absolute -bottom-2 -right-2 px-2.5 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-extrabold uppercase tracking-wider rounded-full shadow-lg border border-amber-300">
            Maintenance
          </span>
        </div>

        {/* Heading & Subtitle */}
        <div className="space-y-3">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-headline tracking-tight">
            Server Maintenance is Going On
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto leading-relaxed">
            We are performing scheduled infrastructure upgrades to enhance performance, reliability, and security across all workspace services.
          </p>
        </div>

        {/* Maintenance Message Card */}
        {message && (
          <div className="bg-slate-950/70 border border-amber-500/20 rounded-2xl p-5 text-left space-y-2 relative overflow-hidden">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold font-headline">
              <MessageSquare className="w-4 h-4 text-amber-400" />
              Administrator Notice
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
              {message}
            </p>
          </div>
        )}

        {/* Resume Time Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-amber-500/10 to-indigo-500/10 border border-indigo-500/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400 flex-shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Scheduled Resume Time</p>
              <p className="text-xs sm:text-sm font-extrabold text-indigo-200">
                {formattedResumeTime || 'To be announced shortly'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-xl transition cursor-pointer flex-shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Check Status
          </button>
        </div>

        {/* Support Footer */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <span className="text-[11px]">Need urgent support during maintenance?</span>
          <div className="flex items-center gap-4">
            {supportEmail && (
              <a
                href={`mailto:${supportEmail}`}
                className="flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 transition no-underline font-medium text-xs"
              >
                <Mail className="w-3.5 h-3.5" />
                {supportEmail}
              </a>
            )}
            {supportPhone && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-emerald-400 hover:text-emerald-300 transition no-underline font-medium text-xs"
              >
                <svg
                  className="w-3.5 h-3.5 fill-current"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l.056.09-1.166 4.261 4.364-1.144.089.052z" />
                </svg>
                {supportPhone}
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
