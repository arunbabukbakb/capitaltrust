import React, { useState, useEffect } from 'react';
import {
  Activity,
  Zap,
  TrendingUp,
  Gauge,
  Search,
  RefreshCw,
  Play,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Clock,
  Cpu,
  Server,
  Sliders,
  ArrowUpRight,
  Filter,
  BarChart2,
  Info,
  X,
  ShieldAlert,
  Terminal
} from 'lucide-react';

interface Tenant {
  id: string | number;
  name: string;
  subdomain: string;
  isActive: number;
}

interface PageResult {
  id: string;
  name: string;
  path: string;
  category: string;
  concurrency: number;
  avgLatencyMs: number;
  minLatencyMs: number;
  maxLatencyMs: number;
  successCount: number;
  errorCount: number;
  errorRatePercent: number;
  throughputReqSec: number;
  avgPayloadKb: number;
  grade: 'Fast' | 'Good' | 'Moderate' | 'Slow';
  errors?: string[];
  testedAt: string;
}

interface ProbeMeta {
  tenantId: number;
  tenantName: string;
  tenantSubdomain: string;
  concurrency: number;
  totalRequestsExecuted: number;
  totalPagesTested: number;
  totalExecutionTimeMs: number;
  overallAvgLatencyMs: number;
  overallErrorCount: number;
  testedAt: string;
}

interface TelemetryLog {
  id: string;
  tenantId: string | number;
  tenantSubdomain: string;
  pagePath: string;
  pageTitle: string;
  responseTimeMs: number;
  statusCode: number;
  deviceType: string;
  timestamp: string;
}

export default function TrafficDashboard() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('1');
  const [concurrency, setConcurrency] = useState<number>(10);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isProbing, setIsProbing] = useState<boolean>(false);

  const [probeMeta, setProbeMeta] = useState<ProbeMeta | null>(null);
  const [pageResults, setPageResults] = useState<PageResult[]>([]);
  const [liveLogs, setLiveLogs] = useState<TelemetryLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Modal State for Error Inspection
  const [selectedErrorPage, setSelectedErrorPage] = useState<PageResult | null>(null);
  const [showAllErrorsModal, setShowAllErrorsModal] = useState<boolean>(false);

  // Fetch Tenants List
  useEffect(() => {
    const fetchTenants = async () => {
      try {
        const res = await fetch('/api/super-admin/tenants');
        if (res.ok) {
          const data = await res.json();
          setTenants(data);
        }
      } catch (err) {
        console.error('Error fetching tenants list:', err);
      }
    };
    fetchTenants();
  }, []);

  // Fetch In-Memory Live Telemetry Metrics
  const fetchLiveMetrics = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await fetch(`/api/traffic/metrics?tenantId=${selectedTenantId}`);
      if (res.ok) {
        const data = await res.json();
        setLiveLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error('Error fetching live metrics:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchLiveMetrics();
    const interval = setInterval(fetchLiveMetrics, 10000); // refresh every 10s
    return () => clearInterval(interval);
  }, [selectedTenantId]);

  // Run Live Concurrent Request Performance Probe
  const handleRunProbe = async () => {
    setIsProbing(true);
    setErrorMsg(null);
    try {
      const targetTenant = tenants.find(t => String(t.id) === selectedTenantId);
      const payload = {
        tenantId: selectedTenantId,
        subdomain: targetTenant?.subdomain || 'demo',
        concurrency
      };

      const res = await fetch('/api/traffic/probe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error('Failed to run performance probe');
      }

      const data = await res.json();
      setProbeMeta(data.probeMeta);
      setPageResults(data.pageResults || []);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error running performance check');
    } finally {
      setIsProbing(false);
    }
  };

  // Clear In-Memory Telemetry Stream
  const handleClearLogs = async () => {
    try {
      await fetch('/api/traffic/metrics', { method: 'DELETE' });
      setLiveLogs([]);
    } catch (err) {
      console.error('Failed to clear logs', err);
    }
  };

  // Auto-run an initial probe on mount
  useEffect(() => {
    handleRunProbe();
  }, [selectedTenantId]);

  const filteredPages = pageResults.filter(
    p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
         p.path.toLowerCase().includes(searchQuery.toLowerCase()) ||
         p.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const pagesWithErrors = pageResults.filter(p => p.errorCount > 0);

  const getGradeBadge = (grade: string, page: PageResult) => {
    if (page.errorCount > 0) {
      return (
        <button
          onClick={() => setSelectedErrorPage(page)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-all cursor-pointer"
          title="Click to view error details"
        >
          <AlertTriangle className="w-3 h-3 text-rose-400" />
          <span>{page.errorCount} Errors (View Details)</span>
        </button>
      );
    }

    switch (grade) {
      case 'Fast':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400/30" /> ⚡ Fast (&lt;150ms)
          </span>
        );
      case 'Good':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <CheckCircle2 className="w-3 h-3 text-cyan-400" /> 🟢 Good (150-300ms)
          </span>
        );
      case 'Moderate':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 text-amber-400" /> 🟡 Moderate (300-600ms)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-extrabold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> 🔴 Slow (&gt;600ms)
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl backdrop-blur-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-1 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-headline">
              Traffic & Page Performance Inspector
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl pl-1">
            Analyze individual customer pages performance in real-time. Test response latency and stress limits with configurable concurrent requests — strictly in-memory with zero database storage.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10">
          <button
            onClick={handleRunProbe}
            disabled={isProbing}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-cyan-500 hover:from-indigo-600 hover:to-cyan-600 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-500/25 transition-all transform hover:-translate-y-0.5 disabled:opacity-50 cursor-pointer"
          >
            {isProbing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Running Concurrency Probe...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                <span>Run Live Performance Check</span>
              </>
            )}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3 text-rose-400 text-xs font-bold">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Control & Filter Panel */}
      <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-xl space-y-6">
        <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-widest">
          <Sliders className="w-4 h-4" />
          <span>Test Configuration & Target Workspace</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Customer Workspace Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              Target Customer Workspace
            </label>
            <select
              value={selectedTenantId}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-indigo-500 transition-colors"
            >
              <option value="1">Demo / CapitalTrust Default Workspace (demo)</option>
              {tenants.map((t) => (
                <option key={t.id} value={String(t.id)}>
                  {t.name} ({t.subdomain}) - {t.isActive ? 'Active' : 'Suspended'}
                </option>
              ))}
            </select>
          </div>

          {/* Concurrent Request Count Configurator */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Concurrent Requests Count
              </label>
              <span className="px-2.5 py-0.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black rounded-lg font-mono">
                {concurrency} Concurrent Reqs
              </span>
            </div>
            <div className="flex items-center gap-2">
              {[1, 10, 50, 100, 250, 500].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setConcurrency(num)}
                  className={`px-2 py-2.5 rounded-xl text-[11px] font-black transition-all cursor-pointer border flex-1 ${
                    concurrency === num
                      ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/20 border-cyan-500 text-white shadow-xs'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  {num}x
                </button>
              ))}
              {/* Custom Manual Entry Input */}
              <div className="relative w-24 flex-shrink-0">
                <input
                  type="number"
                  min={1}
                  max={1000}
                  placeholder="Custom"
                  value={concurrency}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setConcurrency(isNaN(val) ? 1 : Math.max(1, Math.min(1000, val)));
                  }}
                  className="w-full px-2 py-2 bg-slate-950 border border-cyan-500/40 rounded-xl text-xs font-black font-mono text-cyan-300 text-center focus:outline-none focus:border-cyan-400"
                  title="Type custom concurrency count (1 - 1000)"
                />
              </div>
            </div>
          </div>

          {/* Search Filter */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
              <Search className="w-4 h-4 text-emerald-400" />
              Filter Customer Pages
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search page route or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-bold text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Top Overview Metric Cards */}
      {probeMeta && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Overall Avg Latency</span>
              <Gauge className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{probeMeta.overallAvgLatencyMs}</span>
              <span className="text-xs text-slate-400 font-bold">ms</span>
            </div>
            <p className="text-[10px] text-indigo-300 font-semibold truncate">
              {probeMeta.tenantName} ({probeMeta.tenantSubdomain})
            </p>
          </div>

          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Concurrent Load Fired</span>
              <Server className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{probeMeta.totalRequestsExecuted}</span>
              <span className="text-xs text-slate-400 font-bold">reqs</span>
            </div>
            <p className="text-[10px] text-cyan-300 font-semibold">
              {probeMeta.concurrency} parallel calls across {probeMeta.totalPagesTested} pages
            </p>
          </div>

          <div className="p-5 bg-slate-900/40 border border-slate-800/80 rounded-2xl backdrop-blur-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Total Test Time</span>
              <Clock className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white font-mono">{probeMeta.totalExecutionTimeMs}</span>
              <span className="text-xs text-slate-400 font-bold">ms</span>
            </div>
            <p className="text-[10px] text-emerald-300 font-semibold">
              Completed at {new Date(probeMeta.testedAt).toLocaleTimeString()}
            </p>
          </div>

          {/* Error Rate Metric Card with Clickable Error Inspector */}
          <div
            onClick={() => probeMeta.overallErrorCount > 0 && setShowAllErrorsModal(true)}
            className={`p-5 bg-slate-900/40 border rounded-2xl backdrop-blur-xl space-y-2 transition-all ${
              probeMeta.overallErrorCount > 0
                ? 'border-rose-500/40 hover:border-rose-500/80 cursor-pointer shadow-lg shadow-rose-500/5'
                : 'border-slate-800/80'
            }`}
          >
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold">
              <span>Error Rate</span>
              <AlertTriangle className={`w-4 h-4 ${probeMeta.overallErrorCount > 0 ? 'text-rose-400 animate-pulse' : 'text-slate-500'}`} />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-black font-mono ${probeMeta.overallErrorCount > 0 ? 'text-rose-400' : 'text-white'}`}>
                {probeMeta.overallErrorCount}
              </span>
              <span className="text-xs text-slate-400 font-bold">failures</span>
            </div>
            <div className="flex items-center justify-between pt-0.5">
              <p className="text-[10px] text-rose-300 font-semibold">
                {probeMeta.overallErrorCount === 0 ? '100% Success SLA' : 'Click to inspect error details 🔍'}
              </p>
              {probeMeta.overallErrorCount > 0 && (
                <span className="text-[10px] font-black underline text-rose-400 flex items-center gap-0.5">
                  Inspect <ArrowUpRight className="w-3 h-3" />
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Individual Customer Pages Performance Matrix Table */}
      <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-headline flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-400" />
              Individual Customer Pages Performance Breakdown
            </h3>
            <p className="text-xs text-slate-400">
              Latency, throughput, and error metrics for individual pages under {concurrency} concurrent requests
            </p>
          </div>

          <div className="flex items-center gap-2">
            {pagesWithErrors.length > 0 && (
              <button
                onClick={() => setShowAllErrorsModal(true)}
                className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>View All Error Logs ({probeMeta?.overallErrorCount})</span>
              </button>
            )}
            <span className="text-xs text-slate-400 font-mono font-bold bg-slate-950/60 border border-slate-800 px-3 py-1.5 rounded-xl">
              {filteredPages.length} Pages Tested
            </span>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3.5 px-4">Customer Page</th>
                <th className="py-3.5 px-4">Route Path</th>
                <th className="py-3.5 px-4">Category</th>
                <th className="py-3.5 px-4">Avg Latency</th>
                <th className="py-3.5 px-4">Min / Max</th>
                <th className="py-3.5 px-4">Throughput</th>
                <th className="py-3.5 px-4">Avg Payload</th>
                <th className="py-3.5 px-4">Health Grade / Errors</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredPages.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-500 text-xs">
                    {isProbing ? 'Running concurrent performance test...' : 'No customer page metrics available.'}
                  </td>
                </tr>
              ) : (
                filteredPages.map((page) => (
                  <tr key={page.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-white">
                      <div className="flex items-center gap-2">
                        <span>{page.name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-indigo-300">
                      {page.path}
                    </td>
                    <td className="py-3.5 px-4 text-slate-400">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-[10px] rounded-md font-medium text-slate-300">
                        {page.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      <span className={page.avgLatencyMs > 300 ? 'text-amber-400' : 'text-emerald-400'}>
                        {page.avgLatencyMs} ms
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {page.minLatencyMs}ms / {page.maxLatencyMs}ms
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-cyan-400">
                      {page.throughputReqSec} req/s
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400">
                      {page.avgPayloadKb} KB
                    </td>
                    <td className="py-3.5 px-4">
                      {getGradeBadge(page.grade, page)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* In-Memory Transient Active Traffic Stream */}
      <div className="p-6 bg-slate-900/40 border border-slate-800/80 rounded-3xl backdrop-blur-xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-headline flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Transient Active Traffic Stream (In-Memory Only)
            </h3>
            <p className="text-xs text-slate-400">
              Live incoming page views from active users (max 100 volatile events, zero database storage)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLiveMetrics}
              disabled={isLoadingLogs}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              title="Refresh Telemetry"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Feed</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Workspace Subdomain</th>
                <th className="py-3 px-4">Page Visited</th>
                <th className="py-3 px-4">Latency</th>
                <th className="py-3 px-4">Device</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {liveLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 text-xs">
                    No active user telemetry captured yet. Open customer pages in another tab to see live hits populate in real time!
                  </td>
                </tr>
              ) : (
                liveLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="py-3 px-4 text-indigo-400 font-bold font-mono">
                      {log.tenantSubdomain}
                    </td>
                    <td className="py-3 px-4 text-white font-mono">
                      {log.pagePath}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-cyan-400">
                      {log.responseTimeMs} ms
                    </td>
                    <td className="py-3 px-4 text-slate-300">
                      {log.deviceType}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {log.statusCode} OK
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SINGLE PAGE ERROR DETAILS MODAL */}
      {selectedErrorPage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-scale-up">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-headline">{selectedErrorPage.name} - Error Details</h3>
                  <p className="text-xs font-mono text-indigo-300">{selectedErrorPage.path}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedErrorPage(null)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Failed Requests</span>
                  <p className="text-lg font-black text-rose-400 font-mono">
                    {selectedErrorPage.errorCount} / {selectedErrorPage.concurrency} failed ({selectedErrorPage.errorRatePercent}%)
                  </p>
                </div>
                <div className="p-4 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Latency Range</span>
                  <p className="text-lg font-black text-white font-mono">
                    {selectedErrorPage.minLatencyMs}ms - {selectedErrorPage.maxLatencyMs}ms
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-rose-400" />
                  Captured Exception / Error Log Messages:
                </label>
                <div className="p-4 bg-slate-950 border border-rose-500/30 rounded-xl font-mono text-xs text-rose-300 space-y-2 max-h-60 overflow-y-auto">
                  {selectedErrorPage.errors && selectedErrorPage.errors.length > 0 ? (
                    selectedErrorPage.errors.map((err, idx) => (
                      <div key={idx} className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                        <span className="break-all">{err}</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-400 italic">
                      High latency threshold exceeded (&gt;600ms) or database connection queue bottleneck during {selectedErrorPage.concurrency} concurrent calls.
                    </div>
                  )}
                </div>
              </div>

              {/* Diagnostic Recommendation */}
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-indigo-300 flex items-center gap-2">
                  <Info className="w-4 h-4 text-indigo-400" />
                  System Optimization Advice:
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  When testing with 100 concurrent requests, MySQL connection pool limits or request queues can experience connection timeouts. We have automatically upgraded the database pool capacity to 50 concurrent connections to handle high stress testing.
                </p>
              </div>
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setSelectedErrorPage(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ALL ERRORS INSPECTION MODAL */}
      {showAllErrorsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-scale-up">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl relative text-white max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold font-headline">Complete Concurrency Error Log Report</h3>
                  <p className="text-xs text-slate-400">
                    Detailed error trace across all customer pages during {concurrency} concurrent load test
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAllErrorsModal(false)}
                className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              {pagesWithErrors.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  No errors detected! All pages passed with 100% success SLA.
                </div>
              ) : (
                pagesWithErrors.map((page) => (
                  <div key={page.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{page.name}</span>
                        <span className="font-mono text-[11px] text-indigo-300">{page.path}</span>
                      </div>
                      <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg text-xs font-mono font-bold">
                        {page.errorCount} / {page.concurrency} Failures ({page.errorRatePercent}%)
                      </span>
                    </div>

                    <div className="p-3 bg-slate-900/80 border border-rose-500/20 rounded-xl font-mono text-xs text-rose-300 space-y-1.5">
                      {page.errors && page.errors.length > 0 ? (
                        page.errors.map((err, i) => (
                          <div key={i} className="flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0 mt-0.5" />
                            <span className="break-all text-[11px]">{err}</span>
                          </div>
                        ))
                      ) : (
                        <div className="text-slate-400 text-[11px] italic">
                          Connection bottleneck / Query timeout under {page.concurrency} parallel requests.
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 flex items-center justify-between flex-shrink-0">
              <div className="text-[11px] text-slate-400">
                Found <span className="text-rose-400 font-bold">{probeMeta?.overallErrorCount}</span> total request exceptions
              </div>
              <button
                onClick={() => setShowAllErrorsModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
