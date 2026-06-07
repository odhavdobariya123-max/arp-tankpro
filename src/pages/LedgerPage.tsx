import { useState, useMemo } from 'react';
import { useCustomers } from '../context/CustomerContext';
import { useSales } from '../context/SalesContext';
import { usePayments } from '../context/PaymentContext';
import {
  BookOpen, Printer, Download, RefreshCw, AlertCircle,
  TrendingUp, Banknote, User, ChevronDown,
} from 'lucide-react';

const SUPABASE_URL = 'https://tkkxhjfzgnnpgxluqkwx.supabase.co';

interface LedgerRow {
  date: string;
  type: 'Invoice' | 'Payment';
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  notes: string;
  sortKey: string;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function fmtAmt(n: number) {
  return n > 0 ? `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '';
}

function fmtBalance(n: number) {
  return `₹${Math.abs(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}${n < 0 ? ' Cr' : ' Dr'}`;
}

export function LedgerPage() {
  const { customers } = useCustomers();
  const { invoices, loading: invLoading, error: invError, rowsFetched: invFetched, fetchInvoices } = useSales();
  const { payments, loading: pymtLoading, error: pymtError, rowsFetched: pymtFetched, fetchPayments } = usePayments();

  const [selectedCustomerId, setSelectedCustomerId] = useState('');

  const customer = useMemo(
    () => customers.find(c => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const customerInvoices = useMemo(
    () => invoices.filter(inv => inv.customer_id === selectedCustomerId),
    [invoices, selectedCustomerId],
  );

  const customerPayments = useMemo(
    () => payments.filter(p => p.customer_id === selectedCustomerId),
    [payments, selectedCustomerId],
  );

  // Build combined sorted ledger rows with running balance
  const ledgerRows: LedgerRow[] = useMemo(() => {
    if (!selectedCustomerId) return [];

    const rows: LedgerRow[] = [];

    for (const inv of customerInvoices) {
      rows.push({
        date: inv.invoice_date,
        type: 'Invoice',
        reference: inv.invoice_no,
        debit: Number(inv.total_amount),
        credit: 0,
        balance: 0,
        notes: inv.notes ?? '',
        sortKey: `${inv.invoice_date}_0_${inv.created_at}`,
      });
    }

    for (const p of customerPayments) {
      rows.push({
        date: p.payment_date,
        type: 'Payment',
        reference: `PMT/${p.payment_date.replace(/-/g, '')}`,
        debit: 0,
        credit: Number(p.amount),
        balance: 0,
        notes: [p.payment_mode, p.notes].filter(Boolean).join(' — '),
        sortKey: `${p.payment_date}_1_${p.created_at}`,
      });
    }

    // Sort chronologically — invoices before payments on same date
    rows.sort((a, b) => a.sortKey.localeCompare(b.sortKey));

    // Compute running balance (opening balance + debit - credit)
    const opening = Number(customer?.opening_balance ?? 0);
    let running = opening;
    for (const row of rows) {
      running = running + row.debit - row.credit;
      row.balance = running;
    }

    return rows;
  }, [selectedCustomerId, customerInvoices, customerPayments, customer]);

  const totalDebit = useMemo(() => ledgerRows.reduce((s, r) => s + r.debit, 0), [ledgerRows]);
  const totalCredit = useMemo(() => ledgerRows.reduce((s, r) => s + r.credit, 0), [ledgerRows]);
  const closingBalance = ledgerRows.length > 0 ? ledgerRows[ledgerRows.length - 1].balance : Number(customer?.opening_balance ?? 0);

  const anyError = invError || pymtError;
  const loading = invLoading || pymtLoading;

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!customer || ledgerRows.length === 0) return;

    const header = ['Date', 'Type', 'Reference No', 'Debit (₹)', 'Credit (₹)', 'Balance (₹)', 'Notes'];
    const dataRows = ledgerRows.map(r => [
      fmtDate(r.date),
      r.type,
      r.reference,
      r.debit > 0 ? r.debit.toFixed(2) : '',
      r.credit > 0 ? r.credit.toFixed(2) : '',
      r.balance.toFixed(2),
      r.notes,
    ]);

    const csvContent = [
      [`ARP TankPro — Customer Ledger`],
      [`Customer: ${customer.name}`],
      [`Mobile: ${customer.mobile}`, `GST: ${customer.gst_number ?? 'N/A'}`],
      [`Outstanding: ₹${Number(customer.current_outstanding).toLocaleString('en-IN')}`],
      [],
      header,
      ...dataRows,
      [],
      ['', '', 'TOTAL', totalDebit.toFixed(2), totalCredit.toFixed(2), closingBalance.toFixed(2), ''],
    ]
      .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ledger_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Print ───────────────────────────────────────────────────────────────────
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 print:p-4" id="ledger-print-area">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3 print:hidden">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center gap-3">
          <BookOpen className="text-blue-600" size={32} />
          Customer Ledger
        </h1>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => { fetchInvoices(); fetchPayments(); }}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-200 transition text-sm"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          <button
            onClick={handlePrint}
            disabled={!selectedCustomerId}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-gray-900 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Printer size={16} /> Print Ledger
          </button>
          <button
            onClick={handleExportCSV}
            disabled={!selectedCustomerId || ledgerRows.length === 0}
            className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download size={16} /> Export CSV
          </button>
        </div>
      </div>

      {/* Print title — visible only during print */}
      <div className="hidden print:block mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ARP TankPro — Customer Ledger</h1>
        {customer && (
          <p className="text-sm text-gray-600 mt-1">
            {customer.name} | {customer.mobile} | GST: {customer.gst_number ?? 'N/A'}
          </p>
        )}
      </div>

      {/* Error Banner */}
      {anyError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3 print:hidden">
          <AlertCircle className="text-red-600 shrink-0" size={18} />
          <p className="text-sm text-red-700">{anyError}</p>
        </div>
      )}

      {/* Customer Selector */}
      <div className="bg-white rounded-xl shadow p-6 mb-6 print:hidden">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Customer
        </label>
        <div className="relative">
          <select
            value={selectedCustomerId}
            onChange={e => setSelectedCustomerId(e.target.value)}
            className="w-full px-4 py-3 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 appearance-none bg-white text-sm"
          >
            <option value="">— Choose a customer to view their ledger —</option>
            {customers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}{c.city ? ` (${c.city})` : ''} — Outstanding: ₹{Number(c.current_outstanding).toLocaleString('en-IN')}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {/* Customer Info Card */}
      {customer && (
        <div className="bg-white rounded-xl shadow p-6 mb-6 border-l-4 border-blue-600">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-100 p-3 rounded-lg">
              <User className="text-blue-600" size={20} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{customer.name}</h2>
              <p className="text-sm text-gray-500">{customer.dealer_type}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium">Mobile</p>
              <p className="font-semibold text-gray-800">{customer.mobile || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium">GST Number</p>
              <p className="font-semibold text-gray-800">{customer.gst_number || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium">City</p>
              <p className="font-semibold text-gray-800">{customer.city || '—'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs uppercase font-medium">Current Outstanding</p>
              <p className={`font-bold text-lg ${Number(customer.current_outstanding) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                ₹{Number(customer.current_outstanding).toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      {selectedCustomerId && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-5 rounded-xl shadow border-l-4 border-blue-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase font-medium">Total Invoice Amount</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">₹{totalDebit.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400 mt-1">{customerInvoices.length} invoice(s)</p>
              </div>
              <TrendingUp className="text-blue-400" size={28} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow border-l-4 border-green-600">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase font-medium">Total Payment Received</p>
                <p className="text-2xl font-bold text-green-700 mt-1">₹{totalCredit.toLocaleString('en-IN')}</p>
                <p className="text-xs text-gray-400 mt-1">{customerPayments.length} payment(s)</p>
              </div>
              <Banknote className="text-green-400" size={28} />
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow border-l-4 border-orange-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs uppercase font-medium">Current Outstanding</p>
                <p className={`text-2xl font-bold mt-1 ${Number(customer?.current_outstanding ?? 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                  ₹{Number(customer?.current_outstanding ?? 0).toLocaleString('en-IN')}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {closingBalance >= 0 ? 'Debit (amount due)' : 'Credit (advance paid)'}
                </p>
              </div>
              <AlertCircle className="text-orange-400" size={28} />
            </div>
          </div>
        </div>
      )}

      {/* Empty state when no customer selected */}
      {!selectedCustomerId && (
        <div className="bg-white rounded-xl shadow p-12 text-center text-gray-500 print:hidden">
          <BookOpen size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium text-gray-400">Select a customer above to view their ledger</p>
          <p className="text-sm mt-2 text-gray-400">{customers.length} customer(s) available</p>
        </div>
      )}

      {/* Ledger Table */}
      {selectedCustomerId && (
        <div className="bg-white rounded-xl shadow overflow-hidden mb-6">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-800">
                Ledger — {customer?.name}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Showing all transactions sorted by date
                {Number(customer?.opening_balance) > 0 &&
                  ` · Opening Balance: ₹${Number(customer?.opening_balance).toLocaleString('en-IN')}`}
              </p>
            </div>
            <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">
              {ledgerRows.length} transaction(s)
            </span>
          </div>

          {loading ? (
            <div className="p-10 text-center text-gray-500">Loading transactions...</div>
          ) : ledgerRows.length === 0 ? (
            <div className="p-10 text-center text-gray-500">
              No transactions found for this customer.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Reference No</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Debit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Credit</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">Running Balance</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase hidden md:table-cell">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {/* Opening Balance row */}
                  {Number(customer?.opening_balance) > 0 && (
                    <tr className="bg-yellow-50">
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">—</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          Opening
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">Opening Balance</td>
                      <td className="px-4 py-3 text-right font-medium text-blue-700">
                        {fmtAmt(Number(customer?.opening_balance))}
                      </td>
                      <td className="px-4 py-3 text-right"></td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-700">
                        {fmtBalance(Number(customer?.opening_balance))}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell">Carried forward</td>
                    </tr>
                  )}

                  {ledgerRows.map((row, idx) => (
                    <tr
                      key={idx}
                      className={row.type === 'Invoice' ? 'hover:bg-blue-50' : 'hover:bg-green-50'}
                    >
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{fmtDate(row.date)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            row.type === 'Invoice'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-700 whitespace-nowrap">
                        {row.reference}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue-700">
                        {fmtAmt(row.debit)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-green-700">
                        {fmtAmt(row.credit)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold whitespace-nowrap ${
                        row.balance > 0 ? 'text-orange-600' : row.balance < 0 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {fmtBalance(row.balance)}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 hidden md:table-cell max-w-xs truncate">
                        {row.notes || '—'}
                      </td>
                    </tr>
                  ))}

                  {/* Totals row */}
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                    <td className="px-4 py-3 text-gray-700" colSpan={3}>TOTAL</td>
                    <td className="px-4 py-3 text-right text-blue-700">
                      ₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-right text-green-700">
                      ₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${
                      closingBalance > 0 ? 'text-orange-600' : closingBalance < 0 ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {fmtBalance(closingBalance)}
                    </td>
                    <td className="hidden md:table-cell px-4 py-3"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Debug Panel */}
      <div className="bg-gray-900 text-green-400 font-mono text-xs rounded-lg p-4 space-y-1 print:hidden">
        <div>Data Source: External Supabase ({SUPABASE_URL})</div>
        <div>Table: sales_invoices | payment_collections | customers</div>
        <div>Invoices fetched: {invFetched}</div>
        <div>Payments fetched: {pymtFetched}</div>
        <div>Customer invoices (selected): {customerInvoices.length}</div>
        <div>Customer payments (selected): {customerPayments.length}</div>
        <div>Last Error: {anyError ?? 'none'}</div>
      </div>
    </div>
  );
}
