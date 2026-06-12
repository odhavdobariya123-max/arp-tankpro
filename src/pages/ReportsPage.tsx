import { useState, useMemo, useEffect } from 'react';
import { useSales } from '../context/SalesContext';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { useStock } from '../context/StockContext';
import { useProduction } from '../context/ProductionContext';
import { usePayments } from '../context/PaymentContext';
import {
  BarChart2, FileText, Warehouse, Factory, AlertCircle,
  Banknote, Printer, Download, RefreshCw, Loader2,
} from 'lucide-react';

type TabId = 'sales' | 'stock' | 'production' | 'outstanding' | 'payments';

const TABS: { id: TabId; label: string; icon: React.ElementType }[] = [
  { id: 'sales',       label: 'Sales Report',             icon: FileText },
  { id: 'stock',       label: 'Stock Report',             icon: Warehouse },
  { id: 'production',  label: 'Production Report',        icon: Factory },
  { id: 'outstanding', label: 'Outstanding Report',       icon: AlertCircle },
  { id: 'payments',    label: 'Payment Collection Report',icon: Banknote },
];

const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; };

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtINR(n: number | string) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

function exportCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return (
    <div className={`bg-white rounded-lg shadow p-5 border-l-4 ${color}`}>
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ReportHeader({ title, icon: Icon, onPrint, onCSV }: {
  title: string; icon: React.ElementType;
  onPrint: () => void; onCSV: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
      <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
        <Icon size={20} className="text-blue-600" /> {title}
      </h2>
      <div className="flex gap-2 no-print">
        <button onClick={onPrint}
          className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 text-white px-3 py-1.5 rounded-lg text-sm transition">
          <Printer size={14} /> Print
        </button>
        <button onClick={onCSV}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm transition">
          <Download size={14} /> Export CSV
        </button>
      </div>
    </div>
  );
}

function DateFilter({ from, to, setFrom, setTo }: {
  from: string; to: string;
  setFrom: (v: string) => void; setTo: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 mb-5 no-print">
      <label className="text-sm font-medium text-gray-700">From</label>
      <input type="date" value={from} onChange={e => setFrom(e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <label className="text-sm font-medium text-gray-700">To</label>
      <input type="date" value={to} onChange={e => setTo(e.target.value)}
        className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
  );
}

export function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('sales');

  const { invoices, loading: loadSales } = useSales();
  const { customers, loading: loadCust } = useCustomers();
  const { products, loading: loadProd } = useProducts();
  const { stockLevels, loading: loadStock } = useStock();
  const { entries, loading: loadProd2 } = useProduction();
  const { payments, loading: loadPay } = usePayments();

  // Date filters
  const [sFrom, setSFrom] = useState(monthStart());
  const [sTo, setSTo] = useState(today());
  const [prFrom, setPrFrom] = useState(monthStart());
  const [prTo, setPrTo] = useState(today());
  const [pyFrom, setPyFrom] = useState(monthStart());
  const [pyTo, setPyTo] = useState(today());

  // Inject print CSS on mount
  useEffect(() => {
    const style = document.createElement('style');
    style.id = '__arp_report_print_css__';
    style.textContent = `
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body > * { display: none !important; }
        #arp-report-print-area { display: block !important; }
        #arp-report-print-area * { visibility: visible !important; }
        #arp-report-print-area {
          position: fixed !important; inset: 0 !important;
          background: white !important; z-index: 999999 !important;
          overflow: visible !important; padding: 0 !important;
        }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById('__arp_report_print_css__')?.remove();
  }, []);

  const handlePrint = () => window.print();

  // Maps
  const customerMap = useMemo(() => {
    const m: Record<string, string> = {};
    customers.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [customers]);

  const productMap = useMemo(() => {
    const m: Record<string, { name: string; capacity: string; layer_type?: string }> = {};
    products.forEach(p => { m[p.id] = { name: p.tank_name, capacity: p.capacity, layer_type: p.layer_type }; });
    return m;
  }, [products]);

  // ── Sales Report ────────────────────────────────────────────────────────────
  const filteredSales = useMemo(() => {
    return invoices.filter(inv => inv.invoice_date >= sFrom && inv.invoice_date <= sTo);
  }, [invoices, sFrom, sTo]);

  const salesTotal    = filteredSales.reduce((s, i) => s + Number(i.total_amount), 0);
  const salesPaid     = filteredSales.reduce((s, i) => s + Number(i.paid_amount), 0);
  const salesOutstand = filteredSales.reduce((s, i) => s + Number(i.outstanding_amount), 0);

  const handleSalesCSV = () => exportCSV(
    `sales_report_${sFrom}_${sTo}.csv`,
    ['Invoice No', 'Date', 'Customer', 'Total (₹)', 'Paid (₹)', 'Outstanding (₹)', 'Notes'],
    filteredSales.map(i => [
      i.invoice_no, i.invoice_date, customerMap[i.customer_id] ?? '—',
      Number(i.total_amount), Number(i.paid_amount), Number(i.outstanding_amount), i.notes ?? '',
    ])
  );

  // ── Stock Report ────────────────────────────────────────────────────────────
  const stockRows = useMemo(() => {
    return products.map(p => {
      const sl = stockLevels.find(s => s.product_id === p.id);
      return {
        id: p.id,
        name: p.tank_name,
        capacity: p.capacity,
        layer: p.layer_type ? `${p.layer_type} Layer` : '—',
        color: p.color ?? '—',
        total_in: sl?.total_in ?? 0,
        total_out: sl?.total_out ?? 0,
        current_stock: sl?.current_stock ?? 0,
      };
    }).sort((a, b) => a.current_stock - b.current_stock);
  }, [products, stockLevels]);

  const totalStock = stockRows.reduce((s, r) => s + r.current_stock, 0);
  const lowStockCount = stockRows.filter(r => r.current_stock <= 5).length;

  const handleStockCSV = () => exportCSV(
    `stock_report_${today()}.csv`,
    ['Product', 'Capacity', 'Layer', 'Color', 'Total IN', 'Total OUT', 'Current Stock'],
    stockRows.map(r => [r.name, r.capacity, r.layer, r.color, r.total_in, r.total_out, r.current_stock])
  );

  // ── Production Report ───────────────────────────────────────────────────────
  const filteredProd = useMemo(() => {
    return entries.filter(e => e.production_date >= prFrom && e.production_date <= prTo);
  }, [entries, prFrom, prTo]);

  const prodTotal = filteredProd.reduce((s, e) => s + Number(e.quantity), 0);

  const handleProdCSV = () => exportCSV(
    `production_report_${prFrom}_${prTo}.csv`,
    ['Date', 'Product', 'Capacity', 'Layer', 'Quantity', 'Notes'],
    filteredProd.map(e => {
      const p = productMap[e.product_id];
      return [e.production_date, p?.name ?? '—', p?.capacity ?? '—',
        p?.layer_type ? `${p.layer_type} Layer` : '—', e.quantity, e.notes ?? ''];
    })
  );

  // ── Outstanding Report ──────────────────────────────────────────────────────
  const outstandingRows = useMemo(() => {
    return customers
      .filter(c => Number(c.current_outstanding) > 0)
      .sort((a, b) => Number(b.current_outstanding) - Number(a.current_outstanding));
  }, [customers]);

  const totalOutstanding = outstandingRows.reduce((s, c) => s + Number(c.current_outstanding), 0);

  const handleOutCSV = () => exportCSV(
    `outstanding_report_${today()}.csv`,
    ['Customer', 'Mobile', 'City', 'Dealer Type', 'Outstanding (₹)'],
    outstandingRows.map(c => [c.name, c.mobile, c.city, c.dealer_type, Number(c.current_outstanding)])
  );

  // ── Payment Collection Report ───────────────────────────────────────────────
  const filteredPay = useMemo(() => {
    return payments.filter(p => p.payment_date >= pyFrom && p.payment_date <= pyTo);
  }, [payments, pyFrom, pyTo]);

  const payTotal = filteredPay.reduce((s, p) => s + Number(p.amount), 0);

  const handlePayCSV = () => exportCSV(
    `payments_report_${pyFrom}_${pyTo}.csv`,
    ['Date', 'Customer', 'Amount (₹)', 'Mode', 'Notes'],
    filteredPay.map(p => [
      p.payment_date, customerMap[p.customer_id] ?? '—',
      Number(p.amount), p.payment_mode, p.notes ?? '',
    ])
  );

  const anyLoading = loadSales || loadCust || loadProd || loadStock || loadProd2 || loadPay;

  return (
    <div className="p-4 md:p-8">

      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
          <BarChart2 className="text-blue-600" size={32} />
          Reports Center
        </h1>
        <p className="text-gray-500 text-sm mt-1">Sales · Stock · Production · Outstanding · Payments</p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 md:flex gap-2 mb-6 no-print">
        {TABS.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
        {anyLoading && (
          <span className="flex items-center gap-1.5 text-xs text-gray-400 ml-2">
            <Loader2 size={14} className="animate-spin" /> Loading data...
          </span>
        )}
      </div>

      {/* ── Print wrapper ── */}
      <div id="arp-report-print-area">

        {/* Print title (only visible on print) */}
        <div className="hidden print:block mb-4 text-center border-b pb-3">
          <p className="text-xl font-bold">ARP TankPro — {TABS.find(t => t.id === activeTab)?.label}</p>
          <p className="text-xs text-gray-500">Generated: {new Date().toLocaleString('en-IN')}</p>
        </div>

        {/* ════════════════ SALES REPORT ════════════════ */}
        {activeTab === 'sales' && (
          <div>
            <ReportHeader title="Sales Report" icon={FileText} onPrint={handlePrint} onCSV={handleSalesCSV} />
            <DateFilter from={sFrom} to={sTo} setFrom={setSFrom} setTo={setSTo} />

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
              <StatCard label="Invoices"      value={String(filteredSales.length)}       color="border-blue-600" />
              <StatCard label="Total Sales"   value={fmtINR(salesTotal)}                color="border-blue-500" />
              <StatCard label="Total Paid"    value={fmtINR(salesPaid)}                 color="border-green-600" />
              <StatCard label="Outstanding"   value={fmtINR(salesOutstand)}             color="border-orange-500" />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Invoice No', 'Date', 'Customer', 'Total', 'Paid', 'Outstanding', 'Notes'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredSales.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No invoices in selected date range.</td></tr>
                    ) : (
                      filteredSales.map(inv => (
                        <tr key={inv.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-semibold text-blue-700">{inv.invoice_no}</td>
                          <td className="px-4 py-3 whitespace-nowrap">{fmtDate(inv.invoice_date)}</td>
                          <td className="px-4 py-3">{customerMap[inv.customer_id] ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-semibold">{fmtINR(inv.total_amount)}</td>
                          <td className="px-4 py-3 text-right text-green-600">{fmtINR(inv.paid_amount)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={Number(inv.outstanding_amount) > 0 ? 'text-orange-600 font-semibold' : 'text-green-600'}>
                              {fmtINR(inv.outstanding_amount)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{inv.notes ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredSales.length > 0 && (
                    <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                      <tr>
                        <td colSpan={3} className="px-4 py-3 font-bold text-gray-800 text-sm">TOTAL ({filteredSales.length} invoices)</td>
                        <td className="px-4 py-3 text-right font-bold">{fmtINR(salesTotal)}</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">{fmtINR(salesPaid)}</td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600">{fmtINR(salesOutstand)}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ STOCK REPORT ════════════════ */}
        {activeTab === 'stock' && (
          <div>
            <ReportHeader title="Stock Report" icon={Warehouse} onPrint={handlePrint} onCSV={handleStockCSV} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <StatCard label="Products"     value={String(products.length)}   color="border-blue-600" />
              <StatCard label="Total Stock"  value={`${totalStock} units`}     color="border-green-600" />
              <StatCard label="Low Stock (≤5)" value={`${lowStockCount} items`} color={lowStockCount > 0 ? 'border-red-500' : 'border-green-500'} />
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Product', 'Capacity', 'Layer', 'Color', 'Total IN', 'Total OUT', 'Current Stock'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stockRows.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No products found.</td></tr>
                    ) : (
                      stockRows.map(row => (
                        <tr key={row.id} className={`hover:bg-gray-50 ${row.current_stock <= 5 ? 'bg-red-50' : ''}`}>
                          <td className="px-4 py-3 font-semibold text-gray-900">{row.name}</td>
                          <td className="px-4 py-3">{row.capacity}</td>
                          <td className="px-4 py-3">{row.layer}</td>
                          <td className="px-4 py-3">{row.color}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">+{row.total_in}</td>
                          <td className="px-4 py-3 text-right text-red-500 font-medium">−{row.total_out}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`font-bold text-base ${row.current_stock <= 5 ? 'text-red-600' : row.current_stock <= 20 ? 'text-orange-500' : 'text-gray-900'}`}>
                              {row.current_stock}
                            </span>
                            {row.current_stock <= 5 && (
                              <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Low</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {stockRows.length > 0 && (
                    <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 font-bold text-gray-800 text-sm">TOTAL</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">+{stockRows.reduce((s, r) => s + r.total_in, 0)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-500">−{stockRows.reduce((s, r) => s + r.total_out, 0)}</td>
                        <td className="px-4 py-3 text-right font-bold">{totalStock}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ PRODUCTION REPORT ════════════════ */}
        {activeTab === 'production' && (
          <div>
            <ReportHeader title="Production Report" icon={Factory} onPrint={handlePrint} onCSV={handleProdCSV} />
            <DateFilter from={prFrom} to={prTo} setFrom={setPrFrom} setTo={setPrTo} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <StatCard label="Entries"         value={String(filteredProd.length)}  color="border-blue-600" />
              <StatCard label="Total Qty Produced" value={`${prodTotal} units`}      color="border-green-600" />
              <StatCard label="Products Involved" value={String(new Set(filteredProd.map(e => e.product_id)).size)} color="border-purple-500" />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Date', 'Product', 'Capacity', 'Layer', 'Quantity', 'Notes'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredProd.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No production entries in selected date range.</td></tr>
                    ) : (
                      filteredProd.map(entry => {
                        const p = productMap[entry.product_id];
                        return (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">{fmtDate(entry.production_date)}</td>
                            <td className="px-4 py-3 font-semibold text-gray-900">{p?.name ?? '—'}</td>
                            <td className="px-4 py-3">{p?.capacity ?? '—'}</td>
                            <td className="px-4 py-3">{p?.layer_type ? `${p.layer_type} Layer` : '—'}</td>
                            <td className="px-4 py-3 text-right font-bold text-blue-700">{entry.quantity}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{entry.notes ?? '—'}</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {filteredProd.length > 0 && (
                    <tfoot className="bg-blue-50 border-t-2 border-blue-200">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 font-bold text-gray-800 text-sm">TOTAL ({filteredProd.length} entries)</td>
                        <td className="px-4 py-3 text-right font-bold text-blue-700">{prodTotal}</td>
                        <td />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ OUTSTANDING REPORT ════════════════ */}
        {activeTab === 'outstanding' && (
          <div>
            <ReportHeader title="Outstanding Report" icon={AlertCircle} onPrint={handlePrint} onCSV={handleOutCSV} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <StatCard label="Customers with Due" value={String(outstandingRows.length)}   color="border-red-500" />
              <StatCard label="Total Outstanding"   value={fmtINR(totalOutstanding)}        color="border-orange-500" />
              <StatCard label="Total Customers"     value={String(customers.length)}        color="border-blue-600" />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['#', 'Customer', 'Mobile', 'City', 'Dealer Type', 'Outstanding (₹)'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {outstandingRows.length === 0 ? (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-green-600 font-medium">🎉 All customers have zero outstanding balance!</td></tr>
                    ) : (
                      outstandingRows.map((c, idx) => (
                        <tr key={c.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{c.name}</td>
                          <td className="px-4 py-3 text-gray-600">{c.mobile}</td>
                          <td className="px-4 py-3 text-gray-600">{c.city}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{c.dealer_type}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className="font-bold text-orange-600 text-base">{fmtINR(c.current_outstanding)}</span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {outstandingRows.length > 0 && (
                    <tfoot className="bg-orange-50 border-t-2 border-orange-200">
                      <tr>
                        <td colSpan={5} className="px-4 py-3 font-bold text-gray-800 text-sm">TOTAL OUTSTANDING ({outstandingRows.length} customers)</td>
                        <td className="px-4 py-3 text-right font-bold text-orange-600 text-base">{fmtINR(totalOutstanding)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════ PAYMENT COLLECTION REPORT ════════════════ */}
        {activeTab === 'payments' && (
          <div>
            <ReportHeader title="Payment Collection Report" icon={Banknote} onPrint={handlePrint} onCSV={handlePayCSV} />
            <DateFilter from={pyFrom} to={pyTo} setFrom={setPyFrom} setTo={setPyTo} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              <StatCard label="Collections"   value={String(filteredPay.length)}  color="border-blue-600" />
              <StatCard label="Total Collected" value={fmtINR(payTotal)}          color="border-green-600" />
              <StatCard label="Avg per Entry"
                value={filteredPay.length > 0 ? fmtINR(payTotal / filteredPay.length) : '₹0.00'}
                color="border-purple-500" />
            </div>

            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {['Date', 'Customer', 'Amount', 'Mode', 'Notes'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredPay.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No payment collections in selected date range.</td></tr>
                    ) : (
                      filteredPay.map(p => (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">{fmtDate(p.payment_date)}</td>
                          <td className="px-4 py-3 font-semibold text-gray-900">{customerMap[p.customer_id] ?? '—'}</td>
                          <td className="px-4 py-3 text-right font-bold text-green-600">{fmtINR(p.amount)}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{p.payment_mode}</span>
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">{p.notes ?? '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {filteredPay.length > 0 && (
                    <tfoot className="bg-green-50 border-t-2 border-green-200">
                      <tr>
                        <td colSpan={2} className="px-4 py-3 font-bold text-gray-800 text-sm">TOTAL ({filteredPay.length} entries)</td>
                        <td className="px-4 py-3 text-right font-bold text-green-600">{fmtINR(payTotal)}</td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          </div>
        )}

      </div>{/* end print area */}

      {/* Debug Panel */}
      <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 mt-6 space-y-1 no-print">
        <div>Reports Center — Data Source: External Supabase</div>
        <div>Invoices: {invoices.length} | Customers: {customers.length} | Products: {products.length}</div>
        <div>Production Entries: {entries.length} | Payments: {payments.length} | Stock Levels: {stockLevels.length}</div>
      </div>
    </div>
  );
}
