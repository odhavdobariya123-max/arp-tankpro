import { useAuth } from '../context/AuthContext';
import {
  LogOut, Menu, X, LayoutDashboard, Users, Package,
  Warehouse, Factory, ShoppingCart, Banknote, BookOpen,
  BarChart2, Settings, TrendingUp,
} from 'lucide-react';
import { useState } from 'react';

type PageId =
  | 'dashboard' | 'customers' | 'products' | 'stock'
  | 'production' | 'sales' | 'payments' | 'ledger'
  | 'reports' | 'settings' | 'dealer_performance';

interface LayoutProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: React.ReactNode;
}

export function Layout({ currentPage, onNavigate, children }: LayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const navigationItems: { id: PageId; label: string; icon: React.ElementType; dividerBefore?: boolean }[] = [
    { id: 'dashboard',          label: 'Dashboard',            icon: LayoutDashboard },
    { id: 'customers',          label: 'Customers',             icon: Users },
    { id: 'products',           label: 'Products / Tanks',      icon: Package },
    { id: 'production',         label: 'Production Entry',      icon: Factory },
    { id: 'sales',              label: 'Sales Invoice',         icon: ShoppingCart },
    { id: 'payments',           label: 'Payment Collection',    icon: Banknote },
    { id: 'ledger',             label: 'Customer Ledger',       icon: BookOpen },
    { id: 'stock',              label: 'Stock Management',      icon: Warehouse },
    { id: 'dealer_performance', label: 'Dealer Performance',    icon: TrendingUp,  dividerBefore: true },
    { id: 'reports',            label: 'Reports',               icon: BarChart2 },
    { id: 'settings',           label: 'Settings',              icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 overflow-hidden flex flex-col shrink-0`}>
        <div className="p-6 border-b border-gray-800">
          <h2 className="text-xl font-bold">ARP TankPro</h2>
          <p className="text-xs text-gray-400 mt-1">ERP System</p>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {item.dividerBefore && <div className="border-t border-gray-700 my-2" />}
                <button
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition mb-1 ${
                    currentPage === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm">{item.label}</span>
                </button>
              </div>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <div className="text-xs text-gray-400 mb-3">
            <p>{user?.name}</p>
            <p className="text-gray-500">{user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg transition text-sm"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-100 rounded-lg">
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <div className="text-sm text-gray-600">{user?.name}</div>
        </div>
        <div className="flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
