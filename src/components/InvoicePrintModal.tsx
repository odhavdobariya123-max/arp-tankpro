import { useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import type { SalesInvoice } from '../context/SalesContext';
import type { Customer } from '../types';
import type { Product } from '../types';

interface InvoicePrintModalProps {
  invoice: SalesInvoice;
  customer: Customer | null;
  products: Product[];
  onClose: () => void;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function fmtINR(n: number) {
  return `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

export function InvoicePrintModal({ invoice, customer, products, onClose }: InvoicePrintModalProps) {
  const productMap = new Map(products.map(p => [p.id, p]));

  // Inject print CSS on mount, remove on unmount
  useEffect(() => {
    const style = document.createElement('style');
    style.id = '__arp_invoice_print_css__';
    style.textContent = `
      @media print {
        body * { visibility: hidden !important; }
        #arp-invoice-print-area,
        #arp-invoice-print-area * { visibility: visible !important; }
        #arp-invoice-print-area {
          position: fixed !important;
          left: 0 !important; top: 0 !important;
          width: 100% !important;
          background: white !important;
          z-index: 99999 !important;
        }
        .no-print { display: none !important; }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById('__arp_invoice_print_css__')?.remove();
  }, []);

  const handlePrint = () => window.print();

  const handleDownloadPDF = () => {
    const msg = document.getElementById('__pdf_tip__');
    if (msg) { msg.style.display = 'block'; setTimeout(() => { if (msg) msg.style.display = 'none'; }, 4000); }
    window.print();
  };

  const items = invoice.items ?? [];
  const totalWords = amountToWords(Number(invoice.total_amount));

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl my-6">

        {/* Action Toolbar — hidden on print */}
        <div className="no-print flex items-center justify-between bg-gray-800 text-white px-6 py-3 rounded-t-xl">
          <h3 className="font-semibold text-sm">Invoice Preview — {invoice.invoice_no}</h3>
          <div className="flex items-center gap-3">
            <p id="__pdf_tip__" className="text-xs text-yellow-300 hidden">
              In the print dialog, set Destination → "Save as PDF"
            </p>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm transition"
            >
              <Download size={15} /> Download PDF
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-sm transition"
            >
              <Printer size={15} /> Print Invoice
            </button>
            <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg transition">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── PRINTABLE INVOICE ── */}
        <div id="arp-invoice-print-area" className="bg-white shadow-2xl rounded-b-xl overflow-hidden">

          {/* Header Band */}
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 px-8 py-6 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight">ARP TankPro</h1>
                <p className="text-blue-200 text-sm mt-1 font-medium">Complete Water Tank Business Management</p>
                <p className="text-blue-300 text-xs mt-3">Rajkot, Gujarat, India</p>
              </div>
              <div className="text-right">
                <div className="bg-white/20 backdrop-blur rounded-xl px-5 py-3 inline-block">
                  <p className="text-blue-100 text-xs font-medium uppercase tracking-widest">Tax Invoice</p>
                  <p className="text-white text-2xl font-bold mt-1">{invoice.invoice_no}</p>
                  <p className="text-blue-200 text-xs mt-1">{fmtDate(invoice.invoice_date)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Info + Invoice Meta */}
          <div className="px-8 py-6 grid grid-cols-2 gap-8 border-b border-gray-200 bg-gray-50">

            {/* Bill To */}
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Bill To</p>
              {customer ? (
                <div className="space-y-1">
                  <p className="text-gray-900 font-bold text-lg leading-tight">{customer.name}</p>
                  {customer.address && <p className="text-gray-600 text-sm">{customer.address}</p>}
                  {customer.city && <p className="text-gray-600 text-sm">{customer.city}</p>}
                  {customer.mobile && (
                    <p className="text-gray-600 text-sm">
                      <span className="font-medium">Mobile:</span> {customer.mobile}
                    </p>
                  )}
                  {customer.gst_number && (
                    <p className="text-gray-600 text-sm">
                      <span className="font-medium">GSTIN:</span> {customer.gst_number}
                    </p>
                  )}
                  <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">
                    {customer.dealer_type}
                  </span>
                </div>
              ) : (
                <p className="text-gray-400 text-sm italic">Customer details unavailable</p>
              )}
            </div>

            {/* Invoice Details */}
            <div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-3">Invoice Details</p>
              <table className="text-sm w-full">
                <tbody className="space-y-1">
                  {[
                    ['Invoice No', invoice.invoice_no],
                    ['Invoice Date', fmtDate(invoice.invoice_date)],
                    ['Payment Status', Number(invoice.outstanding_amount) === 0 ? '✅ Paid' : Number(invoice.paid_amount) > 0 ? '⏳ Partial' : '🔴 Unpaid'],
                  ].map(([label, value]) => (
                    <tr key={label} className="border-b border-gray-100">
                      <td className="py-1.5 text-gray-500 font-medium w-32">{label}</td>
                      <td className="py-1.5 text-gray-800 font-semibold">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Items Table */}
          <div className="px-8 py-6">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-blue-600 text-white">
                  <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide rounded-tl-lg">#</th>
                  <th className="px-3 py-3 text-left font-semibold text-xs uppercase tracking-wide">Product</th>
                  <th className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide">Capacity</th>
                  <th className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide">Layer</th>
                  <th className="px-3 py-3 text-center font-semibold text-xs uppercase tracking-wide">Color</th>
                  <th className="px-3 py-3 text-right font-semibold text-xs uppercase tracking-wide">Qty</th>
                  <th className="px-3 py-3 text-right font-semibold text-xs uppercase tracking-wide">Rate (₹)</th>
                  <th className="px-3 py-3 text-right font-semibold text-xs uppercase tracking-wide rounded-tr-lg">Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-6 text-center text-gray-400 italic">No items</td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const product = productMap.get(item.product_id);
                    return (
                      <tr key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-blue-50/30'}>
                        <td className="px-3 py-3 text-gray-500 border-b border-gray-100">{idx + 1}</td>
                        <td className="px-3 py-3 font-semibold text-gray-900 border-b border-gray-100">
                          {product?.tank_name ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600 border-b border-gray-100">
                          {product?.capacity ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600 border-b border-gray-100">
                          {product?.layer_type ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-center text-gray-600 border-b border-gray-100">
                          {product?.color ?? '—'}
                        </td>
                        <td className="px-3 py-3 text-right font-medium text-gray-700 border-b border-gray-100">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-3 text-right text-gray-700 border-b border-gray-100">
                          {fmtINR(item.rate)}
                        </td>
                        <td className="px-3 py-3 text-right font-bold text-gray-900 border-b border-gray-100">
                          {fmtINR(item.amount)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Totals + Notes */}
          <div className="px-8 pb-6 grid grid-cols-2 gap-8">

            {/* Notes */}
            <div>
              {invoice.notes && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Notes</p>
                  <p className="text-sm text-gray-600 bg-blue-50 border border-blue-100 rounded-lg p-3 leading-relaxed">
                    {invoice.notes}
                  </p>
                </div>
              )}
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Amount in Words</p>
                <p className="text-sm text-gray-700 italic font-medium">{totalWords}</p>
              </div>
            </div>

            {/* Summary Box */}
            <div>
              <div className="bg-gray-50 border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-gray-200">
                      <td className="px-5 py-3 text-gray-600 font-medium">Subtotal</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{fmtINR(invoice.total_amount)}</td>
                    </tr>
                    <tr className="border-b border-gray-200">
                      <td className="px-5 py-3 text-gray-600 font-medium">Amount Paid</td>
                      <td className="px-5 py-3 text-right font-semibold text-green-600">{fmtINR(invoice.paid_amount)}</td>
                    </tr>
                    <tr className="bg-blue-600 text-white">
                      <td className="px-5 py-4 font-bold text-base">Outstanding Amount</td>
                      <td className={`px-5 py-4 text-right font-extrabold text-xl ${Number(invoice.outstanding_amount) === 0 ? 'text-green-300' : 'text-yellow-200'}`}>
                        {fmtINR(invoice.outstanding_amount)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="px-8 py-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
            <p className="text-xs text-gray-400">Generated by ARP TankPro ERP · {new Date().toLocaleString('en-IN')}</p>
            <p className="text-sm font-bold text-blue-600">Thank you for your business! 🙏</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Simple amount-to-words (Indian style) ──────────────────────────────────
function amountToWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertHundreds(n: number): string {
    if (n === 0) return '';
    if (n < 20) return ones[n] + ' ';
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ones[n % 10] : '') + ' ';
    return ones[Math.floor(n / 100)] + ' Hundred ' + convertHundreds(n % 100);
  }

  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);

  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';

  let result = '';
  if (rupees > 0) {
    const crore = Math.floor(rupees / 10000000);
    const lakh = Math.floor((rupees % 10000000) / 100000);
    const thousand = Math.floor((rupees % 100000) / 1000);
    const remaining = rupees % 1000;

    if (crore > 0) result += convertHundreds(crore) + 'Crore ';
    if (lakh > 0) result += convertHundreds(lakh) + 'Lakh ';
    if (thousand > 0) result += convertHundreds(thousand) + 'Thousand ';
    if (remaining > 0) result += convertHundreds(remaining);
    result = result.trim() + ' Rupees';
  }
  if (paise > 0) result += ' and ' + convertHundreds(paise).trim() + ' Paise';
  return result + ' Only';
}
