import { useState, useMemo } from 'react';
import { useSales } from '../context/SalesContext';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { useStock } from '../context/StockContext';
import { InvoicePrintModal } from '../components/InvoicePrintModal';
import {
  ShoppingCart, Plus, Trash2, Search, Loader2, AlertCircle,
  RefreshCw, FileText, X, Eye, Printer, Download,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SUPABASE_URL = 'https://tkkxhjfzgnnpgxluqkwx.supabase.co';

const CREATE_SQL = `-- Run in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS sales_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_no text UNIQUE NOT NULL,
  customer_id uuid REFERENCES customers(id),
  invoice_date date NOT NULL DEFAULT current_date,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  outstanding_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sales_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES sales_invoices(id) ON DELETE CASCADE,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL,
  rate numeric NOT NULL,
  amount numeric NOT NULL
);
ALTER TABLE sales_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_invoice_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read inv" ON sales_invoices FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "auth insert inv" ON sales_invoices FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "auth delete inv" ON sales_invoices FOR DELETE USING (auth.role()='authenticated');
CREATE POLICY "auth read items" ON sales_invoice_items FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "auth insert items" ON sales_invoice_items FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "auth delete items" ON sales_invoice_items FOR DELETE USING (auth.role()='authenticated');`;

interface LineItem {
  product_id: string;
  quantity: string;
  rate: string;
}

const emptyLine = (): LineItem => ({ product_id: '', quantity: '', rate: '' });

const today = () => new Date().toISOString().split('T')[0];

function genInvoiceNo(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const rnd = String(Math.floor(1000 + Math.random() * 9000));
  return `INV-${y}${m}${day}-${rnd}`;
}

export function SalesPage() {
  const { invoices, loading, error, rowsFetched, fetchInvoices, addInvoice, deleteInvoice } = useSales();
  const { customers } = useCustomers();
  const { products } = useProducts();
  const { fetchTransactions } = useStock();

  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [invoiceNo, setInvoiceNo] = useState('');
  const [customerId, setCustomerId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(today());
  const [paidAmount, setPaidAmount] = useState('0');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<LineItem[]>([emptyLine()]);

  const isTableMissing = error && (
    error.includes('does not exist') || error.includes('relation') || error.includes('42P01')
  );

  const productMap = useMemo(() => {
    const m: Record<string, { name: string; sale_rate: number }> = {};
    for (const p of products) m[p.id] = { name: p.tank_name + (p.capacity ? ` (${p.capacity})` : ''), sale_rate: p.sale_rate ?? 0 };
    return m;
  }, [products]);

  const customerMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const c of customers) m[c.id] = c.name;
    return m;
  }, [customers]);

  // Computed line totals
  const computedLines = lines.map(l => ({
    ...l,
    amount: (Number(l.quantity) || 0) * (Number(l.rate) || 0),
  }));
  const totalAmount = computedLines.reduce((s, l) => s + l.amount, 0);
  const outstandingAmount = totalAmount - (Number(paidAmount) || 0);

  // Stats
  const totalSales = invoices.reduce((s, inv) => s + Number(inv.total_amount), 0);
  const totalOutstanding = invoices.reduce((s, inv) => s + Number(inv.outstanding_amount), 0);
  const todayStr = today();
  const todaySales = invoices
    .filter(inv => inv.invoice_date === todayStr)
    .reduce((s, inv) => s + Number(inv.total_amount), 0);

  const filtered = useMemo(() => {
    if (!searchTerm) return invoices;
    const q = searchTerm.toLowerCase();
    return invoices.filter(inv =>
      inv.invoice_no.toLowerCase().includes(q) ||
      (customerMap[inv.customer_id] ?? '').toLowerCase().includes(q) ||
      inv.invoice_date.includes(q)
    );
  }, [invoices, searchTerm, customerMap]);

  const openNew = () => {
    setInvoiceNo(genInvoiceNo());
    setCustomerId('');
    setInvoiceDate(today());
    setPaidAmount('0');
    setNotes('');
    setLines([emptyLine()]);
    setShowModal(true);
  };

  const updateLine = (idx: number, field: keyof LineItem, value: string) => {
    setLines(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'product_id' && value) {
        next[idx].rate = String(productMap[value]?.sale_rate ?? '');
      }
      return next;
    });
  };

  const addLine = () => setLines(prev => [...prev, emptyLine()]);
  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!customerId) { toast.error('Select a customer'); return; }
    if (!invoiceDate) { toast.error('Select invoice date'); return; }
    const validLines = computedLines.filter(l => l.product_id && l.quantity && l.rate && l.amount > 0);
    if (validLines.length === 0) { toast.error('Add at least one valid line item'); return; }
    if (outstandingAmount < 0) { toast.error('Paid amount cannot exceed total'); return; }

    setSaving(true);
    try {
      await addInvoice(
        {
          invoice_no: invoiceNo,
          customer_id: customerId,
          invoice_date: invoiceDate,
          total_amount: totalAmount,
          paid_amount: Number(paidAmount) || 0,
          outstanding_amount: outstandingAmount,
          notes: notes || null,
        },
        validLines.map(l => ({
          product_id: l.product_id,
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          amount: l.amount,
        }))
      );
      await fetchTransactions();
      toast.success(`Invoice ${invoiceNo} created — Stock & customer updated`);
      setShowModal(false);
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Failed to save invoice');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (inv: typeof invoices[0]) => {
    if (!window.confirm(`Delete invoice ${inv.invoice_no}?\nThis will reverse the customer outstanding.`)) return;
    try {
      await deleteInvoice(inv.id);
      await fetchTransactions();
      toast.success('Invoice deleted — outstanding reversed');
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Delete failed');
    }
  };

  // Print modal data
  const printInvoice = printInvoiceId ? invoices.find(i => i.id === printInvoiceId) ?? null : null;
  const printCustomer = printInvoice ? customers.find(c => c.id === printInvoice.customer_id) ?? null : null;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading invoices...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-600 shrink-0" size={20} />
            <p className="text-red-700 text-sm font-medium">{error}</p>
            <button onClick={fetchInvoices} className="ml-auto text-sm text-red-600 underline">Retry</button>
          </div>
          {isTableMissing && (
            <div className="mt-3">
              <p className="text-xs text-red-600 mb-2 font-medium">Tables missing. Run this SQL in your Supabase dashboard:</p>
              <pre className="bg-red-900 text-green-300 text-xs rounded p-3 overflow-x-auto whitespace-pre-wrap">{CREATE_SQL}</pre>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
            <ShoppingCart className="text-blue-600" size={32} />
            Sales Invoices
          </h1>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={openNew}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition text-sm"
            >
              <Plus size={18} /> New Invoice
            </button>
            <button
              onClick={async () => { await fetchInvoices(); await fetchTransactions(); }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition text-sm"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-600">
            <p className="text-gray-500 text-xs font-medium uppercase">Total Sales</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">₹{totalSales.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">{invoices.length} invoice(s)</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-orange-500">
            <p className="text-gray-500 text-xs font-medium uppercase">Outstanding</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-green-600 col-span-2 sm:col-span-1">
            <p className="text-gray-500 text-xs font-medium uppercase">Today's Sales</p>
            <p className="text-2xl font-bold text-green-700 mt-1">₹{todaySales.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">{invoices.filter(i => i.invoice_date === todayStr).length} invoice(s)</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by invoice no, customer, or date..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-900"
          />
        </div>
      </div>

      {/* Invoice Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <FileText size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">Invoice List</h2>
          <span className="ml-auto text-xs text-gray-400">{filtered.length} invoice(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Invoice No</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Paid</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Outstanding</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-500">
                    {invoices.length === 0 ? 'No invoices yet. Click "New Invoice" to create one.' : 'No results match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-semibold text-blue-700">{inv.invoice_no}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(inv.invoice_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-800">{customerMap[inv.customer_id] ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-right font-semibold text-gray-900">₹{Number(inv.total_amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4 text-sm text-right text-green-600">₹{Number(inv.paid_amount).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-4 text-sm text-right">
                      <span className={`font-semibold ${Number(inv.outstanding_amount) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                        ₹{Number(inv.outstanding_amount).toLocaleString('en-IN')}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-1 justify-center flex-wrap">
                        {/* View Invoice */}
                        <button
                          onClick={() => setPrintInvoiceId(inv.id)}
                          title="View Invoice"
                          className="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 transition flex items-center gap-1 text-xs"
                        >
                          <Eye size={14} />
                          <span className="hidden sm:inline">View</span>
                        </button>
                        {/* Print Invoice */}
                        <button
                          onClick={() => setPrintInvoiceId(inv.id)}
                          title="Print Invoice"
                          className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-600 transition flex items-center gap-1 text-xs"
                        >
                          <Printer size={14} />
                          <span className="hidden sm:inline">Print</span>
                        </button>
                        {/* Download PDF */}
                        <button
                          onClick={() => setPrintInvoiceId(inv.id)}
                          title="Download PDF"
                          className="p-1.5 hover:bg-green-50 rounded-lg text-green-600 transition flex items-center gap-1 text-xs"
                        >
                          <Download size={14} />
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => handleDelete(inv)}
                          title="Delete Invoice"
                          className="p-1.5 hover:bg-red-50 rounded-lg text-red-500 transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 space-y-1">
        <div>Data Source: External Supabase ({SUPABASE_URL})</div>
        <div>Tables: sales_invoices, sales_invoice_items</div>
        <div>Rows Fetched: {rowsFetched}</div>
        <div>Last Error: {error ?? 'none'}</div>
      </div>

      {/* ── New Invoice Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-6">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-900">🧾 New Sales Invoice</h2>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Invoice Meta */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice No <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={invoiceNo}
                    onChange={e => setInvoiceNo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Date <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    value={invoiceDate}
                    onChange={e => setInvoiceDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Customer <span className="text-red-500">*</span></label>
                  <select
                    value={customerId}
                    onChange={e => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">-- Select Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.city}</option>)}
                  </select>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-semibold text-gray-800">Line Items</label>
                  <button
                    onClick={addLine}
                    className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 transition flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Row
                  </button>
                </div>

                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-600 uppercase w-2/5">Product</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase w-1/6">Qty</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase w-1/6">Rate (₹)</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-gray-600 uppercase w-1/6">Amount (₹)</th>
                        <th className="px-3 py-2 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {lines.map((line, idx) => {
                        const amt = (Number(line.quantity) || 0) * (Number(line.rate) || 0);
                        return (
                          <tr key={idx}>
                            <td className="px-3 py-2">
                              <select
                                value={line.product_id}
                                onChange={e => updateLine(idx, 'product_id', e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-blue-400"
                              >
                                <option value="">-- Product --</option>
                                {products.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.tank_name}{p.capacity ? ` (${p.capacity})` : ''}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number" min="1"
                                value={line.quantity}
                                onChange={e => updateLine(idx, 'quantity', e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number" min="0" step="0.01"
                                value={line.rate}
                                onChange={e => updateLine(idx, 'rate', e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                                placeholder="0.00"
                              />
                            </td>
                            <td className="px-3 py-2 text-right font-semibold text-gray-800">
                              {amt > 0 ? `₹${amt.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {lines.length > 1 && (
                                <button onClick={() => removeLine(idx)} className="text-red-400 hover:text-red-600">
                                  <X size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totals + Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                    placeholder="Delivery details, terms..."
                  />
                </div>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span className="font-semibold">₹{totalAmount.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-gray-600">Amount Paid (₹)</span>
                    <input
                      type="number" min="0" max={totalAmount} step="0.01"
                      value={paidAmount}
                      onChange={e => setPaidAmount(e.target.value)}
                      className="w-32 border border-gray-300 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-400"
                    />
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between">
                    <span className="font-semibold text-gray-800">Outstanding</span>
                    <span className={`font-bold text-lg ${outstandingAmount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      ₹{outstandingAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 flex items-center gap-2">
                <ShoppingCart size={14} className="shrink-0" />
                Saving will create <strong>Stock OUT</strong> transactions for each item and update customer outstanding balance.
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2 disabled:opacity-60"
              >
                {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : 'Save Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Invoice Print/View Modal ── */}
      {printInvoice && (
        <InvoicePrintModal
          invoice={printInvoice}
          customer={printCustomer}
          products={products}
          onClose={() => setPrintInvoiceId(null)}
        />
      )}
    </div>
  );
}
