import { useState, useMemo } from 'react';
import { useStock } from '../context/StockContext';
import { useProducts } from '../context/ProductContext';
import type { ReferenceType, TransactionType } from '../types';
import { Modal } from '../components/Modal';
import {
  Warehouse, Plus, Minus, Search, Loader2, AlertCircle,
  AlertTriangle, ArrowUpCircle, ArrowDownCircle, RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

const LOW_STOCK_THRESHOLD = 5;

const SUPABASE_URL = 'https://tkkxhjfzgnnpgxluqkwx.supabase.co';

const CREATE_TABLE_SQL = `-- Run this in your Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES products(id),
  transaction_type text NOT NULL,
  reference_type text,
  quantity integer NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);`;

interface TxForm {
  product_id: string;
  transaction_type: TransactionType;
  reference_type: ReferenceType;
  quantity: string;
  notes: string;
}

const defaultForm = (): TxForm => ({
  product_id: '',
  transaction_type: 'IN',
  reference_type: 'PRODUCTION',
  quantity: '',
  notes: '',
});

export function StockPage() {
  const { transactions, stockLevels, loading, error, rowsFetched, fetchTransactions, addTransaction } = useStock();
  const { products } = useProducts();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<TransactionType>('IN');
  const [form, setForm] = useState<TxForm>(defaultForm());
  const [saving, setSaving] = useState(false);

  const isTableMissing = error && (
    error.includes('does not exist') || error.includes('relation') || error.includes('42P01')
  );

  const productMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of products) m[p.id] = p.tank_name + (p.capacity ? ` (${p.capacity})` : '');
    return m;
  }, [products]);

  const stockWithNames = useMemo(() => {
    return stockLevels.map(sl => ({
      ...sl,
      name: productMap[sl.product_id] ?? sl.product_id,
    }));
  }, [stockLevels, productMap]);

  const allProductsWithStock = useMemo(() => {
    const stockMap: Record<string, number> = {};
    for (const sl of stockLevels) stockMap[sl.product_id] = sl.current_stock;
    return products.map(p => ({
      product_id: p.id,
      name: productMap[p.id] ?? p.tank_name,
      current_stock: stockMap[p.id] ?? 0,
      total_in: stockLevels.find(s => s.product_id === p.id)?.total_in ?? 0,
      total_out: stockLevels.find(s => s.product_id === p.id)?.total_out ?? 0,
    }));
  }, [products, stockLevels, productMap]);

  const filteredStock = useMemo(() => {
    if (!searchTerm) return allProductsWithStock;
    const q = searchTerm.toLowerCase();
    return allProductsWithStock.filter(s => s.name.toLowerCase().includes(q));
  }, [allProductsWithStock, searchTerm]);

  const filteredHistory = useMemo(() => {
    if (!searchTerm) return transactions;
    const q = searchTerm.toLowerCase();
    return transactions.filter(tx =>
      (productMap[tx.product_id] ?? '').toLowerCase().includes(q) ||
      tx.transaction_type.toLowerCase().includes(q) ||
      tx.reference_type.toLowerCase().includes(q) ||
      (tx.notes ?? '').toLowerCase().includes(q)
    );
  }, [transactions, searchTerm, productMap]);

  const lowStockItems = allProductsWithStock.filter(s => s.current_stock <= LOW_STOCK_THRESHOLD);
  const totalIn = transactions.filter(t => t.transaction_type === 'IN').reduce((a, t) => a + t.quantity, 0);
  const totalOut = transactions.filter(t => t.transaction_type === 'OUT').reduce((a, t) => a + t.quantity, 0);

  const openModal = (type: TransactionType) => {
    setModalMode(type);
    setForm({
      ...defaultForm(),
      transaction_type: type,
      reference_type: type === 'IN' ? 'PRODUCTION' : 'SALE',
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.product_id) { toast.error('Select a product'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { toast.error('Enter a valid quantity'); return; }

    setSaving(true);
    try {
      await addTransaction({
        product_id: form.product_id,
        transaction_type: form.transaction_type,
        reference_type: form.reference_type,
        quantity: Number(form.quantity),
        notes: form.notes || null,
      });
      toast.success(`Stock ${form.transaction_type === 'IN' ? 'IN' : 'OUT'} recorded`);
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading stock data...</p>
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
            <button onClick={fetchTransactions} className="ml-auto text-sm text-red-600 underline">Retry</button>
          </div>
          {isTableMissing && (
            <div className="mt-3">
              <p className="text-xs text-red-600 mb-2 font-medium">The <code>stock_transactions</code> table does not exist. Run this SQL in your Supabase dashboard:</p>
              <pre className="bg-red-900 text-green-300 text-xs rounded p-3 overflow-x-auto whitespace-pre-wrap">{CREATE_TABLE_SQL}</pre>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Warehouse className="text-blue-600" size={32} />
            Stock Management
          </h1>
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <button
              onClick={() => openModal('IN')}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition text-smw-full md:w-auto"
            >
              <Plus size={18} />
              Stock In
            </button>
            <button
              onClick={() => openModal('OUT')}
              className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-red-700 transition text-smw-full md:w-auto"
            >
              <Minus size={18} />
              Stock Out
            </button>
            <button
              onClick={fetchTransactions}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition text-smw-full md:w-auto"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

       {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-600">
            <p className="text-gray-500 text-xs font-medium uppercase">Total Products</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{allProductsWithStock.length}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-green-600">
            <p className="text-gray-500 text-xs font-medium uppercase">Total Stock IN</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{totalIn}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-red-500">
            <p className="text-gray-500 text-xs font-medium uppercase">Total Stock OUT</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{totalOut}</p>
          </div>
          <div className="bg-white p-5 rounded-lg shadow border-l-4 border-orange-400">
            <p className="text-gray-500 text-xs font-medium uppercase">Low Stock Alerts</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{lowStockItems.length}</p>
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <div className="mb-6 bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="text-orange-500" size={20} />
            <h3 className="font-semibold text-orange-800">Low Stock Alert — {lowStockItems.length} product(s) at or below {LOW_STOCK_THRESHOLD} units</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {lowStockItems.map(item => (
              <span
                key={item.product_id}
                className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-300"
              >
                {item.name}: <strong>{item.current_stock}</strong>
              </span>
            ))}
          </div> 
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by product name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-900"
          />
        </div>
      </div>

      {/* Current Stock Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <Warehouse size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">Current Stock — Product Wise</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total IN</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Total OUT</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Current Stock</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredStock.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {products.length === 0 ? 'No products found. Add products first.' : 'No results match your search.'}
                  </td>
                </tr>
              ) : (
                filteredStock.map((item) => {
                  const isLow = item.current_stock <= LOW_STOCK_THRESHOLD;
                  return (
                    <tr key={item.product_id} className={`hover:bg-gray-50 ${isLow ? 'bg-orange-50' : ''}`}>
                      <td className="px-4 py-4 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle size={14} className="text-orange-500 shrink-0" />}
                          {item.name}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <span className="text-green-600 font-semibold">+{item.total_in}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <span className="text-red-500 font-semibold">-{item.total_out}</span>
                      </td>
                      <td className="px-4 py-4 text-sm text-right">
                        <span className={`text-lg font-bold ${item.current_stock <= 0 ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-900'}`}>
                          {item.current_stock}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {item.current_stock <= 0 ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Out of Stock</span>
                        ) : isLow ? (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">Low Stock</span>
                        ) : (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">In Stock</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
{/* Mobile Stock History Cards */}
<div className="md:hidden space-y-3 mb-6">
  {filteredHistory.length === 0 ? (
    <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500 border border-gray-200">
      No transactions yet. Use Stock In / Stock Out to record movements.
    </div>
  ) : (
    filteredHistory.map((tx) => (
      <div key={tx.id} className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
        <div className="flex justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">
              {productMap[tx.product_id] ?? tx.product_id}
            </h3>
            <p className="text-xs text-gray-500">
              {new Date(tx.created_at).toLocaleString('en-IN', {
                dateStyle: 'short',
                timeStyle: 'short',
              })}
            </p>
          </div>

          {tx.transaction_type === 'IN' ? (
            <span className="h-fit inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
              <ArrowUpCircle size={12} /> IN
            </span>
          ) : (
            <span className="h-fit inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
              <ArrowDownCircle size={12} /> OUT
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Reference</p>
            <p className="font-semibold text-gray-800">
              {tx.reference_type ?? '—'}
            </p>
          </div>

          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-gray-500">Quantity</p>
            <p className={`font-bold ${tx.transaction_type === 'IN' ? 'text-green-600' : 'text-red-500'}`}>
              {tx.transaction_type === 'IN' ? '+' : '-'}{tx.quantity}
            </p>
          </div>
        </div>

        <div className="mt-3 text-sm text-gray-500">
          {tx.notes ?? 'No Notes'}
        </div>
      </div>
    ))
  )}
</div>
      {/* Stock History */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center gap-2">
          <RefreshCw size={18} className="text-blue-600" />
          <h2 className="font-semibold text-gray-800">Stock History</h2>
          <span className="ml-auto text-xs text-gray-400">{filteredHistory.length} transaction(s)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date & Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Product</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase hidden sm:table-cell">Reference</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase hidden md:table-cell">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No transactions yet. Use Stock In / Stock Out to record movements.
                  </td>
                </tr>
              ) : (
                filteredHistory.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(tx.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-800">{productMap[tx.product_id] ?? tx.product_id}</td>
                    <td className="px-4 py-3 text-center">
                      {tx.transaction_type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <ArrowUpCircle size={12} /> IN
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          <ArrowDownCircle size={12} /> OUT
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden sm:table-cell">{tx.reference_type}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-right">
                      <span className={tx.transaction_type === 'IN' ? 'text-green-600' : 'text-red-500'}>
                        {tx.transaction_type === 'IN' ? '+' : '-'}{tx.quantity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-xs truncate">{tx.notes ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Debug Panel */}
      <div className="mb-4 bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 space-y-1">
        <div>Data Source: External Supabase ({SUPABASE_URL})</div>
        <div>Table: stock_transactions</div>
        <div>Rows Fetched: {rowsFetched}</div>
        <div>Last Error: {error ?? 'none'}</div>
      </div>

      {/* Stock In / Out Modal */}
      <Modal
        isOpen={isModalOpen}
        title={modalMode === 'IN' ? '📦 Stock In — Record Receipt' : '📤 Stock Out — Record Issue'}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      >
        <div className="space-y-4">
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
                <option key={p.id} value={p.id}>{p.tank_name} {p.capacity ? `(${p.capacity})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Reference Type <span className="text-red-500">*</span>
            </label>
            <select
              value={form.reference_type}
              onChange={(e) => setForm({ ...form, reference_type: e.target.value as ReferenceType })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {modalMode === 'IN' ? (
                <>
                  <option value="PRODUCTION">Production Entry</option>
                  <option value="ADJUSTMENT">Manual Adjustment (IN)</option>
                </>
              ) : (
                <>
                  <option value="SALE">Sale / Billing</option>
                  <option value="ADJUSTMENT">Manual Adjustment (OUT)</option>
                </>
              )}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Quantity <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              placeholder="Optional notes about this transaction..."
            />
          </div>

          {saving && (
            <div className="flex items-center gap-2 text-blue-600 text-sm">
              <Loader2 size={16} className="animate-spin" />
              Saving...
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
