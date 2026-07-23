import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

interface WhatsAppButtonProps {
  includeUrl?: boolean;
  customMessage?: string;
}

export default function WhatsAppButton({ includeUrl = false, customMessage }: WhatsAppButtonProps) {
  const { companySettings } = useSelector((state: RootState) => state.auth);
  const [fetchedPhone, setFetchedPhone] = useState<string>('');

  useEffect(() => {
    // Always fetch company settings API so public/landing page gets latest supportPhone from DB
    const loadCompanySettings = async () => {
      try {
        const res = await fetch('/api/settings/company');
        if (res.ok) {
          const data = await res.json();
          if (data?.supportPhone) {
            setFetchedPhone(data.supportPhone);
          }
        }
      } catch (err) {
        console.error("Failed to fetch WhatsApp support phone:", err);
      }
    };

    loadCompanySettings();
  }, []);

  const rawPhone = fetchedPhone || companySettings?.supportPhone || '916238920219';
  // Clean phone number for wa.me URL by removing non-digit characters (+, spaces, hyphens, parens)
  const phoneNumber = rawPhone.replace(/[^0-9]/g, '') || '916238920219';

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    let defaultMsg = customMessage || 'Hello, I have an inquiry regarding CapitalTrust Portal.';
    
    if (includeUrl && typeof window !== 'undefined') {
      defaultMsg = `Hello, I need support regarding CapitalTrust Portal.\nPage: ${window.location.href}`;
    }

    const encodedMsg = encodeURIComponent(defaultMsg);
    const waUrl = `https://wa.me/${phoneNumber}?text=${encodedMsg}`;
    
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed bottom-3.5 right-3.5 sm:bottom-5 sm:right-5 z-50 group flex items-center gap-2">
      {/* Tooltip on hover */}
      <span className="hidden sm:inline-block opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0 bg-slate-900 dark:bg-slate-800 text-white text-[11px] font-semibold py-1.5 px-3 rounded-xl shadow-xl border border-slate-700/50 pointer-events-none whitespace-nowrap">
        Chat with Support
      </span>

      {/* Floating Action Button */}
      <button
        onClick={handleWhatsAppClick}
        aria-label="Contact us on WhatsApp"
        className="relative p-2.5 sm:p-3.5 bg-[#25D366] hover:bg-[#20bd5a] text-white rounded-full shadow-xl sm:shadow-2xl hover:shadow-emerald-500/40 transform hover:scale-110 active:scale-95 transition-all duration-300 cursor-pointer flex items-center justify-center border border-white/20"
      >
        {/* Animated Pulse Ring */}
        <span className="absolute -inset-1 rounded-full bg-[#25D366] opacity-30 animate-ping pointer-events-none" />
        
        {/* SVG WhatsApp icon */}
        <svg
          className="w-4 h-4 sm:w-6 sm:h-6 fill-current"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l.056.09-1.166 4.261 4.364-1.144.089.052z" />
        </svg>
      </button>
    </div>
  );
}
