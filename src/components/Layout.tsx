import { useAuth } from '../context/AuthContext';
import {
  LogOut, Menu, X, LayoutDashboard, Users, Package,
  Warehouse, Factory, ShoppingCart, Banknote, BookOpen,
  BarChart2, Settings, TrendingUp, MoreHorizontal,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const navigationItems: { id: PageId; label: string; icon: React.ElementType; dividerBefore?: boolean }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'products', label: 'Products / Tanks', icon: Package },
    { id: 'production', label: 'Production Entry', icon: Factory },
    { id: 'sales', label: 'Sales Invoice', icon: ShoppingCart },
    { id: 'payments', label: 'Payment Collection', icon: Banknote },
    { id: 'ledger', label: 'Customer Ledger', icon: BookOpen },
    { id: 'stock', label: 'Stock Management', icon: Warehouse },
    { id: 'dealer_performance', label: 'Dealer Performance', icon: TrendingUp, dividerBefore: true },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const goTo = (page: PageId) => {
    onNavigate(page);
    setSidebarOpen(false);
    setMoreOpen(false);
  };

  const bottomItems: { id: PageId; label: string; icon: React.ElementType }[] = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'sales', label: 'Sales', icon: ShoppingCart },
    { id: 'stock', label: 'Stock', icon: Warehouse },
  ];

  const moreItems = navigationItems.filter(
    (item) => !['dashboard', 'customers', 'sales', 'stock'].includes(item.id)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/40 z-30 md:hidden"
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed md:static inset-y-0 left-0 z-40
          ${sidebarOpen ? 'w-64 translate-x-0' : 'w-64 -translate-x-full md:translate-x-0'}
          bg-gray-900 text-white transition-transform duration-300
          flex flex-col shrink-0
          md:w-64
        `}
      >
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">ARP TankPro</h2>
            <p className="text-xs text-gray-400 mt-1">ERP System</p>
          </div>
          <button className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X size={22} />
          </button>
        </div>

        <nav className="flex-1 p-4 overflow-y-auto">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {item.dividerBefore && <div className="border-t border-gray-700 my-2" />}
                <button
                  onClick={() => goTo(item.id)}
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
      <div className="flex-1 flex flex-col min-w-0 md:ml-0">
        <div className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex items-center justify-between sticky top-0 z-20">
          <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-gray-100 rounded-lg">
            <Menu size={24} />
          </button>
          <div className="text-sm text-gray-600 truncate">{user?.name}</div>
        </div>

        <div className="flex-1 overflow-auto pb-24 md:pb-0">
          {children}
        </div>
      </div>

      {/* More Menu Mobile */}
      {moreOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} />
          <div className="absolute bottom-16 left-3 right-3 bg-white rounded-2xl shadow-xl p-3 max-h-[70vh] overflow-y-auto">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => goTo(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left mb-1 ${
                    currentPage === item.id
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              );
            })}
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left text-red-600 hover:bg-red-50 mt-2"
            >
              <LogOut size={20} />
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Navigation Mobile */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 md:hidden">
        <div className="grid grid-cols-5">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => goTo(item.id)}
                className={`py-2 flex flex-col items-center gap-1 text-[11px] ${
                  active ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <button
            onClick={() => setMoreOpen(true)}
            className={`py-2 flex flex-col items-center gap-1 text-[11px] ${
              moreOpen || moreItems.some((i) => i.id === currentPage)
                ? 'text-blue-600'
                : 'text-gray-500'
            }`}
          >
            <MoreHorizontal size={20} />
            <span>More</span>
          </button>
        </div>
      </div>
    </div>
  );
}
