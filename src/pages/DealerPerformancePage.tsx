import { useState, useMemo } from 'react';
import { useCustomers } from '../context/CustomerContext';
import { useSales } from '../context/SalesContext';
import { TrendingUp, Target, Trophy, RefreshCw, Medal } from 'lucide-react';

const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };
const today = () => new Date().toISOString().split('T')[0];

function fmtINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}
function pct(val: number, total: number) {
  if (!total) return 0;
  return Math.round((val / total) * 100);
}

type StatusKey = 'Low' | 'Average' | 'Near Target' | 'Achieved';

function getStatus(achievement: number): StatusKey {
  if (achievement >= 100) return 'Achieved';
  if (achievement >= 81)  return 'Near Target';
  if (achievement >= 51)  return 'Average';
  return 'Low';
}

const STATUS_STYLE: Record<StatusKey, string> = {
  'Low':         'bg-red-100 text-red-700',
  'Average':     'bg-yellow-100 text-yellow-700',
  'Near Target': 'bg-orange-100 text-orange-700',
  'Achieved':    'bg-green-100 text-green-700',
};
const STATUS_BAR: Record<StatusKey, string> = {
  'Low':         'bg-red-400',
  'Average':     'bg-yellow-400',
  'Near Target': 'bg-orange-400',
  'Achieved':    'bg-green-500',
};

const RANK_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
const RANK_ICONS  = ['🥇', '🥈', '🥉'];

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-xl shadow p-5 border-l-4 ${color}`}>
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export function DealerPerformancePage() {
  const { customers } = useCustomers();
  const { invoices, fetchInvoices } = useSales();

  const [globalTarget, setGlobalTarget] = useState(500000);
  const [targetInput, setTargetInput]   = useState('500000');
  const [editingTarget, setEditingTarget] = useState(false);
  const [dateFrom, setDateFrom] = useState(monthStart());
  const [dateTo,   setDateTo]   = useState(today());
  const [filterType, setFilterType] = useState('');

  const applyTarget = () => {
    const v = Number(targetInput);
    if (v > 0) { setGlobalTarget(v); setEditingTarget(false); }
  };

  const dealerTypes = useMemo(() => [...new Set(customers.map(c => c.dealer_type).filter(Boolean))], [customers]);

  // Per-dealer sales in date range
  const dealerStats = useMemo(() => {
    const filtered = customers.filter(c => !filterType || c.dealer_type === filterType);
    return filtered.map(c => {
      const cInvoices = invoices.filter(inv =>
        inv.customer_id === c.id &&
        inv.invoice_date >= dateFrom &&
        inv.invoice_date <= dateTo
      );
      const totalSales = cInvoices.reduce((s, inv) => s + Number(inv.total_amount), 0);
      const invoiceCount = cInvoices.length;
      const achievement = pct(totalSales, globalTarget);
      const status = getStatus(achievement);
      const remaining = Math.max(0, globalTarget - totalSales);
      return { customer: c, totalSales, invoiceCount, achievement, status, remaining };
    })
      .filter(d => d.totalSales > 0 || true) // keep all for ranking
      .sort((a, b) => b.totalSales - a.totalSales);
  }, [customers, invoices, dateFrom, dateTo, globalTarget, filterType]);

  const top10 = dealerStats.slice(0, 10);
  const maxSales = top10[0]?.totalSales || 1;

  const totalSalesAll   = dealerStats.reduce((s, d) => s + d.totalSales, 0);
  const achievedCount   = dealerStats.filter(d => d.achievement >= 100).length;
  const nearTargetCount = dealerStats.filter(d => d.achievement >= 81 && d.achievement < 100).length;
  const avgAchievement  = dealerStats.length
    ? Math.round(dealerStats.reduce((s, d) => s + d.achievement, 0) / dealerStats.length)
    : 0;

  return (
    <div className="p-4 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
            <TrendingUp className="text-blue-600" size={32} />
            Dealer Performance Tracker
          </h1>
          <p className="text-gray-500 text-sm mt-1">Ranking · Target vs Achievement · Sales Analysis</p>
        </div>
        <button onClick={fetchInvoices} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Global Target + Filters */}
      <div className="bg-white rounded-xl shadow p-4 mb-6 flex flex-wrap gap-4 items-end">
        {/* Target */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Global Target (₹)</label>
          {editingTarget ? (
            <div className="flex gap-2">
              <input
                type="number" min="1"
                className="px-3 py-2 border border-blue-400 rounded-lg text-sm w-40 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={targetInput}
                onChange={e => setTargetInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyTarget()}
                autoFocus
              />
              <button onClick={applyTarget}
                className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition">
                Set
              </button>
              <button onClick={() => setEditingTarget(false)}
                className="px-3 py-2 border border-gray-300 text-gray-600 text-sm rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
            </div>
          ) : (
            <button onClick={() => { setTargetInput(String(globalTarget)); setEditingTarget(true); }}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-bold border border-blue-200 transition">
              <Target size={14} />
              {fmtINR(globalTarget)}
              <span className="text-xs font-normal text-blue-500">(click to change)</span>
            </button>
          )}
        </div>

        {/* Date From */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">From</label>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">To</label>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>

        {/* Dealer Type */}
        {dealerTypes.length > 0 && (
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 uppercase tracking-wide">Dealer Type</label>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">All Types</option>
              {dealerTypes.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Dealers"   value={String(dealerStats.length)}           color="border-blue-600" />
        <StatCard label="Total Sales"     value={fmtINR(totalSalesAll)}               color="border-blue-500" />
        <StatCard label="Achieved Target" value={`${achievedCount} dealers`}           color="border-green-500" />
        <StatCard label="Avg Achievement" value={`${avgAchievement}%`}
          sub={`${nearTargetCount} near target`}                                        color="border-purple-500" />
      </div>

      {/* ── Top 10 Horizontal Bar Chart ── */}
      {top10.length > 0 && (
        <div className="bg-white rounded-xl shadow p-6 mb-8">
          <h2 className="text-base font-bold text-gray-900 mb-5 flex items-center gap-2">
            <Trophy size={18} className="text-yellow-500" />
            Top 10 Dealers by Sales
          </h2>
          <div className="space-y-3">
            {top10.map((d, idx) => {
              const barPct = Math.round((d.totalSales / maxSales) * 100);
              const status = d.status;
              return (
                <div key={d.customer.id} className="flex items-center gap-3">
                  {/* Rank */}
                  <span className="w-7 text-center text-base shrink-0">
                    {idx < 3 ? RANK_ICONS[idx] : <span className="text-xs text-gray-400 font-bold">#{idx + 1}</span>}
                  </span>
                  {/* Name */}
                  <span className="w-40 text-sm font-medium text-gray-800 truncate shrink-0">{d.customer.name}</span>
                  {/* Bar */}
                  <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden relative">
                    <div
                      className={`h-5 rounded-full flex items-center justify-end pr-2 transition-all ${STATUS_BAR[status]}`}
                      style={{ width: `${barPct}%`, minWidth: d.totalSales > 0 ? 40 : 0 }}
                    >
                      {barPct > 20 && (
                        <span className="text-white text-xs font-semibold">{fmtINR(d.totalSales)}</span>
                      )}
                    </div>
                  </div>
                  {/* Pct */}
                  <span className={`text-xs font-bold w-14 text-right shrink-0 ${
                    d.achievement >= 100 ? 'text-green-600' :
                    d.achievement >= 81  ? 'text-orange-500' :
                    d.achievement >= 51  ? 'text-yellow-600' : 'text-red-500'
                  }`}>{d.achievement}%</span>
                </div>
              );
            })}
          </div>
          {/* Target reference line label */}
          <p className="text-xs text-gray-400 mt-4">Bar width = share of #1 dealer. Achievement % = vs global target of {fmtINR(globalTarget)}</p>
        </div>
      )}

      {/* ── Ranked Table ── */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <Medal size={16} className="text-blue-600" />
          <h2 className="text-base font-bold text-gray-900">Dealer Rankings</h2>
          <span className="ml-auto text-xs text-gray-400">{dealerStats.length} dealers</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                {['Rank', 'Dealer Name', 'Type', 'Invoices', 'Total Sales', 'Target', 'Achievement', 'Remaining', 'Progress', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dealerStats.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-gray-400">No dealer data found for this period.</td></tr>
              ) : (
                dealerStats.map((d, idx) => {
                  const status = d.status;
                  const barPct = Math.min(100, d.achievement);
                  return (
                    <tr key={d.customer.id} className={`hover:bg-gray-50 ${idx < 3 ? 'bg-yellow-50/30' : ''}`}>
                      {/* Rank */}
                      <td className="px-4 py-3 text-center">
                        {idx < 3 ? (
                          <span className="text-xl">{RANK_ICONS[idx]}</span>
                        ) : (
                          <span className="text-sm font-bold text-gray-400">#{idx + 1}</span>
                        )}
                      </td>
                      {/* Name */}
                      <td className="px-4 py-3">
                        <span className={`font-semibold ${idx === 0 ? 'text-yellow-700' : 'text-gray-900'}`}>
                          {d.customer.name}
                        </span>
                        {idx === 0 && <span className="ml-1 text-xs text-yellow-500 font-bold">TOP</span>}
                        <p className="text-xs text-gray-400">{d.customer.city}</p>
                      </td>
                      {/* Type */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">{d.customer.dealer_type}</span>
                      </td>
                      {/* Invoices */}
                      <td className="px-4 py-3 text-center text-gray-600">{d.invoiceCount}</td>
                      {/* Total Sales */}
                      <td className="px-4 py-3 font-bold text-gray-900 whitespace-nowrap">{fmtINR(d.totalSales)}</td>
                      {/* Target */}
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{fmtINR(globalTarget)}</td>
                      {/* Achievement % */}
                      <td className="px-4 py-3 font-bold text-lg whitespace-nowrap">
                        <span className={
                          d.achievement >= 100 ? 'text-green-600' :
                          d.achievement >= 81  ? 'text-orange-500' :
                          d.achievement >= 51  ? 'text-yellow-600' : 'text-red-500'
                        }>{d.achievement}%</span>
                      </td>
                      {/* Remaining */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {d.remaining === 0
                          ? <span className="text-green-600 font-semibold">✓ Done</span>
                          : <span className="text-orange-600">{fmtINR(d.remaining)}</span>}
                      </td>
                      {/* Progress bar */}
                      <td className="px-4 py-3 w-36">
                        <div className="bg-gray-100 rounded-full h-2 w-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full ${STATUS_BAR[status]}`}
                            style={{ width: `${barPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{barPct}%</p>
                      </td>
                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${STATUS_STYLE[status]}`}>
                          {status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Footer totals */}
            {dealerStats.length > 0 && (
              <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                <tr>
                  <td colSpan={4} className="px-4 py-3 font-bold text-gray-800 text-sm">
                    TOTAL — {dealerStats.length} dealers
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">{fmtINR(totalSalesAll)}</td>
                  <td className="px-4 py-3 text-gray-500">—</td>
                  <td className="px-4 py-3 font-bold text-blue-700">{avgAchievement}% avg</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {(Object.entries(STATUS_STYLE) as [StatusKey, string][]).map(([s, cls]) => (
          <span key={s} className={`px-3 py-1 rounded-full text-xs font-semibold ${cls}`}>
            {s === 'Low' ? '0–50%' : s === 'Average' ? '51–80%' : s === 'Near Target' ? '81–99%' : '100%+'} — {s}
          </span>
        ))}
      </div>

      {/* Debug Panel */}
      <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 mt-6 space-y-1">
        <div>Data Source: External Supabase — customers + sales_invoices</div>
        <div>Dealers: {customers.length} | Invoices cross-referenced: {invoices.length}</div>
        <div>Date Range: {dateFrom} → {dateTo}</div>
        <div>Global Target: {fmtINR(globalTarget)} (session only — resets on page reload)</div>
      </div>
    </div>
  );
}
