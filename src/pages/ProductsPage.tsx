import { useState } from 'react';
import { useProducts } from '../context/ProductContext';
import type { Product } from '../types';
import { Modal } from '../components/Modal';
import { Plus, Edit2, Trash2, Package, Search, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const LAYER_TYPES = ['1', '2', '3', '4', '5'] as const;
const STATUS_OPTIONS = ['Active', 'Inactive'] as const;

export function ProductsPage() {
  const { products, loading, error, fetchProducts, addProduct, updateProduct, deleteProduct } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Product>>({
    status: 'Active',
  });

  const filteredProducts = products.filter(p =>
    p.tank_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.capacity.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.layer_type ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.color ?? '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ status: 'Active' });
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formData.tank_name || !formData.capacity) {
      toast.error('Tank Name and Capacity are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        tank_name: formData.tank_name!,
        capacity: formData.capacity!,
        layer_type: formData.layer_type || null,
        color: formData.color || null,
        weight: formData.weight ? Number(formData.weight) : null,
        purchase_rate: formData.purchase_rate ? Number(formData.purchase_rate) : null,
        sale_rate: formData.sale_rate ? Number(formData.sale_rate) : null,
        status: formData.status || 'Active',
      };

      if (editingProduct) {
        await updateProduct(editingProduct.id, payload);
        toast.success('Product updated');
      } else {
        await addProduct(payload);
        toast.success('Product added');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Delete failed');
    }
  };

  const activeCount = products.filter(p => p.status === 'Active').length;

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8">
      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={fetchProducts} className="ml-auto text-sm text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Package className="text-blue-600" size={32} />
            Products / Tanks
          </h1>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition text-sm md:text-base"
          >
            <Plus size={18} />
            Add Product
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
            <p className="text-gray-600 text-sm font-medium">Total Products</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{products.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
            <p className="text-gray-600 text-sm font-medium">Active</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{activeCount}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-gray-400">
            <p className="text-gray-600 text-sm font-medium">Inactive</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{products.length - activeCount}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, capacity, layer type, color..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-900"
          />
        </div>
      </div>

      {/* Debug Panel */}
      <div className="mb-4 bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 space-y-1">
        <div>Data Source: External Supabase (https://tkkxhjfzgnnpgxluqkwx.supabase.co)</div>
        <div>Rows Fetched: {products.length}</div>
        <div>Last Error: {error ?? 'none'}</div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Tank Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Capacity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase hidden md:table-cell">Layer</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase hidden md:table-cell">Color</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase hidden lg:table-cell">Purchase Rate</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Sale Rate</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    {products.length === 0 ? '0 Products' : 'No products match your search'}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{product.tank_name}</td>
                    <td className="px-4 py-4 text-sm text-gray-700">{product.capacity}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 hidden md:table-cell">{product.layer_type ? `${product.layer_type} Layer` : '—'}</td>
                    <td className="px-4 py-4 text-sm text-gray-700 hidden md:table-cell">{product.color ?? '—'}</td>
                    <td className="px-4 py-4 text-sm text-right text-gray-700 hidden lg:table-cell">
                      {product.purchase_rate != null ? `₹${Number(product.purchase_rate).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-sm font-semibold text-right text-gray-900">
                      {product.sale_rate != null ? `₹${Number(product.sale_rate).toLocaleString('en-IN')}` : '—'}
                    </td>
                    <td className="px-4 py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        product.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {product.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 size={16} />
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        title={editingProduct ? 'Edit Product' : 'Add New Product'}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSave}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Tank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.tank_name || ''}
              onChange={(e) => setFormData({ ...formData, tank_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. ARP 500L Tank"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Capacity <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.capacity || ''}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. 500 Litre"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Layer Type</label>
            <select
              value={formData.layer_type || ''}
              onChange={(e) => setFormData({ ...formData, layer_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Select --</option>
              {LAYER_TYPES.map(l => <option key={l} value={l}>{l} Layer</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Color</label>
            <input
              type="text"
              value={formData.color || ''}
              onChange={(e) => setFormData({ ...formData, color: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. Black, White, Blue"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Weight (kg)</label>
            <input
              type="number"
              value={formData.weight ?? ''}
              onChange={(e) => setFormData({ ...formData, weight: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Purchase Rate (₹)</label>
            <input
              type="number"
              value={formData.purchase_rate ?? ''}
              onChange={(e) => setFormData({ ...formData, purchase_rate: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Sale Rate (₹)</label>
            <input
              type="number"
              value={formData.sale_rate ?? ''}
              onChange={(e) => setFormData({ ...formData, sale_rate: e.target.value ? Number(e.target.value) : undefined })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Status</label>
            <select
              value={formData.status || 'Active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
