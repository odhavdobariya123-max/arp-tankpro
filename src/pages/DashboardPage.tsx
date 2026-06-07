import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Package, ShoppingCart, AlertCircle, Factory } from 'lucide-react';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';
import { useSales } from '../context/SalesContext';
import { useProduction } from '../context/ProductionContext';
import { useMemo } from 'react';

const today = () => new Date().toISOString().split('T')[0];

export function DashboardPage() {
  const { customers } = useCustomers();
  const { products } = useProducts();
  const { invoices } = useSales();
  const { entries } = useProduction();

  const todayStr = today();

  const totalSales = useMemo(() => invoices.reduce((s, inv) => s + Number(inv.total_amount), 0), [invoices]);
  const totalOutstanding = useMemo(() => invoices.reduce((s, inv) => s + Number(inv.outstanding_amount), 0), [invoices]);
  const todaySales = useMemo(() =>
    invoices.filter(inv => inv.invoice_date === todayStr).reduce((s, inv) => s + Number(inv.total_amount), 0),
    [invoices, todayStr]
  );
  const todayProduction = useMemo(() =>
    entries.filter(e => e.production_date === todayStr).reduce((s, e) => s + e.quantity, 0),
    [entries, todayStr]
  );

  // Build last 6 months sales chart data from real invoices
  const chartData = useMemo(() => {
    const months: Record<string, { month: string; revenue: number; invoices: number }> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      months[key] = { month: label, revenue: 0, invoices: 0 };
    }
    for (const inv of invoices) {
      const key = inv.invoice_date.slice(0, 7);
      if (months[key]) {
        months[key].revenue += Number(inv.total_amount);
        months[key].invoices += 1;
      }
    }
    return Object.values(months);
  }, [invoices]);

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
      label: 'Active Customers',
      value: String(customers.length),
      sub: 'registered',
      icon: Users,
      color: 'bg-green-500',
      border: 'border-green-600',
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
      label: 'Outstanding',
      value: `₹${totalOutstanding.toLocaleString('en-IN')}`,
      sub: 'receivable',
      icon: AlertCircle,
      color: 'bg-orange-500',
      border: 'border-orange-500',
    },
    {
      label: "Today's Sales",
      value: `₹${todaySales.toLocaleString('en-IN')}`,
      sub: `${invoices.filter(i => i.invoice_date === todayStr).length} invoice(s) today`,
      icon: TrendingUp,
      color: 'bg-sky-500',
      border: 'border-sky-500',
    },
    {
      label: "Today's Production",
      value: String(todayProduction),
      sub: `${entries.filter(e => e.production_date === todayStr).length} entr(ies) today`,
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
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className={`bg-white rounded-xl shadow p-5 border-l-4 ${stat.border}`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-xs font-medium uppercase mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                  {stat.sub && <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>}
                </div>
                <div className={`${stat.color} p-3 rounded-lg shrink-0`}>
                  <Icon className="text-white" size={20} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Revenue Chart — real data */}
      <div className="bg-white rounded-xl shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">Revenue Trend — Last 6 Months</h2>
        <p className="text-xs text-gray-400 mb-6">Live from Supabase sales_invoices</p>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: unknown, name: string) =>
              name === 'Revenue' ? `₹${Number(value).toLocaleString('en-IN')}` : value
            } />
            <Legend />
            <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
            <Bar dataKey="invoices" fill="#10B981" name="Invoices" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
