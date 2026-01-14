import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CustomerApp from './pages/CustomerApp';
import KitchenDisplay from './modules/kitchen/pages/KitchenDisplay';
import MobileAdminDashboard from './modules/admin/pages/MobileAdminDashboard';
import Login from './modules/auth/pages/AuthPage';
import { useAuth } from './core/context/AuthContext';
import './index.css';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { user, role, loading } = useAuth();

  if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-white text-2xl animate-pulse italic font-black">SYNCING...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role || '')) {
    if (role === 'admin' || role === 'manager') return <Navigate to="/admin" replace />;
    if (role === 'kitchen') return <Navigate to="/kitchen" replace />;
    if (role === 'customer') return <Navigate to="/customer" replace />;
    return <Navigate to="/customer" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        {/* Public Customer App */}
        <Route path="/customer/*" element={<CustomerApp />} />

        {/* Auth Portal */}
        <Route path="/login" element={<Login />} />

        {/* Protected Kitchen Display */}
        <Route path="/kitchen" element={
          <ProtectedRoute allowedRoles={['kitchen', 'admin']}>
            <KitchenDisplay />
          </ProtectedRoute>
        } />

        {/* Protected Admin Dashboard - Mobile First */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin', 'manager']}>
            <MobileAdminDashboard />
          </ProtectedRoute>
        } />

        {/* Default Redirect to Customer App */}
        <Route path="*" element={<Navigate to="/customer" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
