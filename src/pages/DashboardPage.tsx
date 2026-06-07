import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import {
  TrendingUp, Users, Package, ShoppingCart, AlertCircle,
  Factory, Banknote, Warehouse, RefreshCw, Medal,
} from 'lucide-react';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { useSales } from '../context/SalesContext';
import { useProduction } from '../context/ProductionContext';
import { usePayments } from '../context/PaymentContext';
import { useStock } from '../context/StockContext';
import { useMemo } from 'react';

const SUPABASE_URL = 'https://tkkxhjfzgnnpgxluqkwx.supabase.co';

const today = () => new Date().toISOString().split('T')[0];

function fmtINR(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────
const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-medium">
          {p.name}: {fmtINR(Number(p.value))}
        </p>
      ))}
    </div>
  );
};

export function DashboardPage() {
  const { customers } = useCustomers();
  const { products } = useProducts();
  const { invoices } = useSales();
  const { entries } = useProduction();
  const { payments } = usePayments();
  const { stockLevels } = useStock();

  const todayStr = today();

  // ── KPI calculations ─────────────────────────────────────────────────────
  const totalSales     = useMemo(() => invoices.reduce((s, i) => s + Number(i.total_amount), 0), [invoices]);
  const totalCollect   = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const totalOutstand  = useMemo(() => customers.reduce((s, c) => s + Number(c.current_outstanding ?? 0), 0), [customers]);
  const todaySales     = useMemo(() => invoices.filter(i => i.invoice_date === todayStr).reduce((s, i) => s + Number(i.total_amount), 0), [invoices, todayStr]);
  const todayCollect   = useMemo(() => payments.filter(p => p.payment_date === todayStr).reduce((s, p) => s + Number(p.amount), 0), [payments, todayStr]);
  const todayProd      = useMemo(() => entries.filter(e => e.production_date === todayStr).reduce((s, e) => s + e.quantity, 0), [entries, todayStr]);
  const currentStock   = useMemo(() => stockLevels.reduce((s, sl) => s + sl.current_stock, 0), [stockLevels]);

  // ── Monthly Sales chart (12 months) ──────────────────────────────────────
  const monthlySalesData = useMemo(() => {
    const months: Record<string, { month: string; sales: number; invoices: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), sales: 0, invoices: 0 };
    }
    for (const inv of invoices) {
      const key = inv.invoice_date.slice(0, 7);
      if (months[key]) { months[key].sales += Number(inv.total_amount); months[key].invoices += 1; }
    }
    return Object.values(months);
  }, [invoices]);

  // ── Monthly Collections chart (12 months) ────────────────────────────────
  const monthlyCollectData = useMemo(() => {
    const months: Record<string, { month: string; collections: number }> = {};
    const now = new Date();
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      months[key] = { month: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }), collections: 0 };
    }
    for (const p of payments) {
      const key = p.payment_date.slice(0, 7);
      if (months[key]) months[key].collections += Number(p.amount);
    }
    return Object.values(months);
  }, [payments]);

  // ── Top 10 customers by outstanding ──────────────────────────────────────
  const topCustomers = useMemo(() =>
    [...customers]
      .filter(c => Number(c.current_outstanding) > 0)
      .sort((a, b) => Number(b.current_outstanding) - Number(a.current_outstanding))
      .slice(0, 10),
    [customers]
  );

  // ── Top selling products (by total qty from invoice items) ────────────────
  const topProducts = useMemo(() => {
    const map: Record<string, { product_id: string; qty: number; revenue: number }> = {};
    for (const inv of invoices) {
      for (const item of (inv.items ?? [])) {
        if (!map[item.product_id]) map[item.product_id] = { product_id: item.product_id, qty: 0, revenue: 0 };
        map[item.product_id].qty += Number(item.quantity);
        map[item.product_id].revenue += Number(item.amount);
      }
    }
    const productMap: Record<string, string> = {};
    for (const p of products) productMap[p.id] = p.name;
    return Object.values(map)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10)
      .map(r => ({ ...r, name: productMap[r.product_id] ?? 'Unknown' }));
  }, [invoices, products]);

  // ── Stat cards config ─────────────────────────────────────────────────────
  const statsRow1 = [
    { label: 'Total Customers',   value: String(customers.length),       sub: `${customers.filter(c => Number(c.current_outstanding) > 0).length} with outstanding`, icon: Users,        color: 'bg-sky-500',    border: 'border-sky-500'    },
    { label: 'Total Products',    value: String(products.length),        sub: 'in catalogue',                                                                       icon: Package,      color: 'bg-yellow-500', border: 'border-yellow-500' },
    { label: 'Current Stock',     value: String(currentStock),           sub: `${stockLevels.length} product(s) tracked`,                                          icon: Warehouse,    color: 'bg-violet-500', border: 'border-violet-500' },
    { label: 'Total Sales',       value: fmtINR(totalSales),             sub: `${invoices.length} invoice(s)`,                                                     icon: ShoppingCart, color: 'bg-blue-600',   border: 'border-blue-600'   },
  ];
  const statsRow2 = [
    { label: 'Total Collections', value: fmtINR(totalCollect),           sub: `${payments.length} payment(s)`,                                                     icon: Banknote,     color: 'bg-emerald-600', border: 'border-emerald-600' },
    { label: 'Total Outstanding', value: fmtINR(totalOutstand),          sub: `across ${customers.filter(c => Number(c.current_outstanding) > 0).length} customer(s)`, icon: AlertCircle, color: 'bg-orange-500', border: 'border-orange-500' },
    { label: "Today's Production",value: String(todayProd),              sub: `${entries.filter(e => e.production_date === todayStr).length} entr(ies) today`,      icon: Factory,      color: 'bg-purple-600', border: 'border-purple-600'  },
    { label: "Today's Sales",     value: fmtINR(todaySales),             sub: `${invoices.filter(i => i.invoice_date === todayStr).length} invoice(s) · Collected: ${fmtINR(todayCollect)}`, icon: TrendingUp, color: 'bg-indigo-600', border: 'border-indigo-600' },
  ];

  const refreshAll = () => {
    window.location.reload();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Management Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Live data from Supabase · {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
        </div>
        <button
          onClick={refreshAll}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition text-sm shadow-sm"
        >
          <RefreshCw size={15} /> Refresh All
        </button>
      </div>

      {/* ── KPI Row 1 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statsRow1.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${stat.border} p-5`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1 leading-tight">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-snug">{stat.sub}</p>
                </div>
                <div className={`${stat.color} p-2.5 rounded-lg shrink-0`}>
                  <Icon className="text-white" size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── KPI Row 2 ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {statsRow2.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`bg-white rounded-xl shadow-sm border border-gray-100 border-l-4 ${stat.border} p-5`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide mb-1 leading-tight">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 truncate">{stat.value}</p>
                  <p className="text-xs text-gray-400 mt-1 leading-snug">{stat.sub}</p>
                </div>
                <div className={`${stat.color} p-2.5 rounded-lg shrink-0`}>
                  <Icon className="text-white" size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Charts ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Monthly Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Sales</h2>
            <p className="text-xs text-gray-400">Last 12 months · sales_invoices</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlySalesData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={55} />
              <Tooltip content={<CurrencyTooltip />} />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#3B82F6"
                strokeWidth={2}
                fill="url(#salesGrad)"
                name="Sales"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Collections */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Monthly Collections</h2>
            <p className="text-xs text-gray-400">Last 12 months · payment_collections</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={monthlyCollectData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="collectGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={55} />
              <Tooltip content={<CurrencyTooltip />} />
              <Area
                type="monotone"
                dataKey="collections"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#collectGrad)"
                name="Collections"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Sales vs Collections Combined Bar ────────────────────────────── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Sales vs Collections — Last 12 Months</h2>
          <p className="text-xs text-gray-400">Side-by-side comparison · sales_invoices & payment_collections</p>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={monthlySalesData.map((d, i) => ({
              ...d,
              collections: monthlyCollectData[i]?.collections ?? 0,
            }))}
            margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
            <YAxis tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10 }} width={55} />
            <Tooltip content={<CurrencyTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="sales" fill="#3B82F6" name="Sales" radius={[3, 3, 0, 0]} />
            <Bar dataKey="collections" fill="#10B981" name="Collections" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Tables ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

        {/* Top 10 Customers by Outstanding */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <AlertCircle className="text-orange-500" size={18} />
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">Top 10 Customers by Outstanding</h2>
              <p className="text-xs text-gray-400">Sorted by highest balance due</p>
            </div>
            <span className="ml-auto text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
              {topCustomers.length} customer(s)
            </span>
          </div>
          {topCustomers.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              No outstanding balances — all cleared! 🎉
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Customer</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase hidden sm:table-cell">City</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topCustomers.map((c, idx) => {
                    const maxOutstanding = Number(topCustomers[0]?.current_outstanding ?? 1);
                    const pct = Math.round((Number(c.current_outstanding) / maxOutstanding) * 100);
                    return (
                      <tr key={c.id} className="hover:bg-orange-50 transition">
                        <td className="px-4 py-3">
                          {idx === 0 ? <Medal size={14} className="text-yellow-500" /> :
                           idx === 1 ? <Medal size={14} className="text-gray-400" /> :
                           idx === 2 ? <Medal size={14} className="text-amber-600" /> :
                           <span className="text-gray-400 text-xs">{idx + 1}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm">{c.name}</div>
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
                            <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs hidden sm:table-cell">{c.city || '—'}</td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600">
                          {fmtINR(Number(c.current_outstanding))}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-orange-50 border-t border-orange-100">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-xs font-semibold text-gray-600">
                      Total Outstanding (all customers)
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-orange-700">
                      {fmtINR(totalOutstand)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Top Selling Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
            <TrendingUp className="text-blue-500" size={18} />
            <div>
              <h2 className="font-semibold text-gray-800 text-sm">Top Selling Products</h2>
              <p className="text-xs text-gray-400">By total quantity sold across all invoices</p>
            </div>
            <span className="ml-auto text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
              {topProducts.length} product(s)
            </span>
          </div>
          {topProducts.length === 0 ? (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              No sales recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Product</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Qty Sold</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {topProducts.map((p, idx) => {
                    const maxQty = topProducts[0]?.qty ?? 1;
                    const pct = Math.round((p.qty / maxQty) * 100);
                    return (
                      <tr key={p.product_id} className="hover:bg-blue-50 transition">
                        <td className="px-4 py-3">
                          {idx === 0 ? <Medal size={14} className="text-yellow-500" /> :
                           idx === 1 ? <Medal size={14} className="text-gray-400" /> :
                           idx === 2 ? <Medal size={14} className="text-amber-600" /> :
                           <span className="text-gray-400 text-xs">{idx + 1}</span>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900 text-sm truncate max-w-[160px]">{p.name}</div>
                          <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden w-24">
                            <div className="h-full bg-blue-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{p.qty.toLocaleString('en-IN')}</td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-700">{fmtINR(p.revenue)}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-blue-50 border-t border-blue-100">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-xs font-semibold text-gray-600">Total (shown)</td>
                    <td className="px-4 py-3 text-right font-bold text-blue-700">
                      {topProducts.reduce((s, p) => s + p.qty, 0).toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-gray-700">
                      {fmtINR(topProducts.reduce((s, p) => s + p.revenue, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Debug Panel ──────────────────────────────────────────────────── */}
      <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 space-y-1">
        <div className="text-green-300 font-bold mb-2">▶ Debug Panel</div>
        <div>Data Source: External Supabase ({SUPABASE_URL})</div>
        <div>Customers: {customers.length} | Products: {products.length} | Stock levels: {stockLevels.length}</div>
        <div>Invoices: {invoices.length} | Payments: {payments.length} | Production entries: {entries.length}</div>
        <div>Total invoice items (for top products): {invoices.reduce((s, i) => s + (i.items?.length ?? 0), 0)}</div>
        <div>Current stock (total units): {currentStock} | Total sales: {fmtINR(totalSales)} | Total collections: {fmtINR(totalCollect)}</div>
      </div>
    </div>
  );
}
