import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { IndianRupee, Percent, Calendar, Save, RefreshCw, AlertTriangle, Check } from 'lucide-react';

export default function AdminPricing() {
  const navigate = useNavigate();

  const [price, setPrice] = useState('0');
  const [tax, setTax] = useState('0');
  const [amc, setAmc] = useState('0');
  
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) {
      navigate('/admin/login');
      return;
    }

    fetchPricing();
  }, [navigate]);

  const fetchPricing = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/super-admin/price');
      if (res.status === 401 || res.status === 403) {
        navigate('/admin/login');
        return;
      }
      if (!res.ok) {
        throw new Error('Failed to load pricing parameters.');
      }
      const data = await res.json();
      setPrice(String(data.price || 0));
      setTax(String(data.tax || 0));
      setAmc(String(data.amc || 0));
    } catch (err: any) {
      setError(err.message || 'Error fetching pricing configurations.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/super-admin/price', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          price: Number(price) || 0,
          tax: Number(tax) || 0,
          amc: Number(amc) || 0
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update pricing metrics.');
      }

      setSuccess('Pricing settings successfully updated!');
    } catch (err: any) {
      setError(err.message || 'Error saving pricing configuration.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-3 sm:p-8 max-w-2xl mx-auto space-y-4 sm:space-y-6 font-sans text-slate-200">
      <div>
        <h3 className="text-lg sm:text-2xl font-bold text-white font-headline">Pricing & Licensing Settings</h3>
        <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">Configure workspace subscription cost, percentage tax metrics, and annual maintenance charges.</p>
      </div>

      <div className="bg-[#0d1322] border border-slate-800/85 rounded-2xl p-4 sm:p-8 shadow-xl space-y-4 sm:space-y-6">
        
        {loading ? (
          <div className="py-12 text-center text-slate-500 font-bold">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-400" />
            <span>Loading pricing schema parameters...</span>
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex gap-2 text-xs font-semibold items-center animate-shake">
                <AlertTriangle className="w-4.5 h-4.5 text-red-500 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-emerald-500/10 border border-emerald-555/20 text-emerald-400 rounded-xl p-4 flex gap-2 text-xs font-semibold items-center animate-pulse">
                <Check className="w-4.5 h-4.5 text-emerald-500 flex-shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Price Row */}
              <div className="space-y-1">
                <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
                  Base Registration Price (₹)
                </label>
                <p className="text-[10px] text-slate-500 mb-1">Standard cost applied immediately upon workspace creation.</p>
                <div className="relative">
                  <IndianRupee className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-955/40 border border-slate-800/80 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              {/* Tax Row */}
              <div className="space-y-1">
                <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
                  Tax Percentage (%)
                </label>
                <p className="text-[10px] text-slate-500 mb-1">The value added tax (VAT) percentage applied to service licensing.</p>
                <div className="relative">
                  <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    placeholder="0.00"
                    value={tax}
                    onChange={(e) => setTax(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-955/40 border border-slate-800/80 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              {/* AMC Row */}
              <div className="space-y-1">
                <label className="block text-[8px] sm:text-[9px] uppercase font-bold tracking-wider text-slate-400">
                  Annual Maintenance Cost (₹)
                </label>
                <p className="text-[10px] text-slate-500 mb-1">Yearly subscription service charge to retain system server support.</p>
                <div className="relative">
                  <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-550" />
                  <input
                    required
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={amc}
                    onChange={(e) => setAmc(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-955/40 border border-slate-800/80 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-indigo-500 transition font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Update Pricing Parameters</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
