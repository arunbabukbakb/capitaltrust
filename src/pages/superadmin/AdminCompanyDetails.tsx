import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '../../store';
import { setCompanySettings } from '../../authSlice';
import {
  Building2,
  Image,
  Mail,
  Phone,
  MapPin,
  FileText,
  Save,
  CheckCircle,
  AlertTriangle,
  Upload,
  Trash2,
  RefreshCw
} from 'lucide-react';

export default function AdminCompanyDetails() {
  const dispatch = useDispatch();
  const { companySettings } = useSelector((state: RootState) => state.auth);

  const [companyName, setCompanyName] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [address, setAddress] = useState('');
  const [gstno, setGstno] = useState('');
  const [ismaintanance, setIsmaintanance] = useState(false);
  const [message, setMessage] = useState('');
  const [resumetime, setResumetime] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  const fetchCompanyDetails = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/super-admin/company-details');
      if (res.ok) {
        const data = await res.json();
        setCompanyName(data.companyName || '');
        setCompanyLogo(data.companyLogo || '');
        setSupportEmail(data.supportEmail || '');
        setSupportPhone(data.supportPhone || '');
        setAddress(data.address || '');
        setGstno(data.gstno || '');
        setIsmaintanance(Boolean(data.ismaintanance));
        setMessage(data.message || '');
        setResumetime(data.resumetime || '');
      }
    } catch (err: any) {
      console.error("Error fetching company details:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("The selected image file is too large. Please select a logo smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setCompanyLogo(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      setErrorMsg('Company name is required.');
      return;
    }

    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/super-admin/company-details', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          companyLogo,
          supportEmail,
          supportPhone,
          address,
          gstno,
          ismaintanance,
          message,
          resumetime
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update company details.');
      }

      setSuccessMsg('Company details and branding updated successfully!');

      // Update global Redux state
      if (data.companyDetails) {
        dispatch(setCompanySettings(data.companyDetails));
      }

    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving company details.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-2.5 sm:p-6 space-y-4 sm:space-y-6 max-w-4xl mx-auto animate-fade-in text-slate-200 font-sans">
      {/* Page Header */}
      <div className="pb-3 border-b border-slate-800/80 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-base sm:text-2xl font-extrabold font-headline text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-400 shrink-0" />
            <span>Platform Company Details</span>
          </h1>
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1">
            Configure system default company profile, upload official branding logo, contact channels, address, and GST identification number.
          </p>
        </div>

        <button
          onClick={fetchCompanyDetails}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#0d1322] border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-xl space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">

          {/* Company Name */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Company / Platform Name <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                required
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="CapitalTrust Global Ltd."
                className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
              />
            </div>
          </div>

          {/* GST Number */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              GST Registration No. (GSTIN)
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={gstno}
                onChange={e => setGstno(e.target.value)}
                placeholder="27AAAAA0000A1Z5"
                className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-mono"
              />
            </div>
          </div>

          {/* Support Email */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Support Email Address <span className="text-slate-500 font-normal lowercase">(receives incoming contact enquiries)</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                value={supportEmail}
                onChange={e => setSupportEmail(e.target.value)}
                placeholder="contact@trustcaps.in"
                className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
              />
            </div>
          </div>

          {/* Support Phone */}
          <div>
            <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
              Support Phone / Mobile
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={supportPhone}
                onChange={e => setSupportPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium"
              />
            </div>
          </div>

        </div>

        {/* Corporate Address */}
        <div>
          <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
            Corporate Office Address
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <textarea
              rows={2}
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="Suite 400, Financial District Tower, MG Road, Bengaluru, KA 560001"
              className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition font-medium resize-none"
            />
          </div>
        </div>

        {/* Company Logo Upload & Preview */}
        <div className="space-y-2 border-t border-slate-800/80 pt-4">
          <label className="block text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Company Logo Branding
          </label>
          <p className="text-[10px] text-slate-500">
            Upload an official PNG/JPEG logo image or provide a hosted URL link.
          </p>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <Image className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={companyLogo}
                onChange={e => setCompanyLogo(e.target.value)}
                placeholder="https://example.com/logo.png or uploaded image Data URI"
                className="w-full bg-[#070b13] border border-slate-700/80 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition"
              />
            </div>

            <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition shadow shrink-0 select-none">
              <Upload className="w-4 h-4" />
              <span>Upload Image</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
            </label>
          </div>

          {companyLogo && (
            <div className="mt-3 p-4 border border-slate-800 rounded-xl bg-[#070b13] flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg shrink-0 flex items-center justify-center min-w-16 min-h-12 max-h-16">
                  <img
                    src={companyLogo}
                    alt="Company Logo Preview"
                    className="max-h-12 max-w-[160px] object-contain"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-white block">Logo Preview</span>
                  <span className="text-[10px] text-slate-500 truncate block">Image is ready for display across headers and reports</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setCompanyLogo('')}
                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg text-xs font-bold flex items-center gap-1 transition cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove</span>
              </button>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="pt-3 border-t border-slate-800/80 flex items-center justify-end">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Saving Details...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Company Details</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
