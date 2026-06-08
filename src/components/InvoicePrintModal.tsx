import { useEffect } from 'react';
import { X, Printer, Download } from 'lucide-react';
import type { SalesInvoice } from '../context/SalesContext';
import type { Customer } from '../types';
import type { Product } from '../types';
import { useCompany } from '../context/CompanyContext';

interface InvoicePrintModalProps {
  invoice: SalesInvoice;
  customer: Customer | null;
  products: Product[];
  onClose: () => void;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

function fmtINR(n: number | string) {
  return Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

const TERMS = [
  'Goods once sold will not be taken back.',
  'All disputes are subject to Rajkot jurisdiction only.',
  'Interest @ 24% p.a. will be charged on overdue payments.',
  'E. & O. E.',
];

export function InvoicePrintModal({ invoice, customer, products, onClose }: InvoicePrintModalProps) {
  const { settings } = useCompany();

  const productMap = new Map(products.map(p => [p.id, p]));
  const items = invoice.items ?? [];
  const subTotal = Number(invoice.total_amount);
  const paidAmt = Number(invoice.paid_amount);
  const outstanding = Number(invoice.outstanding_amount);
  const totalWords = amountToWords(subTotal);

  // Derived company info — fall back to ARP TankPro defaults if not yet set
  const companyName    = settings?.company_name   || 'ARP TankPro';
  const brandName      = settings?.brand_name     || 'Complete Water Tank Business Management';
  const companyMobile  = settings?.mobile         || '—';
  const companyEmail   = settings?.email          || '—';
  const companyAddress = [settings?.address, settings?.city, settings?.state, settings?.pincode]
    .filter(Boolean).join(', ') || 'Rajkot, Gujarat, India';
  const companyGST     = settings?.gst_number     || '—';
  const companyLogo    = settings?.logo_url        || '';

  useEffect(() => {
    const style = document.createElement('style');
    style.id = '__arp_invoice_print_css__';
    style.textContent = `
      @media print {
        @page { size: A4 portrait; margin: 8mm; }
        body > * { display: none !important; }
        #arp-invoice-print-wrapper { display: block !important; }
        #arp-invoice-print-wrapper * { visibility: visible !important; }
        #arp-invoice-print-wrapper {
          position: fixed !important;
          inset: 0 !important;
          z-index: 999999 !important;
          background: white !important;
          overflow: visible !important;
        }
        .no-print { display: none !important; }
        .print-page {
          width: 100% !important;
          font-size: 11px !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.getElementById('__arp_invoice_print_css__')?.remove();
  }, []);

  const handlePrint = () => window.print();

  const handlePDF = () => {
    const tip = document.getElementById('__pdf_tip__');
    if (tip) { tip.style.display = 'block'; setTimeout(() => { if (tip) tip.style.display = 'none'; }, 5000); }
    window.print();
  };

  const BORDER = '1px solid #000';
  const cell = { border: BORDER, padding: '4px 6px', verticalAlign: 'top' as const };
  const thCell = { ...cell, textAlign: 'center' as const, fontWeight: 700, background: '#f5f5f5' };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl my-4">

        {/* ── Toolbar (no-print) ── */}
        <div className="no-print flex items-center justify-between bg-gray-900 text-white px-5 py-3 rounded-t-lg">
          <span className="text-sm font-semibold">Estimate Preview — {invoice.invoice_no}</span>
          <div className="flex items-center gap-3">
            <span id="__pdf_tip__" className="text-xs text-yellow-300" style={{ display: 'none' }}>
              In print dialog → Destination → "Save as PDF"
            </span>
            <button onClick={handlePDF} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded text-sm transition">
              <Download size={14} /> PDF
            </button>
            <button onClick={handlePrint} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-sm transition">
              <Printer size={14} /> Print
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-700 rounded transition">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── PRINTABLE AREA ── */}
        <div id="arp-invoice-print-wrapper">
          <div className="print-page bg-white" style={{ fontFamily: 'Arial, sans-serif', fontSize: 12, color: '#000', border: '2px solid #000', padding: 0 }}>

            {/* Row 1 — ESTIMATE (A) title */}
            <div style={{ borderBottom: BORDER, textAlign: 'center', padding: '4px 0', fontWeight: 700, fontSize: 15, letterSpacing: 2 }}>
              ESTIMATE &nbsp;( A )
            </div>

            {/* Row 2 — Debit Memo / OTHER / Original */}
            <div style={{ display: 'flex', borderBottom: BORDER }}>
              {['Debit Memo', 'OTHER', 'Original'].map((label, i) => (
                <div key={i} style={{ flex: 1, textAlign: 'center', padding: '3px 0', fontWeight: 600, fontSize: 11, borderRight: i < 2 ? BORDER : 'none' }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Row 3 — Company Header (from Settings) */}
            <div style={{ borderBottom: BORDER, padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {companyLogo && (
                <img src={companyLogo} alt="Logo" style={{ width: 52, height: 52, objectFit: 'contain' }} />
              )}
              <div style={{ flex: 1, textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>{companyName}</div>
                {brandName && <div style={{ fontSize: 11, marginTop: 2 }}>{brandName}</div>}
                <div style={{ fontSize: 10, marginTop: 2, color: '#333' }}>
                  {companyAddress}
                  {companyMobile !== '—' && <span> &nbsp;|&nbsp; Ph: {companyMobile}</span>}
                  {companyEmail !== '—' && <span> &nbsp;|&nbsp; {companyEmail}</span>}
                </div>
                {companyGST !== '—' && (
                  <div style={{ fontSize: 10, marginTop: 2, fontWeight: 600 }}>GSTIN: {companyGST}</div>
                )}
              </div>
            </div>

            {/* Row 4 — M/s + Invoice No/Date */}
            <div style={{ display: 'flex', borderBottom: BORDER, minHeight: 72 }}>
              <div style={{ flex: 1, padding: '6px 10px', borderRight: BORDER }}>
                <div style={{ fontSize: 10, color: '#555', marginBottom: 2 }}>M/s :</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{customer?.name ?? '—'}</div>
                {customer?.address && <div style={{ fontSize: 11, marginTop: 2 }}>{customer.address}{customer.city ? `, ${customer.city}` : ''}</div>}
                {customer?.mobile && <div style={{ fontSize: 11, marginTop: 2 }}>Mob: {customer.mobile}</div>}
                {customer?.gst_number
                  ? <div style={{ fontSize: 11, marginTop: 2 }}>GSTIN: <strong>{customer.gst_number}</strong></div>
                  : <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>GSTIN: Unregistered</div>}
              </div>
              <div style={{ width: 200, padding: '6px 10px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                  <tbody>
                    {[
                      ['Invoice No', invoice.invoice_no],
                      ['Date', fmtDate(invoice.invoice_date)],
                      ['Type', customer?.dealer_type ?? '—'],
                    ].map(([label, value]) => (
                      <tr key={label}>
                        <td style={{ paddingBottom: 4, fontWeight: 600, whiteSpace: 'nowrap' }}>{label}&nbsp;:</td>
                        <td style={{ paddingBottom: 4, paddingLeft: 4 }}>{value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 5 — Product Table */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  <th style={{ ...thCell, width: 28 }}>Sr</th>
                  <th style={{ ...thCell, textAlign: 'left' }}>Product Description</th>
                  <th style={{ ...thCell, width: 60 }}>HSN</th>
                  <th style={{ ...thCell, width: 40 }}>Qty</th>
                  <th style={{ ...thCell, width: 70 }}>Rate (₹)</th>
                  <th style={{ ...thCell, width: 52 }}>GST %</th>
                  <th style={{ ...thCell, width: 80 }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ ...cell, textAlign: 'center', color: '#888', padding: '12px' }}>No items</td>
                  </tr>
                ) : (
                  items.map((item, idx) => {
                    const prod = productMap.get(item.product_id);
                    const desc = prod
                      ? [prod.tank_name, prod.capacity, prod.layer_type ? `${prod.layer_type} Layer` : null, prod.color].filter(Boolean).join(' | ')
                      : '—';
                    return (
                      <tr key={item.id}>
                        <td style={{ ...cell, textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ ...cell }}>{desc}</td>
                        <td style={{ ...cell, textAlign: 'center' }}>—</td>
                        <td style={{ ...cell, textAlign: 'center' }}>{item.quantity}</td>
                        <td style={{ ...cell, textAlign: 'right' }}>{fmtINR(item.rate)}</td>
                        <td style={{ ...cell, textAlign: 'center' }}>—</td>
                        <td style={{ ...cell, textAlign: 'right' }}>{fmtINR(item.amount)}</td>
                      </tr>
                    );
                  })
                )}
                {/* Filler rows */}
                {Array.from({ length: Math.max(0, 6 - items.length) }).map((_, i) => (
                  <tr key={`filler-${i}`} style={{ height: 22 }}>
                    {[...Array(7)].map((_, j) => <td key={j} style={{ ...cell }}>&nbsp;</td>)}
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Row 6 — Company GSTIN + Subtotal */}
            <div style={{ display: 'flex', borderTop: BORDER }}>
              <div style={{ flex: 1, padding: '4px 10px', borderRight: BORDER, fontSize: 11 }}>
                <strong>Seller GSTIN :</strong>&nbsp;{companyGST}
              </div>
              <div style={{ width: 152, padding: '4px 10px', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 11 }}>
                <span>Sub Total</span>
                <span>₹ {fmtINR(subTotal)}</span>
              </div>
            </div>

            {/* Row 7 — Notes + Amount Paid */}
            <div style={{ display: 'flex', borderTop: BORDER }}>
              <div style={{ flex: 1, padding: '4px 10px', borderRight: BORDER, fontSize: 11, minHeight: 30 }}>
                <strong>Notes :</strong>&nbsp;{invoice.notes ?? '—'}
              </div>
              <div style={{ width: 152, padding: '4px 10px', display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#197a00', fontWeight: 600 }}>
                <span>Amt Paid</span>
                <span>₹ {fmtINR(paidAmt)}</span>
              </div>
            </div>

            {/* Row 8 — Amount in Words + Grand Total */}
            <div style={{ display: 'flex', borderTop: BORDER }}>
              <div style={{ flex: 1, padding: '4px 10px', borderRight: BORDER, fontSize: 11 }}>
                <strong>Amount in Words :</strong>&nbsp;<em>{totalWords}</em>
              </div>
              <div style={{ width: 152, padding: '4px 10px', display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12, background: '#f0f0f0' }}>
                <span>Grand Total</span>
                <span>₹ {fmtINR(outstanding)}</span>
              </div>
            </div>

            {/* Row 9 — Terms & Conditions + Authorized Signatory */}
            <div style={{ display: 'flex', borderTop: BORDER, minHeight: 72 }}>
              <div style={{ flex: 1, padding: '6px 10px', borderRight: BORDER, fontSize: 10 }}>
                <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 11 }}>Terms &amp; Conditions :</div>
                <ol style={{ margin: 0, paddingLeft: 16 }}>
                  {TERMS.map((t, i) => <li key={i} style={{ marginBottom: 2 }}>{t}</li>)}
                </ol>
              </div>
              <div style={{ width: 200, padding: '6px 10px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontSize: 11 }}>
                <div style={{ textAlign: 'center', fontWeight: 600 }}>For {companyName}</div>
                <div style={{ textAlign: 'center', borderTop: '1px solid #000', paddingTop: 4, fontSize: 10, marginTop: 30 }}>
                  Authorized Signatory
                </div>
              </div>
            </div>

            {/* Row 10 — Footer */}
            <div style={{ borderTop: BORDER, padding: '3px 10px', textAlign: 'center', fontSize: 9, color: '#555' }}>
              This is a computer generated estimate. Generated by ARP TankPro ERP · {new Date().toLocaleString('en-IN')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Indian amount-to-words ────────────────────────────────────────────────────
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
  const crore = Math.floor(rupees / 10000000);
  const lakh = Math.floor((rupees % 10000000) / 100000);
  const thousand = Math.floor((rupees % 100000) / 1000);
  const remaining = rupees % 1000;

  if (crore > 0) result += convertHundreds(crore) + 'Crore ';
  if (lakh > 0) result += convertHundreds(lakh) + 'Lakh ';
  if (thousand > 0) result += convertHundreds(thousand) + 'Thousand ';
  if (remaining > 0) result += convertHundreds(remaining);
  result = result.trim() + ' Rupees';
  if (paise > 0) result += ' and ' + convertHundreds(paise).trim() + ' Paise';
  return result + ' Only';
}
