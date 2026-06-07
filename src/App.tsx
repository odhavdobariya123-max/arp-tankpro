import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { CustomersPage } from './pages/CustomersPage';
import { ProductsPage } from './pages/ProductsPage';
import { StockPage } from './pages/StockPage';
import { ProductionPage } from './pages/ProductionPage';
import { Layout } from './components/Layout';
import { Toaster } from 'react-hot-toast';

type PageId = 'dashboard' | 'customers' | 'products' | 'stock' | 'production';

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
        {currentPage === 'dashboard' && <DashboardPage />}
        {currentPage === 'customers' && <CustomersPage />}
        {currentPage === 'products' && <ProductsPage />}
        {currentPage === 'stock' && <StockPage />}
        {currentPage === 'production' && <ProductionPage />}
      </Layout>
      <Toaster position="top-right" />
    </>
  );
}

export default App;
