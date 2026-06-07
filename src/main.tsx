import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CustomerProvider } from './context/CustomerContext'
import { ProductProvider } from './context/ProductContext'
import { StockProvider } from './context/StockContext'
import { ProductionProvider } from './context/ProductionContext'
import { SalesProvider } from './context/SalesContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <CustomerProvider>
        <ProductProvider>
          <StockProvider>
            <ProductionProvider>
              <SalesProvider>
                <App />
              </SalesProvider>
            </ProductionProvider>
          </StockProvider>
        </ProductProvider>
      </CustomerProvider>
    </AuthProvider>
  </React.StrictMode>,
)
