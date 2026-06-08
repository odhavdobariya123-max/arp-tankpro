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
import { PaymentProvider } from './context/PaymentContext'
import { CompanyProvider } from './context/CompanyContext'
import { DealerSchemeProvider } from './context/DealerSchemeContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <CompanyProvider>
        <CustomerProvider>
          <ProductProvider>
            <StockProvider>
              <ProductionProvider>
                <SalesProvider>
                  <PaymentProvider>
                    <DealerSchemeProvider>
                      <App />
                    </DealerSchemeProvider>
                  </PaymentProvider>
                </SalesProvider>
              </ProductionProvider>
            </StockProvider>
          </ProductProvider>
        </CustomerProvider>
      </CompanyProvider>
    </AuthProvider>
  </React.StrictMode>,
)
