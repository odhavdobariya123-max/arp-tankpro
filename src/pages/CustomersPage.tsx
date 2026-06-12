import { useState } from 'react';
import { useCustomers } from '../context/CustomerContext';
import type { Customer } from '../types';
import { Modal } from '../components/Modal';
import { Plus, Edit2, Trash2, Users, Search, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const DEALER_TYPES = ['Retail', 'Dealer', 'Distributor'] as const;

export function CustomersPage() {
  const { customers, loading, error, fetchCustomers, addCustomer, updateCustomer, deleteCustomer } = useCustomers();
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<Customer>>({
    dealer_type: 'Retail',
    opening_balance: 0,
    current_outstanding: 0,
  });

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.mobile.includes(searchTerm) ||
    c.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalOutstanding = customers.reduce((sum, c) => sum + Number(c.current_outstanding), 0);

  const handleOpenModal = (customer?: Customer) => {
    if (customer) {
      setEditingCustomer(customer);
      setFormData(customer);
    } else {
      setEditingCustomer(null);
      setFormData({
        dealer_type: 'Retail',
        opening_balance: 0,
        current_outstanding: 0,
        address: '',
        city: '',
        mobile: '',
        name: '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async () => {
    if (!formData.name || !formData.mobile || !formData.address || !formData.city) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    try {
      if (editingCustomer) {
        await updateCustomer(editingCustomer.id, {
          name: formData.name,
          mobile: formData.mobile,
          gst_number: formData.gst_number || undefined,
          address: formData.address,
          city: formData.city,
          dealer_type: formData.dealer_type!,
          opening_balance: Number(formData.opening_balance) || 0,
          current_outstanding: Number(formData.current_outstanding) || 0,
          notes: formData.notes || undefined,
        });
        toast.success('Customer updated');
      } else {
        await addCustomer({
          name: formData.name!,
          mobile: formData.mobile!,
          gst_number: formData.gst_number || undefined,
          address: formData.address!,
          city: formData.city!,
          dealer_type: formData.dealer_type!,
          opening_balance: Number(formData.opening_balance) || 0,
          current_outstanding: Number(formData.current_outstanding) || 0,
          notes: formData.notes || undefined,
        });
        toast.success('Customer added');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return;
    try {
      await deleteCustomer(id);
      toast.success('Customer deleted');
    } catch (err: any) {
      toast.error(err?.message || err?.details || 'Delete failed');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={20} />
          <p className="text-red-700 text-sm">{error}</p>
          <button onClick={() => fetchCustomers()} className="ml-auto text-sm text-red-600 underline">
            Retry
          </button>
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Users className="text-blue-600" size={32} />
            Customers/Dealers
          </h1>
          <button
            onClick={() => handleOpenModal()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 transition"
          >
            <Plus size={20} />
            Add Customer
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-600">
            <p className="text-gray-600 text-sm font-medium">Total Customers</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{customers.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-green-600">
            <p className="text-gray-600 text-sm font-medium">Total Outstanding</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">₹{totalOutstanding.toLocaleString('en-IN')}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow border-l-4 border-blue-400">
            <p className="text-gray-600 text-sm font-medium">Active Dealers</p>
            <p className="text-2xl font-bold text-gray-900 mt-2">{customers.filter(c => c.dealer_type !== 'Retail').length}</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center gap-2">
          <Search size={20} className="text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, city, or mobile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 outline-none text-gray-900"
          />
        </div>
      </div>

      {/* Debug Panel */}
      <div className="mb-4 bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 space-y-1">
        <div>Data Source: External Supabase (https://tkkxhjfzgnnpgxluqkwx.supabase.co)</div>
        <div>Rows fetched: {customers.length}</div>
        <div>Last error: {error ?? 'none'}</div>
      </div>
{/* Mobile Customer Cards */}
<div className="md:hidden space-y-3 mb-4">
  {filteredCustomers.length === 0 ? (
    <div className="bg-white rounded-xl shadow p-6 text-center text-gray-500">
      No customers found
    </div>
  ) : (
    filteredCustomers.map((customer) => (
      <div key={customer.id} className="bg-white rounded-xl shadow p-4 border">
        <div className="flex justify-between gap-3">
          <div>
            <h3 className="font-bold text-gray-900">{customer.name}</h3>
            <p className="text-sm text-gray-500">{customer.mobile}</p>
            <p className="text-sm text-gray-500">{customer.city}</p>
          </div>
          <span className="h-fit px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
            {customer.dealer_type}
          </span>
        </div>

        <div className="mt-3">
          <p className="text-xs text-gray-500">Outstanding</p>
          <p className="font-bold text-red-600">
            ₹{Number(customer.current_outstanding).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="flex gap-2 mt-4">
          <button
            onClick={() => handleOpenModal(customer)}
            className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg"
          >
            Edit
          </button>
          <button
            onClick={() => handleDeleteCustomer(customer.id)}
            className="flex-1 py-2 bg-red-50 text-red-600 rounded-lg"
          >
            Delete
          </button>
        </div>
      </div>
    ))
  )}
</div>
      {/* Table */}
      <div className="hidden md:blockbg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">City</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase">Outstanding</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No customers found
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{customer.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{customer.mobile}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{customer.city}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        customer.dealer_type === 'Distributor' ? 'bg-blue-100 text-blue-700' :
                        customer.dealer_type === 'Dealer' ? 'bg-sky-100 text-sky-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {customer.dealer_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-right text-gray-900">
                      ₹{Number(customer.current_outstanding).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleOpenModal(customer)}
                          className="p-2 hover:bg-blue-50 rounded-lg text-blue-600 transition"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteCustomer(customer.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"
                          title="Delete"
                        >
                          <Trash2 size={18} />
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
        title={editingCustomer ? 'Edit Customer' : 'Add New Customer'}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveCustomer}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Customer name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Mobile <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.mobile || ''}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="10-digit mobile"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">GST Number</label>
            <input
              type="text"
              value={formData.gst_number || ''}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="GST number"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Address"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.city || ''}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="City"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Dealer Type <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.dealer_type || 'Retail'}
              onChange={(e) => setFormData({ ...formData, dealer_type: e.target.value as any })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DEALER_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Opening Balance (₹)</label>
            <input
              type="number"
              value={formData.opening_balance || 0}
              onChange={(e) => setFormData({ ...formData, opening_balance: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Current Outstanding (₹)</label>
            <input
              type="number"
              value={formData.current_outstanding || 0}
              onChange={(e) => setFormData({ ...formData, current_outstanding: parseFloat(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Additional notes"
              rows={3}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
