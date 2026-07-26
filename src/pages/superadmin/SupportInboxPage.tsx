import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  Search,
  Send,
  User,
  Clock,
  CheckCircle,
  AlertCircle,
  Inbox,
  ArrowLeft,
  ChevronRight,
  LifeBuoy,
  Trash2
} from 'lucide-react';

interface InboxItem {
  id: string;
  seq: number;
  uid: number;
  fromName: string;
  fromEmail: string;
  replyToName: string;
  replyToEmail: string;
  subject: string;
  date: string;
  textBody: string;
  htmlBody: string;
  seen: boolean;
}

export default function SupportInboxPage() {
  const [messages, setMessages] = useState<InboxItem[]>([]);
  const [mailboxEmail, setMailboxEmail] = useState<string>('');
  const [selectedMessage, setSelectedMessage] = useState<InboxItem | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [deletingUid, setDeletingUid] = useState<number | null>(null);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [replyBody, setReplyBody] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);
  const [replySuccess, setReplySuccess] = useState<string>('');
  const [replyError, setReplyError] = useState<string>('');

  useEffect(() => {
    fetchInbox();
  }, []);

  const handleDeleteMessage = async (uid: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (!window.confirm('Are you sure you want to permanently delete this email from the mailbox?')) {
      return;
    }

    setDeletingUid(uid);
    try {
      const res = await fetch(`/api/super-admin/inbox/${uid}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete email from mailbox.');
      }

      setMessages((prev) => prev.filter((m) => m.uid !== uid));
      setSelectedMessage((curr) => {
        if (curr?.uid === uid) {
          const remaining = messages.filter((m) => m.uid !== uid);
          return remaining[0] || null;
        }
        return curr;
      });
    } catch (err: any) {
      alert(err.message || 'Error deleting email from mailbox.');
    } finally {
      setDeletingUid(null);
    }
  };

  const fetchInbox = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/inbox');
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to fetch incoming mailbox emails.');
      }
      setMailboxEmail(data.mailbox || '');
      setMessages(data.messages || []);
      if (data.messages && data.messages.length > 0 && !selectedMessage) {
        setSelectedMessage(data.messages[0]);
      }
    } catch (err: any) {
      console.error('Fetch Inbox Error:', err);
      setError(err.message || 'Error connecting to IMAP support mailbox.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMessage || !replyBody.trim()) return;

    setSendingReply(true);
    setReplySuccess('');
    setReplyError('');

    try {
      const targetEmail = selectedMessage.replyToEmail || selectedMessage.fromEmail;
      const targetName = selectedMessage.replyToName || selectedMessage.fromName;

      const res = await fetch('/api/super-admin/inbox/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          toEmail: targetEmail,
          toName: targetName,
          subject: selectedMessage.subject,
          messageBody: replyBody.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to send reply email.');
      }

      setReplySuccess(data.message || `Reply email successfully sent to ${targetEmail}!`);
      setReplyBody('');
    } catch (err: any) {
      console.error('Send Reply error:', err);
      setReplyError(err.message || 'Error sending reply email via SMTP.');
    } finally {
      setSendingReply(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      m.fromName.toLowerCase().includes(term) ||
      m.fromEmail.toLowerCase().includes(term) ||
      m.subject.toLowerCase().includes(term) ||
      m.textBody.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 animate-fade-in text-slate-200">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-[#0c101b] border border-slate-800/80 p-4 sm:p-6 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Inbox className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold font-headline text-white tracking-tight flex items-center gap-2">
              Support Mailbox Desk
              {mailboxEmail && (
                <span className="text-xs font-mono px-2.5 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                  {mailboxEmail}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-300 font-medium mt-0.5">
              Live IMAP Inbox — Reads incoming customer emails live from mail server without saving to database.
            </p>
          </div>
        </div>

        <button
          onClick={fetchInbox}
          disabled={loading}
          className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{loading ? 'Syncing...' : 'Sync Mailbox'}</span>
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-950/40 border border-rose-800/60 rounded-xl flex items-start gap-3 text-rose-200 text-xs">
          <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">IMAP Mailbox Connection Error</p>
            <p className="mt-0.5 text-slate-200">{error}</p>
            <p className="mt-1 text-[11px] text-rose-300 font-medium">
              Ensure active SMTP/IMAP settings are configured under <a href="/admin/smtp" className="underline font-bold text-white">SMTP Mail Settings</a>.
            </p>
          </div>
        </div>
      )}

      {/* Main Inbox Deck: Split View */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[600px]">
        {/* Left List Pane: Message Feed */}
        <div className="lg:col-span-5 bg-[#0c101b] border border-slate-800/80 rounded-2xl p-3 sm:p-4 space-y-3 flex flex-col h-full max-h-[700px]">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search incoming emails..."
              className="w-full bg-[#070b13] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition"
            />
          </div>

          {/* Email Feed List */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
            {loading ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                <p className="text-slate-300 font-medium">Connecting to IMAP mail server...</p>
              </div>
            ) : filteredMessages.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                <Mail className="w-8 h-8 mx-auto text-slate-500" />
                <p className="text-slate-300 font-medium">No incoming emails found in mailbox.</p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isSelected = selectedMessage?.id === msg.id;
                return (
                  <div
                    key={msg.id}
                    onClick={() => {
                      setSelectedMessage(msg);
                      setReplySuccess('');
                      setReplyError('');
                    }}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition-all space-y-1.5 relative group ${
                      isSelected
                        ? 'bg-indigo-500/15 border-indigo-500/50 text-white shadow-xs'
                        : 'bg-[#070b13]/80 hover:bg-[#070b13] border-slate-800/90 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold truncate text-white">{msg.replyToName || msg.fromName}</span>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-slate-300 font-medium">
                          {new Date(msg.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteMessage(msg.uid, e)}
                          title="Delete Email"
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-rose-400 hover:bg-rose-500/10 rounded transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="font-bold text-white truncate">{msg.subject}</p>
                    <p className="text-[11px] text-slate-200 line-clamp-2 leading-relaxed">
                      {msg.textBody || '(No text preview)'}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Reader Pane: Selected Message Reader & Reply Composer */}
        <div className="lg:col-span-7 bg-[#0c101b] border border-slate-800/80 rounded-2xl p-4 sm:p-6 space-y-6 min-h-[600px] flex flex-col justify-between">
          {selectedMessage ? (
            <div className="space-y-6 flex-1 flex flex-col justify-between">
              {/* Message Header */}
              <div className="space-y-4 pb-4 border-b border-slate-800/80">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-base sm:text-lg font-bold font-headline text-white leading-snug">
                    {selectedMessage.subject}
                  </h3>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-indigo-400" />
                      {new Date(selectedMessage.date).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                    <button
                      onClick={() => handleDeleteMessage(selectedMessage.uid)}
                      disabled={deletingUid === selectedMessage.uid}
                      title="Delete email from mailbox"
                      className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-[#070b13] border border-slate-800/80 rounded-xl text-xs">
                  <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center font-bold text-sm">
                    {(selectedMessage.replyToName || selectedMessage.fromName).charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <p className="font-bold text-white truncate">
                      {selectedMessage.replyToName || selectedMessage.fromName}
                    </p>
                    <p className="text-indigo-300 font-mono text-[11px] truncate flex items-center gap-1.5">
                      <span>Sender Email:</span>
                      <span className="font-bold text-white">{selectedMessage.replyToEmail || selectedMessage.fromEmail}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Message Body Content */}
              <div className="flex-1 py-2 overflow-y-auto max-h-[300px] custom-scrollbar text-xs text-slate-100 font-medium leading-relaxed space-y-2">
                {selectedMessage.htmlBody ? (
                  <div
                    className="prose prose-invert prose-xs max-w-none text-slate-100"
                    dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }}
                  />
                ) : (
                  <p className="whitespace-pre-wrap font-sans text-slate-100">{selectedMessage.textBody || '(Empty message body)'}</p>
                )}
              </div>

              {/* Reply Composer */}
              <div className="pt-4 border-t border-slate-800/80 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Send Direct Email Reply to Sender</span>
                </h4>

                {replySuccess && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-emerald-300 text-xs flex items-center gap-2 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{replySuccess}</span>
                  </div>
                )}

                {replyError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded-xl text-rose-300 text-xs flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{replyError}</span>
                  </div>
                )}

                <form onSubmit={handleSendReply} className="space-y-3">
                  <textarea
                    rows={4}
                    required
                    value={replyBody}
                    onChange={(e) => setReplyBody(e.target.value)}
                    placeholder={`Type your email response to ${selectedMessage.replyToName || selectedMessage.fromName} (${selectedMessage.replyToEmail || selectedMessage.fromEmail})...`}
                    className="w-full bg-[#070b13] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition resize-y font-medium"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={sendingReply || !replyBody.trim()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{sendingReply ? 'Dispatching Reply...' : 'Dispatch Reply Email'}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center text-xs text-slate-500 space-y-2 my-auto">
              <Inbox className="w-12 h-12 mx-auto text-slate-700" />
              <p>Select an incoming email from the left feed to read details and send a reply.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
