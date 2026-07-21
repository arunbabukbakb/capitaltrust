import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  RefreshCw,
  AlertCircle,
  Inbox
} from 'lucide-react';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'right' | 'center';
  className?: string;
  headerClassName?: string;
  render?: (row: T, index: number) => React.ReactNode;
}

export interface DataTableProps<T> {
  apiUrl: string;
  params?: Record<string, any>;
  columns: ColumnDef<T>[];
  mobileCardRender?: (row: T, index: number) => React.ReactNode;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  keyExtractor?: (row: T, index: number) => string | number;
  emptyMessage?: string;
  loadingMessage?: string;
  onDataLoaded?: (items: T[], total: number, rawResponse: any) => void;
  refreshTrigger?: number | string | boolean;
}

export default function DataTable<T extends Record<string, any>>({
  apiUrl,
  params = {},
  columns,
  mobileCardRender,
  initialPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  keyExtractor,
  emptyMessage = 'No records found.',
  loadingMessage = 'Loading data...',
  onDataLoaded,
  refreshTrigger
}: DataTableProps<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Stringify params for deep comparison in useEffect
  const serializedParams = JSON.stringify(params);

  // Reset to page 1 when filter params or apiUrl change
  useEffect(() => {
    setPage(1);
  }, [apiUrl, serializedParams]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const urlParams = new URLSearchParams();
      urlParams.append('page', String(page));
      urlParams.append('limit', String(pageSize));

      // Append filter parameters
      if (params) {
        Object.keys(params).forEach((key) => {
          const val = params[key];
          if (val !== undefined && val !== null && val !== '') {
            urlParams.append(key, String(val));
          }
        });
      }

      const res = await fetch(`${apiUrl}?${urlParams.toString()}`);
      if (!res.ok) throw new Error('Failed to load table data.');

      const data = await res.json();

      let fetchedItems: T[] = [];
      let fetchedTotal = 0;
      let fetchedTotalPages = 1;

      if (Array.isArray(data)) {
        fetchedItems = data;
        fetchedTotal = data.length;
        fetchedTotalPages = Math.ceil(fetchedTotal / pageSize) || 1;
      } else if (data && typeof data === 'object') {
        fetchedItems = Array.isArray(data.items) ? data.items : [];
        fetchedTotal = Number(data.total || fetchedItems.length);
        fetchedTotalPages = Number(data.totalPages || Math.ceil(fetchedTotal / pageSize) || 1);
      }

      setItems(fetchedItems);
      setTotal(fetchedTotal);
      setTotalPages(fetchedTotalPages);

      if (onDataLoaded) {
        onDataLoaded(fetchedItems, fetchedTotal, data);
      }
    } catch (err: any) {
      console.error('DataTable fetch error:', err);
      setError(err.message || 'Error loading table data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [apiUrl, serializedParams, page, pageSize, refreshTrigger]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = Number(e.target.value);
    setPageSize(newSize);
    setPage(1);
  };

  const fromIndex = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const toIndex = Math.min(page * pageSize, total);

  const getKey = (row: T, index: number): string | number => {
    if (keyExtractor) return keyExtractor(row, index);
    if (row.Id) return row.Id;
    if (row.id) return row.id;
    return index;
  };

  const getAlignClass = (align?: 'left' | 'right' | 'center') => {
    if (align === 'right') return 'text-right';
    if (align === 'center') return 'text-center';
    return 'text-left';
  };

  return (
    <div className="space-y-3">
      {/* Error Alert */}
      {error && (
        <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl text-rose-700 dark:text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden sm:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={`py-3 px-4 ${getAlignClass(col.align)} ${col.headerClassName || ''}`}
                  >
                    {col.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {loading ? (
                <tr>
                  <td colSpan={columns.length} className="py-10 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                    <span>{loadingMessage}</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-10 text-center text-slate-400 font-medium">
                    <Inbox className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                    <span>{emptyMessage}</span>
                  </td>
                </tr>
              ) : (
                items.map((row, idx) => (
                  <tr
                    key={getKey(row, idx)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={`py-3 px-4 ${getAlignClass(col.align)} ${col.className || ''}`}
                      >
                        {col.render ? col.render(row, idx) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE NATIVE CARD LIST VIEW */}
      <div className="block sm:hidden space-y-2.5">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-600" />
            <span>{loadingMessage}</span>
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 font-medium bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
            <Inbox className="w-7 h-7 text-slate-300 dark:text-slate-600 mx-auto mb-1.5" />
            <span>{emptyMessage}</span>
          </div>
        ) : (
          items.map((row, idx) =>
            mobileCardRender ? (
              <React.Fragment key={getKey(row, idx)}>
                {mobileCardRender(row, idx)}
              </React.Fragment>
            ) : (
              <div
                key={getKey(row, idx)}
                className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2 text-xs"
              >
                {columns.map((col) => (
                  <div key={col.key} className="flex justify-between items-center py-0.5">
                    <span className="text-slate-400 font-medium text-[11px]">{col.header}:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {col.render ? col.render(row, idx) : row[col.key]}
                    </span>
                  </div>
                ))}
              </div>
            )
          )
        )}
      </div>

      {/* PAGINATION CONTROLS BAR */}
      <div className="bg-white dark:bg-slate-900 px-2.5 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-row items-center justify-between gap-2 text-xs">
        {/* Records Info */}
        <div className="text-slate-500 dark:text-slate-400 text-[11px] sm:text-xs font-medium shrink-0">
          <span className="hidden sm:inline">Showing </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{fromIndex}-{toIndex}</span>
          <span> of </span>
          <span className="font-bold text-slate-900 dark:text-slate-100">{total}</span>
          <span className="hidden sm:inline"> records</span>
        </div>

        {/* Controls: Page Size & Pagination Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          {/* Page Size Selector */}
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="px-1.5 sm:px-2 py-1 text-[11px] sm:text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-800 dark:text-slate-200 font-semibold focus:outline-none cursor-pointer"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}/p
              </option>
            ))}
          </select>

          {/* Navigation Buttons */}
          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => handlePageChange(1)}
              disabled={page <= 1 || loading}
              className="hidden sm:flex p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="First Page"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1 || loading}
              className="p-1 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1 sm:px-2 font-medium"
              title="Previous Page"
            >
              <ChevronLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Prev</span>
            </button>

            {/* Page Number Indicator */}
            <span className="px-2 py-1 text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
              {page}/{totalPages}
            </span>

            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages || loading}
              className="p-1 sm:p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1 sm:px-2 font-medium"
              title="Next Page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <button
              onClick={() => handlePageChange(totalPages)}
              disabled={page >= totalPages || loading}
              className="hidden sm:flex p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Last Page"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
