import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import LoginPage from './components/LoginPage.tsx'
import { AuthProvider } from './contexts/AuthContext.tsx'
import { ThemeProvider } from './contexts/ThemeContext.tsx'
import ProtectedRoute from './components/ProtectedRoute.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <App />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </AuthProvider>
      </Router>
    </ThemeProvider>
  </StrictMode>,
)

