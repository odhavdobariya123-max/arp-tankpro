import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CustomerProvider } from './context/CustomerContext'
import { ProductProvider } from './context/ProductContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <CustomerProvider>
        <ProductProvider>
          <App />
        </ProductProvider>
      </CustomerProvider>
    </AuthProvider>
  </React.StrictMode>,
)
