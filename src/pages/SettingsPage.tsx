import { useState, useEffect, useRef } from 'react';
import { useCompany } from '../context/CompanyContext';
import { Settings, Save, Loader2, AlertCircle, RefreshCw, Upload, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

const SUPABASE_URL = 'https://tkkxhjfzgnnpgxluqkwx.supabase.co';

const CREATE_SQL = `-- Run in Supabase SQL Editor:
CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text,
  brand_name text,
  gst_number text,
  mobile text,
  email text,
  address text,
  city text,
  state text,
  pincode text,
  invoice_prefix text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read company" ON company_settings FOR SELECT USING (auth.role()='authenticated');
CREATE POLICY "auth insert company" ON company_settings FOR INSERT WITH CHECK (auth.role()='authenticated');
CREATE POLICY "auth update company" ON company_settings FOR UPDATE USING (auth.role()='authenticated');`;

type FormData = {
  company_name: string;
  brand_name: string;
  gst_number: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  invoice_prefix: string;
  logo_url: string;
};

const empty: FormData = {
  company_name: '', brand_name: '', gst_number: '', mobile: '',
  email: '', address: '', city: '', state: '', pincode: '',
  invoice_prefix: 'INV', logo_url: '',
};

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm';

export function SettingsPage() {
  const { settings, loading, error, rowsFetched, fetchSettings, saveSettings } = useCompany();
  const [form, setForm] = useState<FormData>(empty);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const fileRef = useRef<HTMLInputElement>(null);

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setForm({
        company_name:   settings.company_name   ?? '',
        brand_name:     settings.brand_name     ?? '',
        gst_number:     settings.gst_number     ?? '',
        mobile:         settings.mobile         ?? '',
        email:          settings.email          ?? '',
        address:        settings.address        ?? '',
        city:           settings.city           ?? '',
        state:          settings.state          ?? '',
        pincode:        settings.pincode        ?? '',
        invoice_prefix: settings.invoice_prefix ?? 'INV',
        logo_url:       settings.logo_url       ?? '',
      });
      setLogoPreview(settings.logo_url ?? '');
    }
  }, [settings]);

  const set = (key: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(prev => ({ ...prev, [key]: e.target.value }));

  // Logo file → base64
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) { toast.error('Logo must be under 500 KB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      setForm(prev => ({ ...prev, logo_url: base64 }));
      setLogoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.company_name.trim()) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      await saveSettings(form);
      toast.success('Company settings saved!');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const isTableMissing = error && (error.includes('does not exist') || error.includes('relation') || error.includes('42P01'));

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
          <p className="text-gray-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="text-blue-600" size={32} />
          Company Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {settings ? 'Update your company profile' : 'Create your company profile to get started'}
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="text-red-600 shrink-0" size={20} />
            <p className="text-red-700 text-sm font-medium">{error}</p>
            <button onClick={fetchSettings} className="ml-auto text-sm text-red-600 underline flex items-center gap-1">
              <RefreshCw size={14} /> Retry
            </button>
          </div>
          {isTableMissing && (
            <div className="mt-3">
              <p className="text-xs text-red-600 mb-2 font-medium">Table missing. Run this SQL in your Supabase dashboard:</p>
              <pre className="bg-red-900 text-green-300 text-xs rounded p-3 overflow-x-auto whitespace-pre-wrap">{CREATE_SQL}</pre>
            </div>
          )}
        </div>
      )}

      {/* New profile notice */}
      {!settings && !error && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <Building2 className="text-blue-600 shrink-0" size={20} />
          <p className="text-blue-700 text-sm">No company profile found. Fill in the form below to create your first profile.</p>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6 space-y-6">

        {/* ── Logo ── */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">Company Logo</p>
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden bg-gray-50">
              {logoPreview
                ? <img src={logoPreview} alt="Logo" className="w-full h-full object-contain" />
                : <Building2 size={28} className="text-gray-300" />}
            </div>
            <div>
              <button
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                <Upload size={15} /> Upload Logo
              </button>
              <p className="text-xs text-gray-400 mt-1">PNG/JPG, max 500 KB — stored as base64</p>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>
            {logoPreview && (
              <button
                onClick={() => { setLogoPreview(''); setForm(prev => ({ ...prev, logo_url: '' })); }}
                className="text-xs text-red-500 hover:underline"
              >Remove</button>
            )}
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Basic Info ── */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">Basic Information</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Company Name" required>
              <input className={inputCls} value={form.company_name} onChange={set('company_name')} placeholder="e.g. ARP Industries Pvt. Ltd." />
            </Field>
            <Field label="Brand Name">
              <input className={inputCls} value={form.brand_name} onChange={set('brand_name')} placeholder="e.g. ARP TankPro" />
            </Field>
            <Field label="GST Number">
              <input className={inputCls} value={form.gst_number} onChange={set('gst_number')} placeholder="e.g. 24XXXXX1234Z1" maxLength={15} />
            </Field>
            <Field label="Invoice Prefix">
              <input className={inputCls} value={form.invoice_prefix} onChange={set('invoice_prefix')} placeholder="e.g. INV or ARP" maxLength={10} />
            </Field>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Contact ── */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">Contact Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Mobile">
              <input className={inputCls} value={form.mobile} onChange={set('mobile')} placeholder="e.g. 98765 43210" />
            </Field>
            <Field label="Email">
              <input className={inputCls} type="email" value={form.email} onChange={set('email')} placeholder="e.g. info@arp.com" />
            </Field>
          </div>
        </div>

        <div className="border-t border-gray-100" />

        {/* ── Address ── */}
        <div>
          <p className="text-sm font-semibold text-gray-800 mb-3">Address</p>
          <div className="grid grid-cols-1 gap-4">
            <Field label="Street Address">
              <textarea
                className={inputCls + ' resize-none'}
                rows={2}
                value={form.address}
                onChange={set('address')}
                placeholder="Plot No., Street, Area..."
              />
            </Field>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Field label="City">
                <input className={inputCls} value={form.city} onChange={set('city')} placeholder="Rajkot" />
              </Field>
              <Field label="State">
                <input className={inputCls} value={form.state} onChange={set('state')} placeholder="Gujarat" />
              </Field>
              <Field label="Pincode">
                <input className={inputCls} value={form.pincode} onChange={set('pincode')} placeholder="360001" maxLength={6} />
              </Field>
            </div>
          </div>
        </div>

        {/* ── Save Button ── */}
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={fetchSettings} className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition">
            <RefreshCw size={14} /> Reload
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-60"
          >
            {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</> : <><Save size={16} /> Save Settings</>}
          </button>
        </div>
      </div>

      {/* Preview Card */}
      {settings && (
        <div className="mt-6 bg-gradient-to-r from-blue-700 to-blue-500 text-white rounded-xl p-6">
          <p className="text-xs text-blue-200 font-medium uppercase tracking-widest mb-3">Invoice Header Preview</p>
          <div className="flex items-start gap-4">
            {settings.logo_url && (
              <img src={settings.logo_url} alt="Logo" className="w-14 h-14 object-contain bg-white rounded-lg p-1" />
            )}
            <div>
              <h2 className="text-2xl font-extrabold">{settings.company_name || 'Your Company Name'}</h2>
              {settings.brand_name && <p className="text-blue-200 text-sm">{settings.brand_name}</p>}
              {settings.address && <p className="text-blue-100 text-xs mt-1">{settings.address}{settings.city ? `, ${settings.city}` : ''}{settings.state ? `, ${settings.state}` : ''}</p>}
              <div className="flex flex-wrap gap-4 mt-2 text-xs text-blue-200">
                {settings.mobile && <span>📞 {settings.mobile}</span>}
                {settings.email && <span>✉️ {settings.email}</span>}
                {settings.gst_number && <span>GSTIN: {settings.gst_number}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Debug Panel */}
      <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 mt-6 space-y-1">
        <div>Data Source: External Supabase ({SUPABASE_URL})</div>
        <div>Table: company_settings</div>
        <div>Rows Fetched: {rowsFetched}</div>
        <div>Record ID: {settings?.id ?? 'none'}</div>
        <div>Last Error: {error ?? 'none'}</div>
      </div>
    </div>
  );
}
