import { useState, useMemo } from 'react';
import { useDealerSchemes, type DealerScheme, type NewDealerScheme } from '../context/DealerSchemeContext';
import { useCustomers } from '../context/CustomerContext';
import { useSales } from '../context/SalesContext';
import {
  Award, Plus, X, Loader2, AlertCircle, RefreshCw,
  Target, TrendingUp, Clock, Trash2, Pencil, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

const SUPABASE_URL = 'https://tkkxhjfzgnnpgxluqkwx.supabase.co';

const SCHEME_TYPES = ['Monthly', 'Quarterly', 'Half-Yearly', 'Annual', 'Festival', 'Special'];
const BENEFIT_TYPES = ['Discount', 'Commission', 'Gift', 'Extra Tank'];
const STATUSES = ['Active', 'Inactive', 'Completed', 'Cancelled'];

type FilterStatus = 'All' | 'Active' | 'Expired' | 'Inactive';

const today = () => new Date().toISOString().split('T')[0];

function fmtDate(s: string) {
  return new Date(s + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}
function pct(val: number, total: number) {
  if (!total) return 0;
  return Math.min(100, Math.round((val / total) * 100));
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';

const BLANK: Omit<NewDealerScheme, 'dealer_id'> = {
  scheme_name: '', scheme_type: 'Monthly', target_amount: 0, target_quantity: 0,
  benefit_type: 'Discount', benefit_value: 0,
  start_date: today(), end_date: today(), status: 'Active', notes: '',
};

function ProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${value}%` }} />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${color}`}>
      <p className="text-gray-500 text-xs font-medium uppercase tracking-wide">{label}</p>
      <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

type FormState = { dealer_id: string } & typeof BLANK;

export function DealerSchemePage() {
  const { schemes, loading, error, rowsFetched, fetchSchemes, addScheme, updateScheme, deleteScheme } = useDealerSchemes();
  const { customers } = useCustomers();
  const { invoices } = useSales();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('All');
  const [filterDealer, setFilterDealer] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({ dealer_id: '', ...BLANK });

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm(prev => ({ ...prev, [key]: e.target.value }));

  const customerMap = useMemo(() => {
    const m: Record<string, string> = {};
    customers.forEach(c => { m[c.id] = c.name; });
    return m;
  }, [customers]);

  // Compute achieved amount & quantity per scheme from invoices
  const schemeProgress = useMemo(() => {
    const map: Record<string, { amountAchieved: number; qtyAchieved: number }> = {};
    schemes.forEach(scheme => {
      const relevant = invoices.filter(inv =>
        inv.customer_id === scheme.dealer_id &&
        inv.invoice_date >= scheme.start_date &&
        inv.invoice_date <= scheme.end_date
      );
      const amountAchieved = relevant.reduce((s, inv) => s + Number(inv.total_amount), 0);
      const qtyAchieved = relevant.reduce((s, inv) =>
        s + (inv.items ?? []).reduce((q, item) => q + Number(item.quantity), 0), 0
      );
      map[scheme.id] = { amountAchieved, qtyAchieved };
    });
    return map;
  }, [schemes, invoices]);

  // Is a scheme expired (end_date < today)?
  const isExpired = (s: DealerScheme) => s.end_date < today() && s.status === 'Active';

  const filteredSchemes = useMemo(() => {
    return schemes.filter(s => {
      if (filterDealer && s.dealer_id !== filterDealer) return false;
      if (filterStatus === 'Active') return s.status === 'Active' && !isExpired(s);
      if (filterStatus === 'Expired') return isExpired(s);
      if (filterStatus === 'Inactive') return s.status !== 'Active';
      return true;
    });
  }, [schemes, filterStatus, filterDealer]);

  const activeCount   = schemes.filter(s => s.status === 'Active' && !isExpired(s)).length;
  const expiredCount  = schemes.filter(isExpired).length;
  const totalTargetAmt = schemes.reduce((s, sch) => s + Number(sch.target_amount), 0);
  const totalAchieved  = schemes.reduce((s, sch) => s + (schemeProgress[sch.id]?.amountAchieved ?? 0), 0);

  const openAdd = () => {
    setEditId(null);
    setForm({ dealer_id: '', ...BLANK });
    setShowForm(true);
  };

  const openEdit = (scheme: DealerScheme) => {
    setEditId(scheme.id);
    setForm({
      dealer_id:       scheme.dealer_id,
      scheme_name:     scheme.scheme_name,
      scheme_type:     scheme.scheme_type ?? 'Monthly',
      target_amount:   scheme.target_amount,
      target_quantity: scheme.target_quantity,
      benefit_type:    scheme.benefit_type ?? 'Discount',
      benefit_value:   scheme.benefit_value,
      start_date:      scheme.start_date,
      end_date:        scheme.end_date,
      status:          scheme.status ?? 'Active',
      notes:           scheme.notes ?? '',
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.dealer_id) { toast.error('Please select a dealer'); return; }
    if (!form.scheme_name.trim()) { toast.error('Scheme name is required'); return; }
    if (!form.start_date || !form.end_date) { toast.error('Start and end dates are required'); return; }
    setSaving(true);
    try {
      const payload: NewDealerScheme = {
        dealer_id:       form.dealer_id,
        scheme_name:     form.scheme_name.trim(),
        scheme_type:     form.scheme_type,
        target_amount:   Number(form.target_amount),
        target_quantity: Number(form.target_quantity),
        benefit_type:    form.benefit_type,
        benefit_value:   Number(form.benefit_value),
        start_date:      form.start_date,
        end_date:        form.end_date,
        status:          form.status,
        notes:           form.notes || null,
      };
      if (editId) {
        await updateScheme(editId, payload);
        toast.success('Scheme updated');
      } else {
        await addScheme(payload);
        toast.success('Scheme added');
      }
      setShowForm(false);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save scheme');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete scheme "${name}"? This cannot be undone.`)) return;
    try {
      await deleteScheme(id);
      toast.success('Scheme deleted');
    } catch (err: any) {
      toast.error(err?.message || 'Delete failed');
    }
  };

  const isTableMissing = error && (error.includes('does not exist') || error.includes('relation') || error.includes('42P01'));

  return (
    <div className="p-4 md:p-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
            <Award className="text-blue-600" size={32} />
            Dealer Schemes
          </h1>
          <p className="text-gray-500 text-sm mt-1">Scheme targets · progress tracking · benefit management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={fetchSchemes} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition">
            <RefreshCw size={18} />
          </button>
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition">
            <Plus size={16} /> Add Scheme
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={18} />
          <div className="flex-1">
            <p className="text-red-700 text-sm font-medium">{error}</p>
            {isTableMissing && (
              <p className="text-xs text-red-500 mt-1">
                Run <strong>supabase/migrations/20240007_dealer_schemes.sql</strong> in your Supabase SQL Editor.
              </p>
            )}
          </div>
          <button onClick={fetchSchemes} className="text-xs text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Schemes"     value={String(schemes.length)}  color="border-blue-600" />
        <StatCard label="Active"            value={String(activeCount)}     color="border-green-500" />
        <StatCard label="Expired"           value={String(expiredCount)}    color="border-orange-500" />
        <StatCard label="Overall Achieved"  value={fmtINR(totalAchieved)}  color="border-purple-500" />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 flex flex-wrap gap-3 items-center">
        <div className="flex gap-1">
          {(['All', 'Active', 'Expired', 'Inactive'] as FilterStatus[]).map(f => (
            <button key={f} onClick={() => setFilterStatus(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filterStatus === f ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {f}
            </button>
          ))}
        </div>
        <select value={filterDealer} onChange={e => setFilterDealer(e.target.value)}
          className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">All Dealers</option>
          {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <span className="text-xs text-gray-400 ml-auto">{filteredSchemes.length} scheme{filteredSchemes.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-blue-600" size={36} />
        </div>
      )}

      {/* Scheme Cards */}
      {!loading && filteredSchemes.length === 0 && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-400">
          <Award size={40} className="mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No schemes found</p>
          <p className="text-sm mt-1">Click "Add Scheme" to create your first dealer scheme.</p>
        </div>
      )}

      <div className="space-y-4">
        {filteredSchemes.map(scheme => {
          const progress = schemeProgress[scheme.id] ?? { amountAchieved: 0, qtyAchieved: 0 };
          const amtPct  = pct(progress.amountAchieved, Number(scheme.target_amount));
          const qtyPct  = pct(progress.qtyAchieved,   Number(scheme.target_quantity));
          const expired = isExpired(scheme);
          const isOpen  = expandedId === scheme.id;

          const statusColor =
            scheme.status === 'Active' && !expired ? 'bg-green-100 text-green-700' :
            expired ? 'bg-orange-100 text-orange-700' :
            scheme.status === 'Completed' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-600';

          const barColor =
            amtPct >= 100 ? 'bg-green-500' :
            amtPct >= 60  ? 'bg-blue-500'  :
            amtPct >= 30  ? 'bg-yellow-400' : 'bg-red-400';

          return (
            <div key={scheme.id} className="bg-white rounded-xl shadow overflow-hidden border border-gray-100">
              {/* Card Header */}
              <div className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-gray-900 text-base">{scheme.scheme_name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor}`}>
                      {expired ? 'Expired' : scheme.status}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{scheme.scheme_type}</span>
                  </div>
                  <p className="text-sm text-blue-600 font-medium mt-0.5">{customerMap[scheme.dealer_id] ?? '—'}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Clock size={11} /> {fmtDate(scheme.start_date)} – {fmtDate(scheme.end_date)}</span>
                    <span className="flex items-center gap-1"><Target size={11} /> Benefit: {scheme.benefit_type} {scheme.benefit_value > 0 ? (scheme.benefit_type === 'Discount' || scheme.benefit_type === 'Commission' ? `${scheme.benefit_value}%` : fmtINR(scheme.benefit_value)) : ''}</span>
                  </div>
                </div>

                {/* Quick stats */}
                <div className="text-right shrink-0">
                  <p className="text-2xl font-extrabold text-blue-700">{amtPct}%</p>
                  <p className="text-xs text-gray-400">of target</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setExpandedId(isOpen ? null : scheme.id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <button onClick={() => openEdit(scheme)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(scheme.id, scheme.scheme_name)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Progress Bar (always visible) */}
              <div className="px-4 pb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Amount: {fmtINR(progress.amountAchieved)} achieved</span>
                  <span>Target: {fmtINR(Number(scheme.target_amount))}</span>
                </div>
                <ProgressBar value={amtPct} color={barColor} />
              </div>

              {/* Expanded Detail */}
              {isOpen && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    {/* Amount Progress */}
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Target Amount</p>
                      <p className="font-bold text-gray-900">{fmtINR(Number(scheme.target_amount))}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Achieved</p>
                      <p className="font-bold text-green-600">{fmtINR(progress.amountAchieved)}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Pending</p>
                      <p className="font-bold text-orange-500">
                        {fmtINR(Math.max(0, Number(scheme.target_amount) - progress.amountAchieved))}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <p className="text-xs text-gray-500 mb-1">Completion</p>
                      <p className={`font-bold text-xl ${amtPct >= 100 ? 'text-green-600' : 'text-blue-600'}`}>{amtPct}%</p>
                    </div>
                  </div>

                  {/* Quantity Progress */}
                  {Number(scheme.target_quantity) > 0 && (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Qty Achieved: {progress.qtyAchieved} units</span>
                        <span>Qty Target: {scheme.target_quantity} units</span>
                      </div>
                      <ProgressBar value={qtyPct}
                        color={qtyPct >= 100 ? 'bg-green-500' : qtyPct >= 50 ? 'bg-blue-500' : 'bg-yellow-400'} />
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-500">Pending Qty: {Math.max(0, Number(scheme.target_quantity) - progress.qtyAchieved)}</span>
                        <span className="text-gray-500">{qtyPct}% complete</span>
                      </div>
                    </div>
                  )}

                  {/* Notes */}
                  {scheme.notes && (
                    <p className="text-xs text-gray-500 mt-2 italic">Notes: {scheme.notes}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <Award size={18} className="text-blue-600" />
                {editId ? 'Edit Scheme' : 'Add Dealer Scheme'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Dealer */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dealer / Customer <span className="text-red-500">*</span></label>
                <select className={inputCls} value={form.dealer_id} onChange={set('dealer_id')}>
                  <option value="">Select dealer...</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} — {c.city}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Scheme Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheme Name <span className="text-red-500">*</span></label>
                  <input className={inputCls} value={form.scheme_name} onChange={set('scheme_name')} placeholder="e.g. Summer Special 2025" />
                </div>
                {/* Scheme Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheme Type</label>
                  <select className={inputCls} value={form.scheme_type} onChange={set('scheme_type')}>
                    {SCHEME_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Target Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Amount (₹)</label>
                  <input type="number" min="0" className={inputCls} value={form.target_amount} onChange={set('target_amount')} />
                </div>
                {/* Target Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Quantity (units)</label>
                  <input type="number" min="0" className={inputCls} value={form.target_quantity} onChange={set('target_quantity')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Benefit Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Benefit Type</label>
                  <select className={inputCls} value={form.benefit_type} onChange={set('benefit_type')}>
                    {BENEFIT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                {/* Benefit Value */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Benefit Value {form.benefit_type === 'Discount' || form.benefit_type === 'Commission' ? '(%)' : '(₹ or qty)'}
                  </label>
                  <input type="number" min="0" step="0.01" className={inputCls} value={form.benefit_value} onChange={set('benefit_value')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Start Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date <span className="text-red-500">*</span></label>
                  <input type="date" className={inputCls} value={form.start_date} onChange={set('start_date')} />
                </div>
                {/* End Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date <span className="text-red-500">*</span></label>
                  <input type="date" className={inputCls} value={form.end_date} onChange={set('end_date')} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className={inputCls} value={form.status} onChange={set('status')}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea className={inputCls + ' resize-none'} rows={2} value={form.notes ?? ''} onChange={set('notes')} placeholder="Any additional notes..." />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60">
                {saving ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><Award size={15} /> {editId ? 'Update' : 'Add Scheme'}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 mt-8 space-y-1">
        <div>Data Source: External Supabase ({SUPABASE_URL})</div>
        <div>Table: dealer_schemes</div>
        <div>Rows Fetched: {rowsFetched}</div>
        <div>Invoices cross-referenced: {invoices.length}</div>
        <div>Last Error: {error ?? 'none'}</div>
      </div>
    </div>
  );
}
