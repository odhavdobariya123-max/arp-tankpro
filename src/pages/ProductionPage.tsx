import { useState, useMemo } from 'react';
import { useProduction } from '../context/ProductionContext';
import { useProducts } from '../context/ProductContext';
import { useStock } from '../context/StockContext';
import { Modal } from '../components/Modal';
import {
  Factory, Plus, Trash2, Search, Loader2, AlertCircle,
  RefreshCw, CalendarDays, Package,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SUPABASE_URL = 'https://tkkxhjfzgnnpgxluqkwx.supabase.co';

const CREATE_TABLE_SQL = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS production_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  production_date date NOT NULL,
  product_id uuid REFERENCES products(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  notes text,
  stock_transaction_id uuid REFERENCES stock_transactions(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE production_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow authenticated read" ON production_entries
  FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated insert" ON production_entries
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated delete" ON production_entries
  FOR DELETE USING (auth.role() = 'authenticated');`;

interface EntryForm {
  production_date: string;
  product_id: string;
  quantity: string;
  notes: string;
}

const today = () => new Date().toISOString().split('T')[0];

const defaultForm = (): EntryForm => ({
  production_date: today(),
  product_id: '',
  quantity: '',
  notes: '',
});

export function ProductionPage() {
  const { entries, loading, error, rowsFetched, fetchEntries, addEntry, deleteEntry } = useProduction();
  const { products } = useProducts();
  const { fetchTransactions } = useStock();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState<EntryForm>(defaultForm());
  const [saving, setSaving] = useState(false);

  const isTableMissing = error && (
    error.includes('does not exist') || error.includes('relation') || error.includes('42P01')
  );

  const productMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of products) {
      m[p.id] = p.tank_name + (p.capacity ? ` (${p.capacity})` : '');
    }
    return m;
  }, [products]);

  const filteredEntries = useMemo(() => {
    if (!searchTerm) return entries;
    const q = searchTerm.toLowerCase();
    return entries.filter(e =>
      (productMap[e.product_id] ?? '').toLowerCase().includes(q) ||
      e.production_date.includes(q) ||
      (e.notes ?? '').toLowerCase().includes(q)
    );
  }, [entries, searchTerm, productMap]);

  const totalProduced = entries.reduce((sum, e) => sum + e.quantity, 0);
  const todayEntries = entries.filter(e => e.production_date === today());
  const todayQty = todayEntries.reduce((sum, e) => sum + e.quantity, 0);
  const uniqueProducts = new Set(entries.map(e => e.product_id)).size;

  const handleSave = async () => {
    if (!form.production_date) { toast.error('Select a production date'); return; }
    if (!form.product_id) { toast.error('Select a product'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { toast.error('Enter a valid quantity'); return; }

    setSaving(true);
    try {
      await addEntry({
        production_date: form.production_date,
        product_id: form.product_id,
        quantity: Number(form.quantity),
        notes: form.notes || null,
      });
      // Refresh stock so Stock Management page updates instantly
      await fetchTransactions();
      toast.success('Production entry saved — Stock updated automatically');
      setIsModalOpen(false);
      setForm(defaultForm());
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, stockTxId: string | null, productName: string) => {
    if (!window.confirm(`Delete production entry for "${productName}"?\nThis will also remove the linked stock IN transaction.`)) return;
    try {
      await deleteEntry(id, stockTxId);
      await fetchTransactions();
      toast.success('Entry deleted — Stock updated');
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading production entries...</p>
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
            <button onClick={fetchEntries} className="ml-auto text-sm text-red-600 underline">Retry</button>
          </div>
          {isTableMissing && (
            <div className="mt-3">
              <p className="text-xs text-red-600 mb-2 font-medium">
                The <code>production_entries</code> table does not exist. Run this SQL in your Supabase dashboard:
              </p>
              <pre className="bg-red-900 text-green-300 text-xs rounded p-3 overflow-x-auto whitespace-pre-wrap">{CREATE_TABLE_SQL}</pre>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Factory className="text-blue-600" size={32} />
            Production Entry
          </h1>
          <div className="flex gap-3">
            <button
              onClick={() => { setForm(defaultForm()); setIsModalOpen(true); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition text-sm"
            >
              <Plus size={18} />
              New Entry
            </button>
            <button
              onClick={async () => { await fetchEntries(); await fetchTransactions(); }}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition text-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-600">
            <p className="text-gray-500 text-xs font-medium uppercase">Total Entries</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{entries.length}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-green-600">
            <p className="text-gray-500 text-xs font-medium uppercase">Total Qty Produced</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{totalProduced}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-purple-500">
            <p className="text-gray-500 text-xs font-medium uppercase">Today's Production</p>
            <p className="text-2xl font-bold text-purple-700 mt-1">{todayQty}</p>
            <p className="text-xs text-gray-400 mt-1">{todayEntries.length} entr{todayEntries.length === 1 ? 'y' : 'ies'}</p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
        <Package size={16} className="text-blue-600 mt-0.5 shrink-0" />
        <p className="text-xs text-blue-700">
          Every production entry automatically creates a <strong>Stock IN</strong> transaction. Stock Management updates in real time.
          Products used: <strong>{uniqueProducts}</strong>
        </p>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by product, date, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-900"
          />
        </div>
      </div>

      {/* Production Entries Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <CalendarDays size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">Production Records</h2>
          <span className="ml-auto text-xs text-gray-400">{filteredEntries.length} record(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Qty Produced</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase hidden md:table-cell">Notes</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Stock TX</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-500">
                    {entries.length === 0
                      ? 'No production entries yet. Click "New Entry" to record production.'
                      : 'No results match your search.'}
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900 whitespace-nowrap">
                      {new Date(entry.production_date + 'T00:00:00').toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-800">
                      {productMap[entry.product_id] ?? entry.product_id}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <span className="text-lg font-bold text-green-700">+{entry.quantity}</span>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500 hidden md:table-cell max-w-xs truncate">
                      {entry.notes ?? '—'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      {entry.stock_transaction_id ? (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">Linked</span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <button
                        onClick={() => handleDelete(entry.id, entry.stock_transaction_id, productMap[entry.product_id] ?? entry.product_id)}
                        className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition"
                        title="Delete entry"
                      >
                        <Trash2 size={16} />
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
        <div>Table: production_entries</div>
        <div>Rows Fetched: {rowsFetched}</div>
        <div>Last Error: {error ?? 'none'}</div>
      </div>

      {/* New Entry Modal */}
      <Modal
        isOpen={isModalOpen}
        title="🏭 New Production Entry"
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Production Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={form.production_date}
              onChange={(e) => setForm({ ...form, production_date: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Product <span className="text-red-500">*</span>
            </label>
            <select
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select Product --</option>
              {products.map(p => (
                <option key={p.id} value={p.id}>
                  {p.tank_name}{p.capacity ? ` (${p.capacity})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Quantity Produced <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 25"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Batch number, shift, remarks..."
            />
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-xs text-green-700 flex items-center gap-2">
              <Package size={14} />
              Saving will automatically create a <strong>Stock IN</strong> transaction and update inventory.
            </p>
          </div>

          {saving && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Saving entry and updating stock...
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
