import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { getSubdomain } from '../../main';
import { Mail, Send, Globe, User, FileText, CheckCircle2, AlertCircle, ShieldAlert, LifeBuoy, Building } from 'lucide-react';

export default function ContactPage() {
  const { user, activeRole } = useSelector((state: RootState) => state.auth);

  // Strict role check: Accessible ONLY for Admin or Manager
  const isAdminOrManager =
    activeRole?.roleType === 'admin' ||
    activeRole?.roleType === 'manager' ||
    user?.role === 'admin' ||
    user?.role === 'manager';

  const defaultSubdomain = getSubdomain() || (user as any)?.subdomain || 'demo';
  const defaultName = user?.fullName || user?.username || user?.email || '';
  const defaultEmail = user?.email || '';

  const [name, setName] = useState<string>(defaultName);
  const [senderEmail, setSenderEmail] = useState<string>(defaultEmail);
  const [subject, setSubject] = useState<string>('');
  const [domain, setDomain] = useState<string>(defaultSubdomain);
  const [message, setMessage] = useState<string>('');

  const [sending, setSending] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdminOrManager) return;

    if (!name.trim() || !senderEmail.trim() || !subject.trim() || !message.trim()) {
      setErrorMsg('Please complete all required fields (Name, Email, Subject, and Message).');
      return;
    }

    setSending(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const res = await fetch('/api/contact/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          senderEmail: senderEmail.trim(),
          subject: subject.trim(),
          domain: domain.trim() || defaultSubdomain,
          message: message.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send message to company support.');
      }

      setSuccessMsg(data.message || 'Your enquiry/suggestion has been sent successfully to company support email!');
      setSubject('');
      setMessage('');
    } catch (err: any) {
      console.error('Contact submit error:', err);
      setErrorMsg(err.message || 'Error sending contact email.');
    } finally {
      setSending(false);
    }
  };

  // Render Access Restricted screen if user is not Admin or Manager
  if (!isAdminOrManager) {
    return (
      <div className="p-4 md:p-8 max-w-xl mx-auto my-20 animate-fade-in text-center space-y-4">
        <div className="w-16 h-16 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-rose-200 dark:border-rose-800">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Access Restricted
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          The Contact Support & Suggestion Desk is accessible only to workspace administrators and managers.
        </p>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 animate-fade-in my-16 max-w-4xl mx-auto md:mb-20 text-slate-800 dark:text-slate-200">
      {/* Header Banner */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100 dark:border-indigo-900">
            <Mail className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg md:text-2xl font-bold font-headline text-slate-900 dark:text-white tracking-tight">
              Company Support Desk
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Submit enquiries, platform feedback, feature requests, or technical assistance directly to company support email.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl md:rounded-2xl p-4 md:p-8 shadow-xs">
        {successMsg && (
          <div className="mb-6 p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-start gap-3 text-emerald-800 dark:text-emerald-300 text-xs md:text-sm animate-fade-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Message Dispatched</p>
              <p>{successMsg}</p>
            </div>
          </div>
        )}

        {errorMsg && (
          <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-start gap-3 text-rose-800 dark:text-rose-300 text-xs md:text-sm animate-fade-in">
            <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Dispatch Error</p>
              <p>{errorMsg}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sender Name *</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
              />
            </div>

            {/* Sender Email */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>Sender Email *</span>
              </label>
              <input
                type="email"
                required
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="Enter your email address"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
              />
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-500" />
                <span>Organization *</span>
              </label>
              <input
                type="text"
                required
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                placeholder="e.g. demo"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
              />
            </div>
          </div>

          {/* Subject */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-indigo-500" />
              <span>Subject / Enquiry Title *</span>
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Feature Suggestion / Billing Inquiry / Technical Assistance"
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 transition"
            />
          </div>

          {/* Message */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-indigo-500" />
              <span>Message / Enquiry Details *</span>
            </label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Provide full details of your enquiry, suggestions, or issues..."
              className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs md:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600 transition resize-y"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={sending}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs md:text-sm transition flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              <span>{sending ? 'Sending Email...' : 'Send Enquiry to Company'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
