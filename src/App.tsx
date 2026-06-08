import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { StockPage } from './pages/StockPage';
import { ProductionPage } from './pages/ProductionPage';
import { SalesPage } from './pages/SalesPage';
import { PaymentPage } from './pages/PaymentPage';
import { LedgerPage } from './pages/LedgerPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';

type PageId =
  | 'dashboard' | 'customers' | 'products' | 'stock'
  | 'production' | 'sales' | 'payments' | 'ledger'
  | 'reports' | 'settings';

function App() {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  if (!user) {
    return (
      <>
        <LoginPage />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <>
      <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
        {currentPage === 'dashboard'  && <DashboardPage />}
        {currentPage === 'customers'  && <CustomersPage />}
        {currentPage === 'products'   && <ProductsPage />}
        {currentPage === 'production' && <ProductionPage />}
        {currentPage === 'sales'      && <SalesPage />}
        {currentPage === 'payments'   && <PaymentPage />}
        {currentPage === 'ledger'     && <LedgerPage />}
        {currentPage === 'stock'      && <StockPage />}
        {currentPage === 'reports'    && <ReportsPage />}
        {currentPage === 'settings'   && <SettingsPage />}
      </Layout>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
