import { useState, useMemo } from 'react';
import { usePayments, type PaymentMode } from '../context/PaymentContext';
import { useCustomers } from '../context/CustomerContext';
import {
  Banknote, Plus, Trash2, Search, Loader2, AlertCircle,
  RefreshCw, CalendarDays, User, ChevronDown, ChevronRight,
} from 'lucide-react';
import { Modal } from '../components/Modal';
import toast from 'react-hot-toast';

const SUPABASE_URL = 'https://tkkxhjfzgnnpgxluqkwx.supabase.co';

const CREATE_SQL = `-- Run in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS payment_collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid REFERENCES customers(id),
  payment_date date NOT NULL DEFAULT current_date,
  amount numeric NOT NULL CHECK (amount > 0),
  payment_mode text,
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE payment_collections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read" ON payment_collections FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "auth insert" ON payment_collections FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "auth delete" ON payment_collections FOR DELETE USING (auth.role()='authenticated');`;

const PAYMENT_MODES: PaymentMode[] = ['Cash', 'Bank Transfer', 'Cheque', 'UPI', 'Other'];

const MODE_COLORS: Record<string, string> = {
  'Cash': 'bg-green-100 text-green-700',
  'Bank Transfer': 'bg-blue-100 text-blue-700',
  'Cheque': 'bg-purple-100 text-purple-700',
  'UPI': 'bg-orange-100 text-orange-700',
  'Other': 'bg-gray-100 text-gray-600',
};

const today = () => new Date().toISOString().split('T')[0];

interface PaymentForm {
  customer_id: string;
  payment_date: string;
  amount: string;
  payment_mode: PaymentMode;
  notes: string;
}

const defaultForm = (): PaymentForm => ({
  customer_id: '',
  payment_date: today(),
  amount: '',
  payment_mode: 'Cash',
  notes: '',
});

export function PaymentPage() {
  const { payments, loading, error, rowsFetched, fetchPayments, addPayment, deletePayment } = usePayments();
  const { customers, fetchCustomers } = useCustomers();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<PaymentForm>(defaultForm());
  const [saving, setSaving] = useState(false);
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());

  const isTableMissing = error && (
    error.includes('does not exist') || error.includes('relation') || error.includes('42P01')
  );

  const customerMap = useMemo(() => {
    const m: Record<string, { name: string; outstanding: number }> = {};
    for (const c of customers) m[c.id] = { name: c.name, outstanding: Number(c.current_outstanding ?? 0) };
    return m;
  }, [customers]);

  const todayStr = today();
  const totalCollected = payments.reduce((s, p) => s + Number(p.amount), 0);
  const todayCollected = payments
    .filter(p => p.payment_date === todayStr)
    .reduce((s, p) => s + Number(p.amount), 0);
  const totalOutstanding = customers.reduce((s, c) => s + Number(c.current_outstanding ?? 0), 0);

  // Customer-wise grouped payments
  const grouped = useMemo(() => {
    const g: Record<string, typeof payments> = {};
    for (const p of payments) {
      if (!g[p.customer_id]) g[p.customer_id] = [];
      g[p.customer_id].push(p);
    }
    return g;
  }, [payments]);

  const customerIds = useMemo(() => {
    const ids = Object.keys(grouped);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      return ids.filter(id => (customerMap[id]?.name ?? '').toLowerCase().includes(q));
    }
    if (filterCustomerId) return ids.filter(id => id === filterCustomerId);
    return ids;
  }, [grouped, searchTerm, filterCustomerId, customerMap]);

  // Flat filtered list for "all payments" view
  const filteredPayments = useMemo(() => {
    let list = payments;
    if (filterCustomerId) list = list.filter(p => p.customer_id === filterCustomerId);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(p =>
        (customerMap[p.customer_id]?.name ?? '').toLowerCase().includes(q) ||
        p.payment_mode.toLowerCase().includes(q) ||
        (p.notes ?? '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [payments, filterCustomerId, searchTerm, customerMap]);

  const toggleExpand = (id: string) => {
    setExpandedCustomers(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (!form.customer_id) { toast.error('Select a customer'); return; }
    if (!form.amount || Number(form.amount) <= 0) { toast.error('Enter a valid amount'); return; }
    if (!form.payment_date) { toast.error('Select payment date'); return; }

    setSaving(true);
    try {
      await addPayment({
        customer_id: form.customer_id,
        payment_date: form.payment_date,
        amount: Number(form.amount),
        payment_mode: form.payment_mode,
        notes: form.notes || null,
      });
      await fetchCustomers();
      toast.success(`Payment of ₹${Number(form.amount).toLocaleString('en-IN')} recorded — Outstanding updated`);
      setIsModalOpen(false);
      setForm(defaultForm());
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Failed to save payment');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, custId: string, amount: number, custName: string) => {
    if (!window.confirm(`Delete ₹${amount.toLocaleString('en-IN')} payment from "${custName}"?\nThis will restore the outstanding balance.`)) return;
    try {
      await deletePayment(id, custId, amount);
      await fetchCustomers();
      toast.success('Payment deleted — Outstanding restored');
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Delete failed');
    }
  };

  const selectedCustomerOutstanding = form.customer_id ? customerMap[form.customer_id]?.outstanding ?? 0 : null;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading payment records...</p>
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
            <button onClick={fetchPayments} className="ml-auto text-sm text-red-600 underline">Retry</button>
          </div>
          {isTableMissing && (
            <div className="mt-3">
              <p className="text-xs text-red-600 mb-2 font-medium">Table missing. Run this SQL in your Supabase dashboard:</p>
              <pre className="bg-red-900 text-green-300 text-xs rounded p-3 overflow-x-auto whitespace-pre-wrap">{CREATE_SQL}</pre>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Banknote className="text-blue-600" size={32} />
            Payment Collection
          </h1>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => { setForm(defaultForm()); setIsModalOpen(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition text-sm"
            >
              <Plus size={18} /> Record Payment
            </button>
            <button
              onClick={async () => { await fetchPayments(); await fetchCustomers(); }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition text-sm"
            >
              <RefreshCw size={16} /> Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-600">
            <p className="text-gray-500 text-xs font-medium uppercase">Total Collections</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">₹{totalCollected.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">{payments.length} payment(s)</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-green-600">
            <p className="text-gray-500 text-xs font-medium uppercase">Today's Collections</p>
            <p className="text-2xl font-bold text-green-700 mt-1">₹{todayCollected.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">
              {payments.filter(p => p.payment_date === todayStr).length} payment(s) today
            </p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-orange-500 col-span-2 sm:col-span-1">
            <p className="text-gray-500 text-xs font-medium uppercase">Outstanding Balance</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">₹{totalOutstanding.toLocaleString('en-IN')}</p>
            <p className="text-xs text-gray-400 mt-1">across {customers.filter(c => Number(c.current_outstanding) > 0).length} customer(s)</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-col sm:flex-row gap-3">
        <div className="flex items-center gap-2 flex-1">
          <Search size={18} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer name, mode, or notes..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-900 text-sm"
          />
        </div>
        <select
          value={filterCustomerId}
          onChange={e => setFilterCustomerId(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Customers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Customer-wise Payment History */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <User size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">Customer-wise Payment History</h2>
          <span className="ml-auto text-xs text-gray-400">{filteredPayments.length} record(s)</span>
        </div>

        {customerIds.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-500">
            {payments.length === 0
              ? 'No payments recorded yet. Click "Record Payment" to get started.'
              : 'No results match your search.'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {customerIds.map(custId => {
              const custPayments = (grouped[custId] ?? []).filter(p => {
                if (filterCustomerId && p.customer_id !== filterCustomerId) return false;
                if (searchTerm) {
                  const q = searchTerm.toLowerCase();
                  return (
                    (customerMap[p.customer_id]?.name ?? '').toLowerCase().includes(q) ||
                    p.payment_mode.toLowerCase().includes(q) ||
                    (p.notes ?? '').toLowerCase().includes(q)
                  );
                }
                return true;
              });
              if (custPayments.length === 0) return null;

              const custTotal = custPayments.reduce((s, p) => s + Number(p.amount), 0);
              const isExpanded = expandedCustomers.has(custId);
              const outstanding = customerMap[custId]?.outstanding ?? 0;

              return (
                <div key={custId}>
                  {/* Customer Row (collapsible header) */}
                  <button
                    className="w-full flex items-center gap-3 px-6 py-4 hover:bg-gray-50 transition text-left"
                    onClick={() => toggleExpand(custId)}
                  >
                    {isExpanded ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <span className="font-semibold text-gray-900 text-sm">{customerMap[custId]?.name ?? custId}</span>
                      <span className="ml-3 text-xs text-gray-400">{custPayments.length} payment(s)</span>
                    </div>
                    <div className="flex items-center gap-6 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Collected</p>
                        <p className="text-sm font-bold text-green-600">₹{custTotal.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">Outstanding</p>
                        <p className={`text-sm font-bold ${outstanding > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                          ₹{outstanding.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Expanded Payment Rows */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="px-8 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Mode</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Notes</th>
                            <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Del</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {custPayments.map(p => (
                            <tr key={p.id} className="hover:bg-white transition">
                              <td className="px-8 py-3 text-sm text-gray-700 whitespace-nowrap">
                                <CalendarDays size={12} className="inline mr-1 text-gray-400" />
                                {new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </td>
                              <td className="px-4 py-3 text-right font-bold text-green-700">
                                ₹{Number(p.amount).toLocaleString('en-IN')}
                              </td>
                              <td className="px-4 py-3 hidden sm:table-cell">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MODE_COLORS[p.payment_mode] ?? 'bg-gray-100 text-gray-600'}`}>
                                  {p.payment_mode}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-xs truncate">
                                {p.notes ?? '—'}
                              </td>
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleDelete(p.id, p.customer_id, Number(p.amount), customerMap[p.customer_id]?.name ?? '')}
                                  className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"
                                  title="Delete"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* All Payments — Flat Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <CalendarDays size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">All Payments — Chronological</h2>
          <span className="ml-auto text-xs text-gray-400">{filteredPayments.length} record(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Customer</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase hidden sm:table-cell">Mode</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase hidden md:table-cell">Notes</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    {payments.length === 0 ? 'No payments yet.' : 'No results match your filter.'}
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {new Date(p.payment_date + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {customerMap[p.customer_id]?.name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-green-700 font-bold">₹{Number(p.amount).toLocaleString('en-IN')}</span>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${MODE_COLORS[p.payment_mode] ?? 'bg-gray-100 text-gray-600'}`}>
                        {p.payment_mode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-xs truncate">
                      {p.notes ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleDelete(p.id, p.customer_id, Number(p.amount), customerMap[p.customer_id]?.name ?? '')}
                        className="p-1.5 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
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
        <div>Table: payment_collections</div>
        <div>Rows Fetched: {rowsFetched}</div>
        <div>Last Error: {error ?? 'none'}</div>
      </div>

      {/* Record Payment Modal */}
      <Modal
        isOpen={isModalOpen}
        title="💳 Record Payment"
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      >
        <div className="space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Customer <span className="text-red-500">*</span>
            </label>
            <select
              value={form.customer_id}
              onChange={e => setForm({ ...form, customer_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">-- Select Customer --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name} {Number(c.current_outstanding) > 0 ? `— ₹${Number(c.current_outstanding).toLocaleString('en-IN')} due` : '— Cleared'}
                </option>
              ))}
            </select>
            {selectedCustomerOutstanding !== null && (
              <p className={`text-xs mt-1 ${selectedCustomerOutstanding > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                Current Outstanding: ₹{selectedCustomerOutstanding.toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.payment_date}
              onChange={e => setForm({ ...form, payment_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Amount (₹) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              value={form.amount}
              onChange={e => setForm({ ...form, amount: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              placeholder="e.g. 5000"
            />
            {form.amount && selectedCustomerOutstanding !== null && (
              <p className="text-xs mt-1 text-blue-600">
                Balance after payment: ₹{Math.max(0, selectedCustomerOutstanding - Number(form.amount)).toLocaleString('en-IN')}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Payment Mode</label>
            <div className="flex flex-wrap gap-2">
              {PAYMENT_MODES.map(mode => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setForm({ ...form, payment_mode: mode })}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition border ${
                    form.payment_mode === mode
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
              placeholder="Cheque no., reference, remarks..."
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-700 flex items-center gap-2">
            <Banknote size={14} className="shrink-0" />
            Saving will reduce <strong>{customerMap[form.customer_id]?.name || 'the customer'}'s</strong> outstanding balance immediately.
          </div>

          {saving && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Loader2 size={16} className="animate-spin" /> Saving payment...
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
