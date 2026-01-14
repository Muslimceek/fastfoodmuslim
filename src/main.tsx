import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { CartProvider } from './core/context/CartContext'
import { AuthProvider } from './core/context/AuthContext'
import { SettingsProvider } from './core/context/SettingsContext'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <SettingsProvider>
        <CartProvider>
          <App />
        </CartProvider>
      </SettingsProvider>
    </AuthProvider>
  </StrictMode>,
)
