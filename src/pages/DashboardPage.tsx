import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Package, ShoppingCart, AlertCircle, Factory, Banknote, CheckCircle } from 'lucide-react';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { useSales } from '../context/SalesContext';
import { useProduction } from '../context/ProductionContext';
import { usePayments } from '../context/PaymentContext';
import { useMemo } from 'react';

const today = () => new Date().toISOString().split('T')[0];

export function DashboardPage() {
  const { customers } = useCustomers();
  const { products } = useProducts();
  const { invoices } = useSales();
  const { entries } = useProduction();
  const { payments } = usePayments();

  const todayStr = today();

  const totalSales = useMemo(() => invoices.reduce((s, inv) => s + Number(inv.total_amount), 0), [invoices]);
  const totalOutstanding = useMemo(() => customers.reduce((s, c) => s + Number(c.current_outstanding ?? 0), 0), [customers]);
  const todaySales = useMemo(() =>
    invoices.filter(inv => inv.invoice_date === todayStr).reduce((s, inv) => s + Number(inv.total_amount), 0),
    [invoices, todayStr]
  );
  const todayProduction = useMemo(() =>
    entries.filter(e => e.production_date === todayStr).reduce((s, e) => s + e.quantity, 0),
    [entries, todayStr]
  );
  const totalCollections = useMemo(() => payments.reduce((s, p) => s + Number(p.amount), 0), [payments]);
  const todayCollections = useMemo(() =>
    payments.filter(p => p.payment_date === todayStr).reduce((s, p) => s + Number(p.amount), 0),
    [payments, todayStr]
  );

  // Chart: last 6 months — revenue vs collections
  const chartData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; collections: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      months[key] = { month: label, revenue: 0, collections: 0 };
    }
    for (const inv of invoices) {
      const key = inv.invoice_date.slice(0, 7);
      if (months[key]) months[key].revenue += Number(inv.total_amount);
    }
    for (const p of payments) {
      const key = p.payment_date.slice(0, 7);
      if (months[key]) months[key].collections += Number(p.amount);
    }
    return Object.values(months);
  }, [invoices, payments]);

  const stats = [
    {
      label: 'Total Sales',
      value: `₹${totalSales.toLocaleString('en-IN')}`,
      sub: `${invoices.length} invoice(s)`,
      icon: ShoppingCart,
      color: 'bg-blue-500',
      border: 'border-blue-600',
    },
    {
      label: 'Total Collections',
      value: `₹${totalCollections.toLocaleString('en-IN')}`,
      sub: `${payments.length} payment(s)`,
      icon: Banknote,
      color: 'bg-green-600',
      border: 'border-green-600',
    },
    {
      label: 'Outstanding Balance',
      value: `₹${totalOutstanding.toLocaleString('en-IN')}`,
      sub: `${customers.filter(c => Number(c.current_outstanding) > 0).length} customer(s)`,
      icon: AlertCircle,
      color: 'bg-orange-500',
      border: 'border-orange-500',
    },
    {
      label: 'Active Customers',
      value: String(customers.length),
      sub: 'registered',
      icon: Users,
      color: 'bg-sky-500',
      border: 'border-sky-500',
    },
    {
      label: 'Total Products',
      value: String(products.length),
      sub: 'in catalogue',
      icon: Package,
      color: 'bg-yellow-500',
      border: 'border-yellow-500',
    },
    {
      label: "Today's Sales",
      value: `₹${todaySales.toLocaleString('en-IN')}`,
      sub: `${invoices.filter(i => i.invoice_date === todayStr).length} invoice(s)`,
      icon: TrendingUp,
      color: 'bg-indigo-500',
      border: 'border-indigo-500',
    },
    {
      label: "Today's Collections",
      value: `₹${todayCollections.toLocaleString('en-IN')}`,
      sub: `${payments.filter(p => p.payment_date === todayStr).length} payment(s)`,
      icon: CheckCircle,
      color: 'bg-teal-500',
      border: 'border-teal-500',
    },
    {
      label: "Today's Production",
      value: String(todayProduction),
      sub: `${entries.filter(e => e.production_date === todayStr).length} entr(ies)`,
      icon: Factory,
      color: 'bg-purple-500',
      border: 'border-purple-500',
    },
  ];

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to ARP TankPro ERP</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`bg-white rounded-xl shadow p-5 border-l-4 ${stat.border}`}>
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-2">
                  <p className="text-gray-500 text-xs font-medium uppercase mb-1 leading-tight">{stat.label}</p>
                  <p className="text-xl font-bold text-gray-900 truncate">{stat.value}</p>
                  {stat.sub && <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>}
                </div>
                <div className={`${stat.color} p-2.5 rounded-lg shrink-0`}>
                  <Icon className="text-white" size={18} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue vs Collections Chart */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Revenue vs Collections — Last 6 Months</h2>
        <p className="text-xs text-gray-400 mb-6">Live from Supabase — sales_invoices & payment_collections</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: unknown) => `₹${Number(value).toLocaleString('en-IN')}`} />
            <Legend />
            <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
            <Bar dataKey="collections" fill="#10B981" name="Collections" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
