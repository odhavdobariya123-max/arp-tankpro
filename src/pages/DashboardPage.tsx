import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, Package, DollarSign } from 'lucide-react';
import { useCustomers } from '../context/CustomerContext';
import { useProducts } from '../context/ProductContext';

export function DashboardPage() {
  const { customers } = useCustomers();
  const { products } = useProducts();

  const stats = [
    { label: 'Total Revenue', value: '₹1,23,456', icon: DollarSign, color: 'bg-blue-500' },
    { label: 'Active Customers', value: String(customers.length), icon: Users, color: 'bg-green-500' },
    { label: 'Total Products', value: String(products.length), icon: Package, color: 'bg-yellow-500' },
    { label: 'Monthly Growth', value: '12.5%', icon: TrendingUp, color: 'bg-sky-500' },
  ];

  const chartData = [
    { month: 'Jan', revenue: 40000, orders: 24 },
    { month: 'Feb', revenue: 45000, orders: 28 },
    { month: 'Mar', revenue: 38000, orders: 20 },
    { month: 'Apr', revenue: 52000, orders: 35 },
    { month: 'May', revenue: 58000, orders: 42 },
    { month: 'Jun', revenue: 61000, orders: 48 },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome to ARP TankPro ERP</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-600">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm mb-1">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Revenue Trend</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip formatter={(value: unknown) => `₹${Number(value).toLocaleString('en-IN')}`} />
            <Legend />
            <Bar dataKey="revenue" fill="#3B82F6" name="Revenue" />
            <Bar dataKey="orders" fill="#10B981" name="Orders" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
