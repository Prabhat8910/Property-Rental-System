import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';

// Pages
import HomePage from './pages/HomePage';
import PropertyDetailPage from './pages/PropertyDetailPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import TenantDashboard from './pages/tenant/TenantDashboard';
import TenantBookings from './pages/tenant/TenantBookings';
import TenantPayments from './pages/tenant/TenantPayments';
import TenantMaintenance from './pages/tenant/TenantMaintenance';
import OwnerDashboard from './pages/owner/OwnerDashboard';
import OwnerProperties from './pages/owner/OwnerProperties';
import OwnerBookings from './pages/owner/OwnerBookings';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminProperties from './pages/admin/AdminProperties';
import NotFoundPage from './pages/NotFoundPage';

const ProtectedRoute = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
};

const PublicRoute = ({ children }) => {
  const { user } = useAuth();
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin" replace />;
    if (user.role === 'owner') return <Navigate to="/owner" replace />;
    return <Navigate to="/tenant" replace />;
  }
  return children;
};

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/properties/:id" element={<PropertyDetailPage />} />
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

            {/* Tenant */}
            <Route path="/tenant" element={<ProtectedRoute roles={['tenant']}><TenantDashboard /></ProtectedRoute>} />
            <Route path="/tenant/bookings" element={<ProtectedRoute roles={['tenant']}><TenantBookings /></ProtectedRoute>} />
            <Route path="/tenant/payments" element={<ProtectedRoute roles={['tenant']}><TenantPayments /></ProtectedRoute>} />
            <Route path="/tenant/maintenance" element={<ProtectedRoute roles={['tenant']}><TenantMaintenance /></ProtectedRoute>} />

            {/* Owner */}
            <Route path="/owner" element={<ProtectedRoute roles={['owner']}><OwnerDashboard /></ProtectedRoute>} />
            <Route path="/owner/properties" element={<ProtectedRoute roles={['owner']}><OwnerProperties /></ProtectedRoute>} />
            <Route path="/owner/bookings" element={<ProtectedRoute roles={['owner']}><OwnerBookings /></ProtectedRoute>} />

            {/* Admin */}
            <Route path="/admin" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/properties" element={<ProtectedRoute roles={['admin']}><AdminProperties /></ProtectedRoute>} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
}
