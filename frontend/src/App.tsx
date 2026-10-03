
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { AppLayout } from './components/AppLayout';
import { RequireAuth } from './components/RequireAuth';
import { Activity } from './pages/Activity';
import { Dashboard } from './pages/Dashboard';
import { Distribute } from './pages/Distribute';
import { Login } from './pages/Login';
import { ReviewShare } from './pages/ReviewShare';
import { SecureViewer } from './pages/SecureViewer';
import { VerifyTrace } from './pages/VerifyTrace';

export function App() {
  return (
    <MotionConfig reducedMotion="user">
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
              <RequireAuth>
                  <AppLayout />
                </RequireAuth>
              }>
              
              <Route index element={<Dashboard />} />
              <Route path="/distribute" element={<Distribute />} />
              <Route path="/review/:photoId" element={<ReviewShare />} />
              <Route path="/viewer/:photoId" element={<SecureViewer />} />
              <Route path="/verify" element={<VerifyTrace />} />
              <Route path="/activity" element={<Activity />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#FFFDF9',
              border: '1px solid #E6DACB',
              color: '#2E211A',
              borderRadius: '14px',
              fontFamily: 'Nunito, sans-serif',
              fontWeight: 700
            }
          }} />
        
      </BrowserRouter>
    </MotionConfig>);

}